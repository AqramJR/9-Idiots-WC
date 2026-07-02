/**
 * Maps a team/country name to a real flag IMAGE url (flagcdn.com — free,
 * no API key, no reliance on the OS's emoji font). This is used instead of
 * emoji flags because many systems (notably Windows) don't render colored
 * flag emoji at all — they just show the two-letter code as plain text.
 *
 * England/Scotland/Wales/N. Ireland use flagcdn's UK constituent-country
 * codes (gb-eng, gb-sct, gb-wls, gb-nir) since they aren't ISO countries.
 */
const COUNTRY_CODES: Record<string, string> = {
  mexico: 'mx',
  'south africa': 'za',
  'south korea': 'kr',
  'korea republic': 'kr',
  'czech republic': 'cz',
  czechia: 'cz',
  canada: 'ca',
  'bosnia & herzegovina': 'ba',
  'bosnia and herzegovina': 'ba',
  'bosnia-herzegovina': 'ba',
  qatar: 'qa',
  switzerland: 'ch',
  brazil: 'br',
  morocco: 'ma',
  haiti: 'ht',
  scotland: 'gb-sct',
  usa: 'us',
  'united states': 'us',
  'united states of america': 'us',
  paraguay: 'py',
  australia: 'au',
  turkey: 'tr',
  türkiye: 'tr',
  turkiye: 'tr',
  germany: 'de',
  curacao: 'cw',
  'curaçao': 'cw',
  'ivory coast': 'ci',
  "côte d'ivoire": 'ci',
  'cote d ivoire': 'ci',
  ecuador: 'ec',
  netherlands: 'nl',
  holland: 'nl',
  japan: 'jp',
  sweden: 'se',
  tunisia: 'tn',
  belgium: 'be',
  egypt: 'eg',
  iran: 'ir',
  'new zealand': 'nz',
  spain: 'es',
  'cape verde': 'cv',
  'cabo verde': 'cv',
  'saudi arabia': 'sa',
  uruguay: 'uy',
  france: 'fr',
  senegal: 'sn',
  iraq: 'iq',
  norway: 'no',
  argentina: 'ar',
  algeria: 'dz',
  austria: 'at',
  jordan: 'jo',
  portugal: 'pt',
  'dr congo': 'cd',
  'congo dr': 'cd',
  'democratic republic of the congo': 'cd',
  uzbekistan: 'uz',
  colombia: 'co',
  england: 'gb-eng',
  croatia: 'hr',
  ghana: 'gh',
  panama: 'pa',
  // A few extra common countries not in the 2026 field, kept for the demo
  // seed script and general admin-created matches.
  italy: 'it',
  wales: 'gb-wls',
  'northern ireland': 'gb-nir',
  denmark: 'dk',
  poland: 'pl',
  serbia: 'rs',
  chile: 'cl',
  peru: 'pe',
  russia: 'ru',
  nigeria: 'ng',
  cameroon: 'cm',
};

export function flagUrl(teamName: string): string {
  const code = COUNTRY_CODES[teamName.trim().toLowerCase()];
  if (!code) return '🏳️'; // fallback for unrecognized names — still renders fine
  return `https://flagcdn.com/w80/${code}.png`;
}
