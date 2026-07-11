// ESPN unofficial soccer API client. Uses global fetch (Node 18+).
// All ESPN base URLs live here so they are never shipped to the browser.

import { getLeague } from './config.js';

const SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues';

// --- tiny in-memory TTL cache -------------------------------------------------

const cache = new Map(); // key -> { expires, value }
const TTL_MS = 10 * 60 * 1000;

async function cached(key, producer) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await producer();
  cache.set(key, { expires: Date.now() + TTL_MS, value });
  return value;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`ESPN request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

// --- teams -------------------------------------------------------------------

export async function getTeams(leagueSlug) {
  const { slug } = getLeague(leagueSlug);
  return cached(`teams:${slug}`, async () => {
    const data = await fetchJson(`${SITE_BASE}/${slug}/teams`);
    const teams = data?.sports?.[0]?.leagues?.[0]?.teams ?? [];
    return teams
      .map(({ team }) => ({
        id: team.id,
        displayName: team.displayName,
        abbreviation: team.abbreviation,
        logo: team.logos?.[0]?.href ?? null,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });
}

// --- season detection --------------------------------------------------------

export async function getSeasonYear(leagueSlug) {
  const { slug } = getLeague(leagueSlug);
  return cached(`season:${slug}`, async () => {
    try {
      const data = await fetchJson(`${CORE_BASE}/${slug}/season`);
      if (data?.year) return data.year;
    } catch {
      // fall through to heuristic
    }
    // Heuristic: European seasons start in August. Before August, the current
    // season started last calendar year.
    const now = new Date();
    return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  });
}

// --- normalization -----------------------------------------------------------

// Derive home/away team names from an ESPN "name" field like
// "Arsenal at Crystal Palace" (away at home).
function teamsFromName(name) {
  const m = /^(.*)\s+at\s+(.*)$/.exec(name || '');
  if (!m) return null;
  return { away: m[1].trim(), home: m[2].trim() };
}

// Resolve a team id from a competitor across both the site and core API shapes.
function competitorTeamId(c) {
  if (c?.team?.id) return String(c.team.id);
  const ref = c?.team?.$ref;
  const m = ref && /\/teams\/(\d+)/.exec(ref);
  if (m) return m[1];
  return c?.id ? String(c.id) : null;
}

// Prefer an explicit logo href; otherwise fall back to ESPN's stable logo URL
// pattern, which works even for opponents outside the current league.
function competitorLogo(c) {
  const href = c?.team?.logos?.[0]?.href ?? c?.team?.logo ?? null;
  if (href) return href;
  const id = competitorTeamId(c);
  return id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` : null;
}

function normalizeEvent(event, leagueName) {
  const comp = event.competitions?.[0] ?? {};
  const competitors = comp.competitors ?? [];

  const homeC = competitors.find((c) => c.homeAway === 'home');
  const awayC = competitors.find((c) => c.homeAway === 'away');
  const fromName = teamsFromName(event.name);

  const homeTeam = homeC?.team?.displayName ?? fromName?.home ?? null;
  const awayTeam = awayC?.team?.displayName ?? fromName?.away ?? null;

  const venue = comp.venue ?? {};
  const state = comp.status?.type?.state ?? event.status?.type?.state ?? null;
  const broadcast = comp.broadcasts?.[0]?.media?.shortName ?? null;

  const summary = homeTeam && awayTeam
    ? `${homeTeam} vs ${awayTeam} (${leagueName})`
    : `${event.name} (${leagueName})`;

  return {
    id: String(event.id),
    dateISO: event.date,
    summary,
    homeTeam,
    awayTeam,
    homeLogo: homeC ? competitorLogo(homeC) : null,
    awayLogo: awayC ? competitorLogo(awayC) : null,
    venueName: venue.fullName ?? null,
    city: venue.address?.city ?? null,
    country: venue.address?.country ?? null,
    broadcast,
    competition: leagueName,
    state,
  };
}

function withOpponent(fixture, teamId, teams) {
  // Determine the opponent name relative to the selected team.
  const self = teams.get(String(teamId));
  const selfName = self?.displayName;
  let opponent = null;
  if (selfName) {
    if (fixture.homeTeam && fixture.homeTeam !== selfName) opponent = fixture.homeTeam;
    else if (fixture.awayTeam && fixture.awayTeam !== selfName) opponent = fixture.awayTeam;
  }
  return { ...fixture, opponent };
}

// --- schedule (primary + fallback) -------------------------------------------

async function getSchedule(leagueSlug, teamId, year) {
  const { slug } = getLeague(leagueSlug);
  const data = await fetchJson(
    `${SITE_BASE}/${slug}/teams/${teamId}/schedule?season=${year}`
  );
  const leagueName = getLeague(leagueSlug).name;
  return (data?.events ?? []).map((e) => normalizeEvent(e, leagueName));
}

async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    results.push(...(await Promise.all(chunk.map(fn))));
  }
  return results;
}

async function getScheduleFallback(leagueSlug, teamId, year) {
  const { slug, name } = getLeague(leagueSlug);
  const list = await fetchJson(
    `${CORE_BASE}/${slug}/seasons/${year}/teams/${teamId}/events?limit=50`
  );
  const refs = (list?.items ?? []).map((i) => i.$ref).filter(Boolean);
  const events = await mapWithConcurrency(refs, 5, async (ref) => {
    try {
      // Force https; ESPN sometimes returns http refs.
      const event = await fetchJson(ref.replace(/^http:/, 'https:'));
      return normalizeEvent(event, name);
    } catch {
      return null;
    }
  });
  return events.filter(Boolean);
}

// --- orchestrator ------------------------------------------------------------

export async function getFutureFixtures(teamId, leagueSlug) {
  const { slug } = getLeague(leagueSlug);
  return cached(`fixtures:${slug}:${teamId}`, async () => {
    const year = await getSeasonYear(slug);

    let fixtures = await getSchedule(slug, teamId, year);
    if (fixtures.length === 0) {
      fixtures = await getScheduleFallback(slug, teamId, year);
    }

    const now = Date.now();
    const teams = new Map((await getTeams(slug)).map((t) => [t.id, t]));

    return fixtures
      .filter((f) => f.dateISO)
      .filter((f) => f.state === 'pre' || new Date(f.dateISO).getTime() >= now)
      .map((f) => withOpponent(f, teamId, teams))
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  });
}
