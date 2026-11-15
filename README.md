# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/ragilwidiyanto4646/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/ragilwidiyanto4646/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, lightweight read-only frontend for make.fun: the live bounty board, a bounty's page with its rewards and live pot, its leaderboard, and an account's public profile — as static files with no build step, no framework and no images. First load is 6 files, 8,781 bytes gzip.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
cd out/app && python3 -m http.server 8080
```

Then open http://localhost:8080 in a desktop browser. `main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library. Any static file server works; `app/index.html` is the entry point.

## Routes

- `#/` — the board: live bounties with each one's reward (live pot), entry fee, time left and entries; filterable, paged 12 at a time
- `#/bounty/<slug>` — one bounty: summary, live pot, entry fee, deadline, status (by deadline, not status alone), rewards table with the live split, description
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard, paged 50 at a time
- `#/profile/<handle>` — an account's public profile: record, wallet, entries

## How it stays fast

- Vanilla ES modules and one small stylesheet; system fonts; no images, no framework. First load: 6 files, 8,781 bytes gzip-9 (23,429 raw).
- API answers are cached in memory and revalidated with `ETag` / `If-None-Match`, so a second visit to a view inside the same minute costs a 304, not a body.
- One API request per view; the board keeps its loaded bounties across views, so going back costs no second request. Long lists are paged (board 12, leaderboard 50) instead of rendered whole.
- Read-only: GET requests to `https://make.fun/api` alone, no sign-in, nothing written. No script, stylesheet, module or font comes from any other origin. Avatar images load only from URLs the API's own answers point at.

## Accessibility

Skip link, semantic landmarks and headings, `aria-live` announcements on route changes, focus moved to the content on navigation, visible focus outlines, and a single-column layout under 720 px.

## Screenshots

`screenshots/` holds 3 JPEGs of the running app on live make.fun data (1280×800): the board, the `makefun-frontend-01` bounty page, and the `threejs-fps-02` leaderboard.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ztnjpsw2&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
