// League configuration, kept as an extensible map so more leagues can be
// added later without touching callers. `top: true` marks the handful of
// leagues that should be pinned to the top of the league picker; every
// other entry is a men's top-flight domestic league available via ESPN's
// soccer API.

export const LEAGUES = {
  // --- top leagues (pinned) ---------------------------------------------
  'eng.1': { slug: 'eng.1', name: 'Premier League', top: true },
  'ita.1': { slug: 'ita.1', name: 'Serie A', top: true },
  'fra.1': { slug: 'fra.1', name: 'Ligue 1', top: true },
  'esp.1': { slug: 'esp.1', name: 'La Liga', top: true },
  'ger.1': { slug: 'ger.1', name: 'Bundesliga', top: true },

  // --- all other leagues --------------------------------------------------
  'arg.1': { slug: 'arg.1', name: 'Argentine Primera División' },
  'aus.1': { slug: 'aus.1', name: 'A-League Men' },
  'aut.1': { slug: 'aut.1', name: 'Austrian Bundesliga' },
  'bel.1': { slug: 'bel.1', name: 'Belgian Pro League' },
  'bol.1': { slug: 'bol.1', name: 'Bolivian Primera División' },
  'bra.1': { slug: 'bra.1', name: 'Brasileirão Série A' },
  'chi.1': { slug: 'chi.1', name: 'Chilean Primera División' },
  'chn.1': { slug: 'chn.1', name: 'Chinese Super League' },
  'col.1': { slug: 'col.1', name: 'Categoría Primera A' },
  'crc.1': { slug: 'crc.1', name: 'Costa Rican Primera División' },
  'den.1': { slug: 'den.1', name: 'Danish Superliga' },
  'ecu.1': { slug: 'ecu.1', name: 'Ecuadorian Serie A' },
  'gre.1': { slug: 'gre.1', name: 'Greek Super League' },
  'gua.1': { slug: 'gua.1', name: 'Liga Nacional de Guatemala' },
  'hon.1': { slug: 'hon.1', name: 'Honduran Primera División' },
  'ind.1': { slug: 'ind.1', name: 'Indian Super League' },
  'jpn.1': { slug: 'jpn.1', name: 'J1 League' },
  'ksa.1': { slug: 'ksa.1', name: 'Saudi Pro League' },
  'mex.1': { slug: 'mex.1', name: 'Liga MX' },
  'ned.1': { slug: 'ned.1', name: 'Eredivisie' },
  'nor.1': { slug: 'nor.1', name: 'Eliteserien' },
  'par.1': { slug: 'par.1', name: 'Paraguayan Primera División' },
  'per.1': { slug: 'per.1', name: 'Peruvian Primera División' },
  'por.1': { slug: 'por.1', name: 'Primeira Liga' },
  'rsa.1': { slug: 'rsa.1', name: 'South African Premier Division' },
  'rus.1': { slug: 'rus.1', name: 'Russian Premier League' },
  'sco.1': { slug: 'sco.1', name: 'Scottish Premiership' },
  'slv.1': { slug: 'slv.1', name: 'Salvadoran Primera División' },
  'swe.1': { slug: 'swe.1', name: 'Allsvenskan' },
  'tur.1': { slug: 'tur.1', name: 'Süper Lig' },
  'uru.1': { slug: 'uru.1', name: 'Uruguayan Primera División' },
  'usa.1': { slug: 'usa.1', name: 'MLS' },
  'ven.1': { slug: 'ven.1', name: 'Venezuelan Primera División' },
};

// The active/default league for the app.
export const DEFAULT_LEAGUE = 'eng.1';

export function getLeague(slug = DEFAULT_LEAGUE) {
  return LEAGUES[slug] || LEAGUES[DEFAULT_LEAGUE];
}

// Leagues in display order: pinned "top" leagues first (in insertion
// order), then the rest alphabetically by name.
export function getLeagueList() {
  const all = Object.values(LEAGUES);
  const top = all.filter((l) => l.top);
  const rest = all.filter((l) => !l.top).sort((a, b) => a.name.localeCompare(b.name));
  return { top, rest };
}
