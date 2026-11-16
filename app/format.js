const dash = '—';
export function esc(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&#38;', '<': '&#60;', '>': '&#62;', '"': '&#34;', "'": '&#39;' })[ch]);
}
const numeric = value => Number(value);
export function money(value) {
  const n = numeric(value);
  if (!Number.isFinite(n)) return dash;
  return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}
export function num(value) { const n = numeric(value); return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) : dash; }
export function pct(micro) { const n = numeric(micro); return Number.isFinite(n) ? (n / 10000).toFixed(2) + '%' : dash; }
export function date(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? dash : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d) + ' UTC';
}
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'ended';
  const mins = Math.floor(ms / 60000), days = Math.floor(mins / 1440), hours = Math.floor(mins % 1440 / 60), rest = mins % 60;
  return days ? `${days}d ${hours}h left` : hours ? `${hours}h ${rest}m left` : `${mins}m left`;
}
export function short(value, head = 4, tail = 4) { const s = String(value ?? ''); return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`; }
export function takesEntries(bounty) { return new Date(bounty?.deadline).getTime() > Date.now(); }
function inline(s) {
  return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}
export function md(source) {
  let list = false; const out = [];
  for (const raw of esc(source ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { if (list) { out.push('</ul>'); list = false; } continue; }
    if (list && !/^(?:-|\*) /.test(line)) { out.push('</ul>'); list = false; }
    if (line.startsWith('# ')) out.push(`<h2>${inline(line.slice(2))}</h2>`);
    else if (line.startsWith('## ')) out.push(`<h3>${inline(line.slice(3))}</h3>`);
    else if (/^(?:-|\*) /.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>'); return out.join('\n');
}
