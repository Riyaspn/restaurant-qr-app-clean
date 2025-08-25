// lib/orderingRules.js
export function isOrderingOpen({ online_paused, hours }, now = new Date()) {
  if (online_paused) return false;
  if (!Array.isArray(hours) || hours.length !== 7) return false;

  // ISO day: 1=Mon ... 7=Sun
  const dow = isoDayOfWeek(now);
  const row = hours.find(h => h.dow === dow);
  if (!row || !row.enabled) return false;

  const current = toMinutes(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
  const open = toMinutes(row.open);
  const close = toMinutes(row.close);

  // same-day interval (no overnight wrap)
  if (open <= close) return current >= open && current <= close;

  // overnight wrap (e.g. 18:00–02:00)
  return current >= open || current <= close;
}

// Convert table rows into the hours shape expected above
export function mapDbHoursToRule(hoursRows) {
  return hoursRows.map(r => ({
    dow: r.dow,
    open: hhmm(r.open_time),
    close: hhmm(r.close_time),
    enabled: !!r.enabled,
  }));
}

function hhmm(val) {
  const str = String(val || '00:00');
  const [h, m] = str.split(':');
  return `${pad2(h)}:${pad2(m || '00')}`;
}
function pad2(n) { return String(n).padStart(2, '0'); }
function toMinutes(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }
function isoDayOfWeek(d) { let day = d.getDay(); return day === 0 ? 7 : day; }
