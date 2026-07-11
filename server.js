import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTeams, getFutureFixtures } from './src/espn.js';
import { buildCalendar } from './src/ics.js';
import { DEFAULT_LEAGUE, getLeague } from './src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

function safeFilename(str) {
  return String(str).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function teamName(teamId, league) {
  const teams = await getTeams(league);
  return teams.find((t) => t.id === String(teamId))?.displayName || `team-${teamId}`;
}

// --- JSON API ----------------------------------------------------------------

app.get('/api/teams', async (req, res) => {
  try {
    res.json(await getTeams(req.query.league || DEFAULT_LEAGUE));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/fixtures', async (req, res) => {
  const { team, league = DEFAULT_LEAGUE } = req.query;
  if (!team) return res.status(400).json({ error: 'Missing "team" query parameter.' });
  try {
    res.json(await getFutureFixtures(team, league));
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// --- ICS: download all -------------------------------------------------------

app.get('/api/ics', async (req, res) => {
  const { team, league = DEFAULT_LEAGUE } = req.query;
  if (!team) return res.status(400).json({ error: 'Missing "team" query parameter.' });
  try {
    const name = await teamName(team, league);
    const fixtures = await getFutureFixtures(team, league);
    const ics = buildCalendar(fixtures, `${name} Fixtures`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename(name)}-fixtures.ics"`
    );
    res.send(ics);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// --- ICS: download a single fixture ------------------------------------------

app.get('/api/ics/event', async (req, res) => {
  const { team, event, league = DEFAULT_LEAGUE } = req.query;
  if (!team || !event) {
    return res.status(400).json({ error: 'Missing "team" or "event" query parameter.' });
  }
  try {
    const fixtures = await getFutureFixtures(team, league);
    const fixture = fixtures.find((f) => f.id === String(event));
    if (!fixture) return res.status(404).json({ error: 'Fixture not found.' });
    const ics = buildCalendar([fixture]);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename(fixture.summary)}.ics"`
    );
    res.send(ics);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// --- ICS: live subscription feed (inline, cacheable) -------------------------

app.get('/calendar/:teamId.ics', async (req, res) => {
  const { teamId } = req.params;
  const league = req.query.league || DEFAULT_LEAGUE;
  try {
    const name = await teamName(teamId, league);
    const fixtures = await getFutureFixtures(teamId, league);
    const ics = buildCalendar(fixtures, `${name} Fixtures`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=21600'); // 6h
    res.send(ics);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  const { name } = getLeague(DEFAULT_LEAGUE);
  console.log(`FootyIcs (${name}) running at http://localhost:${PORT}`);
});
