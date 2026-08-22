# Browser Run Preview Astro

Astro demo for Cloudflare Workers Previews. Pull requests deploy an isolated Worker Preview, call Cloudflare Browser Run to capture a screenshot, and update a sticky PR comment with both the Preview URL and screenshot.

## Local Commands

- `npm run dev` starts Astro locally.
- `npm run build` builds static assets into `dist/`.
- `npm run deploy` builds and deploys production with `wrangler deploy`.
- `npm run cf:preview` builds and deploys a Worker Preview with `wrangler preview --json`.

## GitHub Secrets

Set these repository secrets before opening PRs:

- `CLOUDFLARE_API_TOKEN`: token with Workers Scripts Edit and Browser Rendering Edit permissions.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID used by Browser Run's screenshot API.
- `CF_ACCESS_CLIENT_ID`: Cloudflare Access service-token client ID for protected Preview URLs.
- `CF_ACCESS_CLIENT_SECRET`: Cloudflare Access service-token client secret for protected Preview URLs.

## Preview Flow

1. `wrangler preview --name pr-<number>` deploys the branch to an isolated Preview.
2. Browser Run calls `/browser-rendering/screenshot` against the Preview URL.
3. The workflow pushes the screenshot to a per-PR `preview-artifacts-pr-<number>` branch.
4. `actions/github-script` creates or updates a sticky PR comment with the Preview URL and embedded screenshot.

When the PR closes, the workflow deletes the Worker Preview and screenshot artifact branch.
