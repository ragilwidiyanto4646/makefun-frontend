import { esc, money, num, pct, date, timeLeft, short, takesEntries, md as renderMarkdown } from './format.js';
export const ROW_H = 36;
export { md } from './format.js';
const arr = x => Array.isArray(x) ? x : [];
const slugOf = b => b.slug ?? b.id ?? '';
const titleOf = b => b.title ?? b.name ?? slugOf(b);
const entriesOf = b => b.entries_count ?? b.entry_count ?? b.entries?.length ?? 0;
const deadlineOf = b => b.deadline ?? b.ends_at ?? b.end_at;
const livePot = b => b.live_pot ?? b.pot ?? b.reward ?? b.prize_pool ?? 0;
const closed = b => b.closed === true || b.status === 'closed' || !takesEntries({ deadline: deadlineOf(b) });
export function safeHttps(url, fallback) { try { const u = new URL(url); return u.protocol === 'https:' ? u.href : fallback; } catch { return fallback; } }
function rows(items) { return items.map(b => `<li><a class="item-title" href="#/bounty/${encodeURIComponent(slugOf(b))}">${esc(titleOf(b))}</a><span class="pot">${money(livePot(b))}</span><span>${b.entry_fee != null && Number(b.entry_fee) ? `${money(b.entry_fee)} fee` : 'no fee'}</span><span>${timeLeft(deadlineOf(b))}</span><span>${num(entriesOf(b))} ${Number(entriesOf(b)) === 1 ? 'entry' : 'entries'}</span><span class="pill ${closed(b) ? 'closed' : 'open'}">${closed(b) ? 'Closed' : 'Open'}</span></li>`).join(''); }
export function board(state = {}) {
  const all = arr(state.items).slice().sort((a,b) => Number(closed(a))-Number(closed(b)) || (closed(a) ? new Date(deadlineOf(b))-new Date(deadlineOf(a)) : new Date(deadlineOf(a))-new Date(deadlineOf(b))));
  const q = String(state.query ?? '').trim().toLowerCase(), matches = all.filter(b => !q || [titleOf(b), b.category, slugOf(b)].some(v => String(v ?? '').toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(matches.length / 12)), page = Math.max(0, Math.min(Number(state.page) || 0, totalPages - 1));
  const count = all.length, open = all.filter(b => !closed(b)).length;
  return `<h1>Open bounties</h1><p class="lede">${num(count)} bounties · ${num(open)} still taking entries — reward shown is the live pot, prize plus entry fees paid in.</p><form class="tools" id="board-tools"><label for="board-filter">Filter bounties</label><input id="board-filter" type="search" value="${esc(state.query ?? '')}" autocomplete="off"></form>${matches.length ? '' : '<p>No bounties match that filter.</p>'}<ul class="board">${rows(matches.slice(page*12,page*12+12))}</ul><nav class="pager" aria-label="Bounty pages"><button data-page="${Math.max(0,page-1)}" ${page===0?'disabled':''}>← Newer</button><span>Page ${page+1} of ${totalPages}</span><button data-page="${Math.min(totalPages-1,page+1)}" ${page>=totalPages-1?'disabled':''}>Older →</button>${state.cursor ? '<button data-more="1">Load more bounties</button>' : ''}</nav><form id="profile-lookup"><label for="profile-handle">Find a profile</label><input id="profile-handle" placeholder="Enter a handle such as tidy-meteor-25"><button>Look up</button></form>`;
}
const rewardRows = b => arr(b.live_splits ?? b.splits ?? b.rewards).map((r,i)=>`<tr><td>${esc(r.place ?? r.rank ?? i+1)}</td><td>${money(r.amount ?? r.prize ?? r.value)}</td><td>${esc(r.split ?? r.percentage ?? '')}</td></tr>`);
export function bounty(b = {}) {
  const slug = slugOf(b), status = closed(b) ? 'Closed — no longer taking entries' : 'Open — taking entries';
  let rewards = rewardRows(b); if (!rewards.length && b.reward_map && typeof b.reward_map === 'object') rewards = Object.entries(b.reward_map).map(([place,value])=>`<tr><td>${esc(place)}</td><td>${money(value)}</td><td>—</td></tr>`);
  return `<a class="back" href="#/">← Back to board</a><h1>${esc(titleOf(b))}</h1><p class="lede">${esc(b.summary ?? '')}</p><dl class="meta"><dt>Reward</dt><dd class="pot">${money(livePot(b))}</dd>${b.entry_fee != null ? `<dt>Entry fee</dt><dd>${money(b.entry_fee)}</dd>` : ''}<dt>Deadline</dt><dd>${date(deadlineOf(b))} (${timeLeft(deadlineOf(b))})</dd><dt>Status</dt><dd>${status}</dd><dt>Entries</dt><dd>${num(entriesOf(b))}</dd><dt>Category</dt><dd>${esc(b.category ?? '—')}</dd>${b.sponsor?.name || b.sponsor_name ? `<dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? b.sponsor_name)}</dd>` : ''}</dl><p><a href="#/bounty/${encodeURIComponent(slug)}/leaderboard">View leaderboard</a></p><h2>Rewards</h2><table><thead><tr><th>Place</th><th>Pays now</th><th>Split</th></tr></thead><tbody>${rewards.join('') || '<tr><td colspan="3">No rewards table published.</td></tr>'}</tbody></table><h2>Description</h2><div class="description">${renderMarkdown(b.description ?? '')}</div>`;
}
function visibleColumns(lb) { return arr(lb.columns).filter(c => !c.hidden); }
function cell(entry,key) { const display = entry.display ?? {}, values = entry.values ?? {}; if (['judge','judge_low','judge_high'].includes(key)) return pct(values[key] ?? entry[key]); if (key === 'bytes') return `<span class="num">${num(values[key] ?? entry[key])} B</span>`; return esc(display[key] ?? values[key] ?? entry[key] ?? '—'); }
export function leaderboardRows(lb, page=0, start=0) {
  const list = arr(lb.entries ?? lb.rows).slice(page*50,page*50+50), cols = visibleColumns(lb), from = Math.max(0,start), shown = list.slice(from,from+30), top = from, bottom = Math.max(0,list.length-from-shown.length), colspan = cols.length+3;
  const spacer = n => n > 0 ? `<tr class="lb-spacer" aria-hidden="true"><td colspan="${colspan}" style="height:${n*ROW_H}px"></td></tr>` : '';
  return spacer(top) + shown.map(entry => `
      <tr>
        <td>${num(entry.rank)}</td>
        <td><a href="#/profile/${encodeURIComponent(entry.handle ?? '')}">${esc(entry.handle ?? '—')}</a></td>
        <td>${esc(entry.title ?? '')}</td>
        ${cols.map((column) => `<td>${cell(entry, column.key)}</td>`).join('')}
      </tr>`).join('') + spacer(bottom);
}
export function leaderboard(lb = {}, slug = '', page=0) {
  const cols=visibleColumns(lb), entries=arr(lb.entries ?? lb.rows), title=lb.title ?? lb.competition?.title ?? slug;
  if (!entries.length) return `<a class="back" href="#/bounty/${encodeURIComponent(slug)}">← Back to bounty</a><h1>${esc(title)} — leaderboard</h1><p>No entries yet — this bounty has no submissions.</p>`;
  const count=Math.min(50,Math.max(0,entries.length-page*50));
  return `<a class="back" href="#/bounty/${encodeURIComponent(slug)}">← Back to bounty</a><h1>${esc(title)} — leaderboard</h1><p class="lede">${num(entries.length)} entr${entries.length===1?'y':'ies'}${lb.phase?.title ? ` · ${esc(lb.phase.title)} phase` : ''}</p><div class="pager"><button data-page="${Math.max(0,page-1)}" ${page===0?'disabled':''}>← Prev</button><span>Page ${page+1} of ${Math.max(1,Math.ceil(entries.length/50))}</span><button data-page="${page+1}" ${count<50?'disabled':''}>Next →</button></div><div class="table-wrap lb-scroll" tabindex="0"><table><thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>${cols.map(c=>`<th scope="col">${esc(c.title ?? c.label ?? c.key)}</th>`).join('')}</tr></thead><tbody data-page-length="${count}" data-window-start="0">${leaderboardRows(lb,page,0)}</tbody></table></div>`;
}
export function profile(p={}) {
  const handle=p.handle ?? '', wallet=p.wallet?.address ?? p.wallet_address ?? '', fallback=`https://solscan.io/account/${encodeURIComponent(wallet)}`, entries=arr(p.entries);
  return `<a class="back" href="#/">← Back to board</a>${p.image ? `<img class="avatar" crossorigin="anonymous" src="${esc(safeHttps(p.image,''))}" alt="" width="96" height="96">` : ''}<h1>${esc(p.display_name || handle)}</h1><p class="lede">@${esc(handle)}${p.joined_at ? ` · joined ${date(p.joined_at)}` : ''}</p>${p.bio ? `<p>${esc(p.bio)}</p>` : ''}<dl class="meta"><dt>Wallet</dt><dd><a href="${esc(safeHttps(p.wallet?.explorer_url, fallback))}">${esc(short(wallet))}</a></dd><dt>Entered</dt><dd>${num(p.entered ?? entries.length)}</dd><dt>Placed</dt><dd>${num(p.placed ?? 0)}</dd><dt>Won</dt><dd>${num(p.won ?? 0)}</dd><dt>Prize money</dt><dd>${money(p.prize_money ?? p.winnings)}</dd></dl><h2>Entries</h2>${entries.length ? `<table><thead><tr><th>Bounty</th><th>Place</th><th>Prize</th><th>Score</th></tr></thead><tbody>${entries.map(e=>`<tr><td><a href="#/bounty/${encodeURIComponent(e.slug ?? '')}">${esc(e.title ?? e.slug ?? '')}</a></td><td>${e.place != null ? `#${num(e.place)}` : '—'}</td><td>${e.prize != null ? money(e.prize) : '—'}</td><td>${e.score?.value != null ? esc(String(e.score.value)) : '—'}</td></tr>`).join('')}</tbody></table>` : '<p>No entries yet.</p>'}`;
}
export const loading = () => '<p>Loading…</p>';
export const error = message => `<h1>Something went wrong</h1><p>${esc(message)}</p><a href="#/">Back to the board</a>`;
export const notFound = what => `<h1>Not found</h1><p>${esc(what)} does not exist on make.fun.</p><a href="#/">Back to the board</a>`;
