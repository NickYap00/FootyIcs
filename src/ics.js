// RFC 5545 (iCalendar) builder. Pure functions, no I/O.

const CRLF = '\r\n';
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // assume 2h per match

// Escape a text value per RFC 5545 section 3.3.11.
// Order matters: backslash must be escaped first.
export function escapeText(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

// Fold a content line at 75 octets (UTF-8 bytes, not characters), per
// RFC 5545 section 3.1. Continuation lines begin with a single space.
export function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const parts = [];
  let start = 0;
  // First line: up to 75 octets. Continuation lines: a leading space + up
  // to 74 octets of content (space counts toward the 75-octet limit).
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Avoid splitting a multi-byte UTF-8 sequence: back off until `end` is
    // not in the middle of a continuation byte (0b10xxxxxx).
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--;
    }
    parts.push(bytes.slice(start, end).toString('utf8'));
    start = end;
    limit = 74; // subsequent chunks are prefixed with a space
  }
  return parts.join(CRLF + ' ');
}

// ISO string -> "YYYYMMDDTHHMMSSZ" (UTC basic format).
export function formatDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function line(prop, value) {
  return foldLine(`${prop}:${value}`);
}

// Build a single VEVENT block (array of already-folded lines).
export function buildVEvent(fixture, now = new Date()) {
  const start = new Date(fixture.dateISO);
  const end = new Date(start.getTime() + MATCH_DURATION_MS);

  const locationParts = [fixture.venueName, fixture.city, fixture.country].filter(Boolean);

  const descParts = [];
  if (fixture.competition) descParts.push(fixture.competition);
  if (fixture.opponent) descParts.push(`Opponent: ${fixture.opponent}`);
  if (fixture.broadcast) descParts.push(`TV: ${fixture.broadcast}`);

  const lines = [
    'BEGIN:VEVENT',
    line('UID', `${fixture.id}@footyics`),
    line('DTSTAMP', formatDate(now)),
    line('DTSTART', formatDate(start)),
    line('DTEND', formatDate(end)),
    line('SUMMARY', escapeText(fixture.summary)),
  ];

  if (locationParts.length) {
    lines.push(line('LOCATION', escapeText(locationParts.join(', '))));
  }
  if (descParts.length) {
    lines.push(line('DESCRIPTION', escapeText(descParts.join('\n'))));
  }
  lines.push('END:VEVENT');
  return lines;
}

// Wrap one or more fixtures into a full VCALENDAR string (CRLF terminated).
export function buildCalendar(fixtures, calendarName) {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FootyIcs//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (calendarName) {
    lines.push(line('X-WR-CALNAME', escapeText(calendarName)));
  }
  for (const fixture of fixtures) {
    lines.push(...buildVEvent(fixture, now));
  }
  lines.push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
}
