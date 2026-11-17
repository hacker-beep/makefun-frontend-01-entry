# makefun-frontend-01-entry

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/hacker-beep/makefun-frontend-01-entry/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/hacker-beep/makefun-frontend-01-entry/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

Live board beside every bounty · virtual leaderboard · ETag cache · 1–2 API requests a view.

v9 shares one competitions snapshot across the cover, bounty overview, standings and builder profiles. Rewards, fee splits, rules and activity timestamps come from that snapshot; standings are the second cold-view request. Profile views use a profile request and the same board cache. Warm navigation usually needs zero requests; returning to the board performs one conditional revalidation. Unlisted competitions can require a standalone summary lookup.

The cover reports requests for the current view, alongside session totals for unchanged ETags and memory hits. Verified in a real Chromium session: board (2 requests) → bounty (0) → board (1), with 1 unchanged ETag and 7 memory hits. HTTP `cache: 'no-cache'` keeps browser-managed cross-origin validators; explicit `If-None-Match` and 304 handling remain available on same-origin endpoints. No polling or forced retry loop.

The split layout preserves the rewards table, date rail and current Top 5, a windowed leaderboard with score intervals, W–D–L, projected prizes and an entrant inspector, plus profile placements, prize per entry and build history. Competition slugs and phase labels distinguish repeated titles.

## Run it

```sh
node serve.ts
```

(serves the app on http://localhost:8080)

---

<sub>Entered on [make.fun](https://make.fun/?ref=ary68zht&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
