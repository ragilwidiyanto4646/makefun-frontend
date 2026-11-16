import { date, esc, money, num, pct, short, takesEntries, timeLeft } from './format.js';

const PAGE_SIZE = 12;
const LB_PAGE_SIZE = 50;
const LB_WINDOW = 30;

function safeHttps(url, fallback) {
  try {
    const value = String(url);
    return new URL(value).protocol === 'https:' ? value : fallback;
  } catch {
    return fallback;
  }
}

const pot = (b) => money(b.potUsd ?? b.rewardAmount);
const stillOpen = (b) => takesEntries(b) && b.closed !== true && String(b.status ?? '').toLowerCase() !== 'closed';
const statusPill = (b) => stillOpen(b)
  ? '<span class="pill open">Open</span>'
  : '<span class="pill closed">Closed</span>';

export function md(text) {
  const inline = (value) => esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  let html = '';
  let inList = false;
  const endList = () => {
    if (inList) html += '</ul>';
    inList = false;
  };
  for (const line of String(text ?? '').split('\n')) {
    const first = line.match(/^# (.*)$/);
    const second = line.match(/^## (.*)$/);
    const item = line.match(/^[-*] (.*)$/);
    if (first) {
      endList(); html += `<h2>${inline(first[1])}</h2>`;
    } else if (second) {
      endList(); html += `<h3>${inline(second[1])}</h3>`;
    } else if (item) {
      if (!inList) html += '<ul>';
      inList = true;
      html += `<li>${inline(item[1])}</li>`;
    } else if (!line.trim()) {
      endList();
    } else {
      endList(); html += `<p>${inline(line)}</p>`;
    }
  }
  endList();
  return html;
}

function sortBoard(items) {
  return [...items].sort((a, b) => {
    const aOpen = stillOpen(a);
    const bOpen = stillOpen(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    const delta = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    return aOpen ? delta : -delta;
  });
}

export function board(state) {
  const needle = String(state.query ?? '').trim().toLowerCase();
  const all = sortBoard(state.items ?? []);
  const filtered = needle
    ? all.filter((b) => `${b.title ?? ''} ${b.category ?? ''} ${b.slug ?? ''}`.toLowerCase().includes(needle))
    : all;
  const openCount = (state.items ?? []).filter(stillOpen).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(Number(state.page) || 0, pages - 1));
  const rows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((b) => `
      <li>
        <a class="row-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="row-pot">${pot(b)}</span>
        <span>${b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'no fee'}</span>
        <span>${timeLeft(b.deadline)}</span>
        <span>${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
        <span>${statusPill(b)}</span>
      </li>`).join('');
  return `
    <h1>Open bounties</h1>
    <p class="lede">${num((state.items ?? []).length)} bounties · ${num(openCount)} still taking entries — reward shown is the live pot, prize plus entry fees paid in.</p>
    <form class="tools" id="board-tools" action="#/" method="get">
      <label>Filter <input type="search" id="board-filter" name="q" value="${esc(state.query ?? '')}" placeholder="Filter by title or category" aria-label="Filter bounties by title or category"></label>
      <button type="submit">Filter</button>
    </form>
    <ul class="board">${rows || '<li class="empty">No bounties match that filter.</li>'}</ul>
    <nav class="pager" aria-label="Board pages">
      <button type="button" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>← Newer</button>
      <span>Page ${page + 1} of ${pages}</span>
      <button type="button" data-page="${page + 1}" ${page + 1 >= pages ? 'disabled' : ''}>Older →</button>
      ${state.cursor ? '<button type="button" data-more="1">Load more bounties</button>' : ''}
    </nav>
    <form class="profile-lookup" id="profile-lookup" action="#/profile/" method="get">
      <label>View a profile <input type="text" id="profile-handle" name="handle" placeholder="handle, e.g. tidy-meteor-25" aria-label="Account handle"></label>
      <button type="submit">Open profile</button>
    </form>`;
}

export function bounty(b) {
  const open = stillOpen(b);
  const now = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow.map((r) => `<tr><td>${num(r.place)}</td><td>${money(r.amountUsd)}</td><td>${money(r.baseUsd)} prize + ${money(r.feeShareUsd)} fees</td></tr>`).join('')
    : Object.entries(b.rewards ?? {}).map(([place, amount]) => `<tr><td>${num(place)}</td><td>${money(amount)}</td><td></td></tr>`).join('');
  return `
    <p><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <dl class="meta">
      <dt>Reward (live pot)</dt><dd class="pot">${pot(b)}</dd>
      ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Status</dt><dd>${open ? 'Open — taking entries' : 'Closed — no longer taking entries'}</dd>
      <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
      <dt>Category</dt><dd>${esc(b.category ?? '—')}</dd>
      ${b.sponsor ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name ?? '')}</dd>` : ''}
    </dl>
    <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a></p>
    <h2>Rewards</h2>
    <table><thead><tr><th scope="col">Place</th><th scope="col">Pays now</th><th scope="col">Split</th></tr></thead>
      <tbody>${now || '<tr><td colspan="3">No rewards table published.</td></tr>'}</tbody></table>
    <h2>Description</h2><div class="description">${md(b.description ?? '')}</div>`;
}

export const ROW_H = 36;

export function leaderboardRows(lb, page = 0, start = 0) {
  const columns = (lb.columns ?? []).filter((column) => !column.hidden);
  const entries = lb.entries ?? [];
  const offset = Math.max(0, page * LB_PAGE_SIZE);
  const length = Math.min(LB_PAGE_SIZE, Math.max(0, entries.length - offset));
  const from = Math.max(0, Math.min(length, Math.floor(Number(start) || 0)));
  const amount = Math.min(LB_WINDOW, length - from);
  const visible = entries.slice(offset + from, offset + from + amount);
  const renderCell = (entry, key) => {
    if (['judge', 'judge_low', 'judge_high'].includes(key)) return pct(entry.values?.[key]);
    if (key === 'bytes') return `<span class="num">${num(entry.values?.[key])} B</span>`;
    return esc(entry.display?.[key] ?? entry.values?.[key] ?? '—');
  };
  const body = visible.map((entry) => `
      <tr>
        <td>${num(entry.rank)}</td>
        <td><a href="#/profile/${encodeURIComponent(entry.handle ?? '')}">${esc(entry.handle ?? '—')}</a></td>
        <td>${esc(entry.title ?? '')}</td>
        ${columns.map((column) => `<td>${renderCell(entry, column.key)}</td>`).join('')}
      </tr>`).join('');
  const spacer = (hidden) => hidden > 0
    ? `<tr class="lb-spacer" aria-hidden="true"><td colspan="${columns.length + 3}" style="height:${hidden * ROW_H}px"></td></tr>`
    : '';
  return `${spacer(from)}${body}${spacer(length - from - amount)}`;
}

export function leaderboard(lb, slug, page = 0) {
  const columns = (lb.columns ?? []).filter((column) => !column.hidden);
  const entries = lb.entries ?? [];
  const pages = Math.max(1, Math.ceil(entries.length / LB_PAGE_SIZE));
  const count = Math.min(LB_PAGE_SIZE, Math.max(0, entries.length - page * LB_PAGE_SIZE));
  const title = lb.competition?.title ?? slug;
  return `
    <p><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(title)}</a></p>
    <h1>${esc(title)} — leaderboard</h1>
    <p class="lede">${num(entries.length)} ${entries.length === 1 ? 'entry' : 'entries'}${lb.phase ? ` · ${esc(lb.phase.title ?? '')} phase` : ''}</p>
    ${entries.length === 0 ? '<p class="empty">No entries yet — this bounty has no submissions.</p>' : `
    <div class="table-wrap lb-scroll" tabindex="0"><table>
      <thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>${columns.map((column) => `<th scope="col">${esc(column.title)}</th>`).join('')}</tr></thead>
      <tbody data-page-length="${count}" data-window-start="0">${leaderboardRows(lb, page, 0)}</tbody>
    </table></div>
    <nav class="pager" aria-label="Leaderboard pages">
      <button type="button" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>← Prev</button>
      <span>Page ${page + 1} of ${pages}</span>
      <button type="button" data-page="${page + 1}" ${page + 1 >= pages ? 'disabled' : ''}>Next →</button>
    </nav>`}`;
}

export function profile(p) {
  const name = p.display_name || p.handle;
  const record = p.record ?? {};
  const rows = (p.solutions ?? []).map((solution) => `
      <tr>
        <td><a href="#/bounty/${encodeURIComponent(solution.competition?.slug ?? '')}">${esc(solution.competition?.title ?? solution.title ?? '')}</a></td>
        <td>${solution.placement ? `#${num(solution.placement)}` : '—'}</td>
        <td>${solution.prize_usd ? money(solution.prize_usd) : '—'}</td>
        <td>${esc(solution.score?.value != null ? String(solution.score.value) : '—')}</td>
      </tr>`).join('');
  const wallet = p.wallet?.address;
  const explorer = `https://solscan.io/account/${encodeURIComponent(wallet ?? '')}`;
  return `
    <p><a href="#/">← All bounties</a></p>
    ${p.image ? `<img class="avatar" crossorigin="anonymous" src="${esc(safeHttps(p.image, ''))}" alt="" width="96" height="96">` : ''}
    <h1>${esc(name)}</h1>
    <p class="lede">@${esc(p.handle)}${p.joined_at ? ` · joined ${date(p.joined_at)}` : ''}</p>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <dl class="meta">
      ${wallet ? `<dt>Wallet</dt><dd><a href="${esc(safeHttps(p.wallet.explorer_url, explorer))}">${esc(short(wallet))}</a></dd>` : ''}
      <dt>Entered</dt><dd>${num(record.competitions_entered)} ${record.competitions_entered === 1 ? 'bounty' : 'bounties'}</dd>
      <dt>Placed</dt><dd>${num(record.competitions_placed)}</dd>
      <dt>Won</dt><dd>${num(record.competitions_won)}</dd>
      <dt>Prize money</dt><dd>${money(record.prize_usd)}</dd>
    </dl>
    <h2>Entries</h2>
    ${rows ? `<div class="table-wrap"><table>
      <thead><tr><th scope="col">Bounty</th><th scope="col">Place</th><th scope="col">Prize</th><th scope="col">Score</th></tr></thead><tbody>${rows}</tbody>
    </table></div>` : '<p class="empty">No entries yet.</p>'}`;
}

export const loading = () => '<p>Loading…</p>';
export const error = (message) => `<h1>Something went wrong</h1><p>${esc(message)}</p><p><a href="#/">Back to the board</a></p>`;
export const notFound = (what) => `<h1>Not found</h1><p>${esc(what)} does not exist on make.fun.</p><p><a href="#/">Back to the board</a></p>`;
