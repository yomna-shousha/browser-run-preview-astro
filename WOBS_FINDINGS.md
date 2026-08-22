# WOBS Findings: Browser Run Passed, Runtime Probe Failed

## Summary

The Preview renders and Browser Run captures a screenshot, but the Worker runtime has a hidden background failure during the same flow.

This is the useful gap for the demo:

- Browser Run shows what the user saw.
- WOBS shows what the Worker did while the browser exercised the Preview.

## Observed Behavior

Preview branch: `feat/wobs-preview-feedback-loop`

The page visibly reports a session refresh problem, and the workflow's runtime probe confirms it.

From PR #2's generated Preview comment:

| Signal | Value |
| --- | --- |
| Preview | `pr-2` |
| Health probe | `200` |
| Session refresh probe | `500` |
| Debug ID | `pr-2-32585097709-1` |
| Failing request ID | `b2d53e12-c84a-4aba-8d02-aadd5b223571` |
| WOBS path | `/workers/services/view/browser-run-preview-astro/production/previews/pr-2/observability/events` |

## WOBS Evidence To Inspect

Open the Preview's WOBS events view and search by the debug ID or failing request ID.

Expected event shape:

```json
{
  "event": "session_refresh_failed",
  "path": "/api/session/refresh",
  "method": "GET",
  "environment": "preview",
  "reason": "known-demo-regression",
  "userVisible": false
}
```

The important point is that the screenshot alone is not the whole truth. The browser can load the Preview while a background Worker request fails. WOBS provides the request ID, event name, and Preview context needed for an agent to diagnose it.

## Root Cause

`src/worker.js` intentionally returns `500` from `/api/session/refresh`:

```js
return json({ ok: false, requestId, debugId, error: "session refresh failed" }, 500);
```

The next branch should make the session refresh healthy and preserve structured runtime logs for WOBS.

## Expected Fix Criteria

- `/api/session/refresh` returns `200`.
- The structured log event changes from `session_refresh_failed` to `session_refresh_succeeded`.
- The Preview PR comment reports `Session refresh probe` as `200`.
- Browser Run still captures the Preview screenshot.
