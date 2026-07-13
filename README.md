# ⚽ FootyIcs

Never miss another game. FootyIcs turns a football team's upcoming fixtures into
`.ics` calendar files you can download or subscribe to, powered by ESPN's public
soccer data.

Pick a league, pick a team, and get every upcoming match in your calendar at
once — complete with kickoff times, venues, opponents, and TV broadcast info.

## Features

- **40+ leagues** — Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and
  dozens more top-flight domestic leagues worldwide.
- **Download all fixtures** as a single `.ics` file.
- **Download a single fixture** with the "Add" button next to any match.
- **Live subscription feed** — subscribe once via `webcal:` and let your calendar
  refresh automatically as new fixtures are published (cached for 6 hours).
- **Standards-compliant iCalendar** output following RFC 5545 (proper line
  folding, text escaping, and UTC timestamps).
- **In-memory caching** of ESPN responses (10-minute TTL) to stay fast and
  courteous to the upstream API.

## Requirements

- Node.js **18 or newer** (uses the built-in global `fetch`).

## Getting started

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

Set a custom port with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## How it works

1. The frontend (`public/`) lets you choose a league and team.
2. The Express server (`server.js`) calls ESPN's unofficial soccer API via the
   client in `src/espn.js`, normalizes the fixture data, and filters to upcoming
   matches only.
3. `src/ics.js` builds RFC 5545 iCalendar output from those fixtures.
4. You download the file or subscribe to the live feed.

ESPN base URLs live server-side only and are never shipped to the browser.

## API

| Method & path | Description |
| --- | --- |
| `GET /api/leagues` | List available leagues, grouped into `top` and `rest`. |
| `GET /api/teams?league=<slug>` | List teams for a league (defaults to `eng.1`). |
| `GET /api/fixtures?team=<id>&league=<slug>` | Upcoming fixtures for a team as JSON. |
| `GET /api/ics?team=<id>&league=<slug>` | Download all upcoming fixtures as `.ics`. |
| `GET /api/ics/event?team=<id>&event=<id>&league=<slug>` | Download a single fixture as `.ics`. |
| `GET /calendar/:teamId.ics?league=<slug>` | Live subscription feed (cacheable, inline). |

`league` defaults to the Premier League (`eng.1`) when omitted.

## Subscribing in a calendar app

Use the **Subscribe in calendar** button, or copy the subscribe URL and add it
manually. The feed URL follows the pattern:

```
webcal://<host>/calendar/<teamId>.ics?league=<slug>
```

Because it's a live feed, your calendar app will periodically re-fetch it and
pick up newly scheduled matches automatically.

## Project structure

```
server.js          Express app, routes, and .ics download handlers
src/config.js      League registry and display ordering
src/espn.js        ESPN API client, normalization, and caching
src/ics.js         RFC 5545 iCalendar builder (pure functions)
public/            Static frontend (HTML, CSS, JS)
```

## Notes

FootyIcs relies on ESPN's unofficial, undocumented soccer API, which may change
without notice. Fixture availability depends on ESPN having published a team's
schedule for the current season.
```
