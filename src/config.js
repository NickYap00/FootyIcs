// League configuration. Currently Premier League only, but kept as an
// extensible map so more leagues can be added later without touching callers.

export const LEAGUES = {
  'eng.1': { slug: 'eng.1', name: 'Premier League' },
};

// The active/default league for the app.
export const DEFAULT_LEAGUE = 'eng.1';

export function getLeague(slug = DEFAULT_LEAGUE) {
  return LEAGUES[slug] || LEAGUES[DEFAULT_LEAGUE];
}
