export class PreviewSession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const debugId = request.headers.get("x-debug-id") || url.searchParams.get("debugId") || requestId;
    const previewName = previewFromDebugId(debugId);
    const seeded = await seedCounter(this.state.storage, previewName);
    let count = (await this.state.storage.get("counter")) ?? seeded.counter;

    if (url.pathname.endsWith("/increment")) {
      count += 1;
      await this.state.storage.put("counter", count);
    }

    const payload = {
      event: url.pathname.endsWith("/increment") ? "do_counter_incremented" : "do_counter_read",
      requestId,
      debugId,
      previewName,
      worker: this.env.WORKER_LABEL ?? "my-worker",
      durableObject: "PreviewSession",
      counterId: seeded.counterId,
      counter: count,
      seededValue: seeded.counter,
    };
    console.log(payload);

    return json({
      ok: true,
      requestId,
      debugId,
      previewName,
      durableObject: "PreviewSession",
      counterId: seeded.counterId,
      counter: count,
      seededValue: seeded.counter,
      region: seeded.region,
      lastEvent: payload.event,
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const debugId = request.headers.get("x-debug-id") || url.searchParams.get("debugId") || requestId;

    if (url.pathname.startsWith("/api/staging/counter")) {
      const previewName = previewFromDebugId(debugId);
      const id = env.SESSION_DO.idFromName(`astro-counter:${previewName}`);
      const stub = env.SESSION_DO.get(id);
      console.log({
        ...baseEvent("do_request_forwarded", request, env, requestId, debugId),
        durableObject: "PreviewSession",
        objectName: `astro-counter:${previewName}`,
      });
      return stub.fetch(request);
    }

    if (url.pathname === "/api/health") {
      const payload = baseEvent("preview_health", request, env, requestId, debugId);
      console.log(payload);
      return json({ ok: true, requestId, debugId, worker: env.WORKER_LABEL ?? "my-worker", environment: env.APP_ENV ?? "unknown" });
    }

    if (url.pathname === "/api/session/refresh") {
      const payload = {
        ...baseEvent("session_refresh_succeeded", request, env, requestId, debugId),
        userVisible: false,
        clue: "Browser Run screenshot and WOBS runtime probe agree on the same Preview request.",
      };
      console.log(payload);
      return json({ ok: true, requestId, debugId, refreshed: true });
    }

    if (url.pathname === "/api/astro/feed") {
      const payload = {
        ...baseEvent("astro_catalog_loaded", request, env, requestId, debugId),
        route: "/",
        framework: "astro",
        items: 4,
        stale: false,
      };
      console.log(payload);
      return json({ ok: true, requestId, debugId, framework: "Astro", items: 4, cacheStatus: "preview-seed" });
    }

    if (url.pathname === "/api/cache/warm") {
      const payload = {
        ...baseEvent("edge_cache_warmed", request, env, requestId, debugId),
        cacheKey: "astro:staging:home",
        colo: request.cf?.colo ?? "unknown",
        ttl: 120,
      };
      console.log(payload);
      return json({ ok: true, requestId, debugId, cacheKey: payload.cacheKey, ttl: payload.ttl });
    }

    if (url.pathname === "/api/observability/trace") {
      const steps = ["router", "astro-render", "do-read", "wobs-index"];
      for (const [index, step] of steps.entries()) {
        console.log({
          ...baseEvent("preview_trace_step", request, env, requestId, debugId),
          step,
          spanIndex: index + 1,
          durationMs: 12 + index * 7,
        });
      }
      ctx.waitUntil(logBackgroundEvent(request, env, requestId, debugId));
      return json({ ok: true, requestId, debugId, spans: steps.length, trace: "preview-smoke" });
    }

    if (url.pathname === "/api/observability/burst") {
      const events = [
        "preview_opened",
        "browser_run_loaded",
        "astro_island_checked",
        "do_counter_read",
        "do_counter_incremented",
        "session_refresh_succeeded",
        "wobs_correlation_ready",
      ];
      for (const [index, event] of events.entries()) {
        console.log({
          ...baseEvent(event, request, env, requestId, debugId),
          sequence: index + 1,
          previewName: previewFromDebugId(debugId),
        });
      }
      return json({ ok: true, requestId, debugId, emitted: events.length });
    }

    return env.ASSETS.fetch(request);
  },
};

async function seedCounter(storage, previewName) {
  const existing = await storage.get("seed");
  if (existing) {
    return existing;
  }

  const seed = {
    previewName,
    counterId: `counter_${previewName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_astro`,
    counter: 42,
    region: "WNAM",
  };
  await storage.put("seed", seed);
  await storage.put("counter", seed.counter);
  return seed;
}

async function logBackgroundEvent(request, env, requestId, debugId) {
  console.log({
    ...baseEvent("wait_until_observability_flush", request, env, requestId, debugId),
    flushed: true,
  });
}

function baseEvent(event, request, env, requestId, debugId) {
  const url = new URL(request.url);
  return {
    event,
    requestId,
    debugId,
    path: url.pathname,
    method: request.method,
    worker: env.WORKER_LABEL ?? "my-worker",
    previewName: previewFromDebugId(debugId),
    environment: env.APP_ENV ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
}

function previewFromDebugId(debugId) {
  return debugId.match(/pr-\d+/)?.[0] ?? "local";
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
