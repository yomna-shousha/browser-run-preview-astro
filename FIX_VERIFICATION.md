# Fix Verification: Session Refresh Runtime Probe

This branch applies the repair described in `WOBS_FINDINGS.md`.

## Change

- `/api/session/refresh` now returns `200`.
- The structured event changed from `session_refresh_failed` to `session_refresh_succeeded`.
- The page banner now says the runtime probe is clean.

## Expected PR Comment

The Worker Preview comment should show:

| Signal | Expected |
| --- | --- |
| Browser Run screenshot | Present |
| Health probe | `200` |
| Session refresh probe | `200` |
| Runtime signal | `Runtime probe clean` |

## WOBS Check

Open the WOBS path from the generated PR comment and search by the debug ID. The relevant event should be:

```json
{
  "event": "session_refresh_succeeded",
  "path": "/api/session/refresh",
  "environment": "preview"
}
```
