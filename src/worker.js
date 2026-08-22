export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const debugId = request.headers.get("x-debug-id") || url.searchParams.get("debugId") || requestId;

    if (url.pathname === "/api/health") {
      const payload = baseEvent("preview_health", request, env, requestId, debugId);
      console.log(payload);
      return json({ ok: true, requestId, debugId, environment: env.APP_ENV ?? "unknown" });
    }

    if (url.pathname === "/api/session/refresh") {
      const payload = {
        ...baseEvent("session_refresh_failed", request, env, requestId, debugId),
        reason: "known-demo-regression",
        userVisible: false,
        clue: "Browser Run screenshot can still be green while WOBS records this Preview-only runtime error.",
      };
      console.error(payload);
      return json({ ok: false, requestId, debugId, error: "session refresh failed" }, 500);
    }

    if (url.pathname === "/api/checkout") {
      const payload = {
        ...baseEvent("checkout_rendered", request, env, requestId, debugId),
        taxRegion: "us-default",
        previewDecision: "fallback",
      };
      console.log(payload);
      return json({ ok: true, requestId, debugId, total: 42, tax: 3.15, region: "us-default" });
    }

    return env.ASSETS.fetch(request);
  },
};

function baseEvent(event, request, env, requestId, debugId) {
  const url = new URL(request.url);
  return {
    event,
    requestId,
    debugId,
    path: url.pathname,
    method: request.method,
    environment: env.APP_ENV ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
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
