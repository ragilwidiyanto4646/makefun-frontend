[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/ragilwidiyanto4646/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/ragilwidiyanto4646/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A small, read-only window onto current make.fun competitions. It is built from browser-native JavaScript modules and uses the public API directly.

## Run it

Package the application and its evidence files into `out`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Serve `out/app` with any local HTTP server, then open its address in a browser. ES modules need HTTP; opening the file directly is not supported.

## What is here

- `#/` lists competitions, supports filtering and pagination, and offers a profile lookup.
- `#/bounty/<slug>` shows the live pot, rules, rewards and description.
- `#/bounty/<slug>/leaderboard` displays ranked entries.
- `#/profile/<handle>` presents wallet and competition history.

The client uses plain ES modules with no build dependency. GET responses are revalidated with ETags, each view needs one request, and board data stays cached while navigating. The interface includes a skip link, live announcements, focus movement for navigation, visible keyboard focus, and a single-column layout on narrow screens.

Three 1280×800 screenshots accompany the package: the board, this bounty, and a leaderboard view.

## Technical notes

The browser requests data only from `https://make.fun/api`. User-controlled text is escaped before it is rendered, and external wallet/image links are restricted to HTTPS. The packaging entry point clears its generated destinations first so repeated runs produce the same bundle.

<sub>Entered on [make.fun](https://make.fun/?ref=ztnjpsw2&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
