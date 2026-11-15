// The four surfaces, each a function from API data to HTML. Every value the
// API sends is escaped in format.js's esc before it reaches the page.

import { date, esc, money, num, pct, short, takesEntries, timeLeft } from './format.js';

/** An API-supplied link is only followed when it is an https: URL. Anything
    else — notably a javascript: URL smuggled in through API data — falls
    back to the given safe URL instead of becoming a clickable script. */
const safeHttps = (url, fallback) => {
  try {
    return new URL(String(url)).protocol === 'https:' ? String(url) : fallback;
  } catch {
    return fallback;
  }
};

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** A bounty past its deadline reads Closed even while its status says open. */
const statusPill = (b) =>
  takesEntries(b)
    ? '<span class="pill open">Open</span>'
    : '<span class="pill closed">Closed</span>';

/** A bounty description is Markdown: headings, lists and paragraphs, rendered
    as plain escaped text — links stay links, nothing else becomes markup. */
export function md(text) {
  const lines = String(text ?? '').split('\n');
  let html = '';
  let list = false;
  const closeList = () => {
    if (list) {
      html += '</ul>';
      list = false;
    }
  };
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const item = line.match(/^[-*]\s+(.*)/);
    if (h1) {
      closeList();
      html += `<h2>${inline(h1[1])}</h2>`;
    } else if (h2) {
      closeList();
      html += `<h3>${inline(h2[1])}</h3>`;
    } else if (item) {
      if (!list) {
        html += '<ul>';
        list = true;
      }
      html += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

const PAGE_SIZE = 12;

/** Board order: bounties still taking entries first, closing soonest on top,
    then closed ones, most recently closed first — the live board on top. */
function sortBoard(items) {
  return [...items].sort((a, b) => {
    const ao = takesEntries(a) ? 0 : 1;
    const bo = takesEntries(b) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const d = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    return ao === 0 ? d : -d;
  });
}

/** The board: live bounties, each with its pot, entry fee, time left and
    entries. `state` is { items, page, query, cursor }: the list is filtered
    in the browser and paged 12 at a time, so a view costs one API request. */
export function board(state) {
  const query = state.query.trim().toLowerCase();
  const ordered = sortBoard(state.items);
  const items = query
    ? ordered.filter((b) => `${b.title} ${b.category ?? ''} ${b.slug}`.toLowerCase().includes(query))
    : ordered;
  const openCount = state.items.filter(takesEntries).length;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(state.page, pages - 1);
  const rows = items
    .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    .map(
      (b) => `
      <li>
        <a class="row-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="row-pot">${pot(b)}</span>
        <span>${b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'no fee'}</span>
        <span>${timeLeft(b.deadline)}</span>
        <span>${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
        <span>${statusPill(b)}</span>
      </li>`,
    )
    .join('');
  return `
    <h1>Open bounties</h1>
    <p class="lede">${num(state.items.length)} bounties · ${num(openCount)} still taking entries — reward shown is the live pot, prize plus entry fees paid in.</p>
    <form class="tools" id="board-tools" action="#/" method="get">
      <label>Filter <input type="search" id="board-filter" name="q" value="${esc(state.query)}" placeholder="Filter by title or category" aria-label="Filter bounties by title or category"></label>
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

/** One bounty: summary, rewards with the live pot, dates, status and rules. */
export function bounty(b) {
  const open = takesEntries(b);
  const live = Array.isArray(b.rewardsNow) && b.rewardsNow.length > 0;
  const rewardRows = live
    ? b.rewardsNow
        .map((r) => `<tr><td>${num(r.place)}</td><td>${money(r.amountUsd)}</td><td>${money(r.baseUsd)} prize + ${money(r.feeShareUsd)} fees</td></tr>`)
        .join('')
    : Object.entries(b.rewards ?? {})
        .map(([place, usd]) => `<tr><td>${num(place)}</td><td>${money(usd)}</td><td></td></tr>`)
        .join('');
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
    <table>
      <thead><tr><th scope="col">Place</th><th scope="col">Pays now</th><th scope="col">Split</th></tr></thead>
      <tbody>${rewardRows || '<tr><td colspan="3">No rewards table published.</td></tr>'}</tbody>
    </table>
    <h2>Description</h2>
    <div class="description">${md(b.description ?? '')}</div>`;
}

/** A bounty's leaderboard: rank, entrant, entry and the columns the API
    publishes for this bounty, paged 50 at a time. */
export function leaderboard(lb, slug, page = 0) {
  const columns = (lb.columns ?? []).filter((c) => !c.hidden);
  const entries = lb.entries ?? [];
  const pages = Math.max(1, Math.ceil(entries.length / 50));
  const slice = entries.slice(page * 50, page * 50 + 50);
  const cell = (e, key) => {
    if (key === 'judge' || key === 'judge_low' || key === 'judge_high') return pct(e.values?.[key]);
    if (key === 'bytes') return `<span class="num">${num(e.values?.[key])} B</span>`;
    return esc(e.display?.[key] ?? e.values?.[key] ?? '—');
  };
  const rows = slice
    .map(
      (e) => `
      <tr>
        <td>${num(e.rank)}</td>
        <td><a href="#/profile/${encodeURIComponent(e.handle ?? '')}">${esc(e.handle ?? '—')}</a></td>
        <td>${esc(e.title ?? '')}</td>
        ${columns.map((c) => `<td>${cell(e, c.key)}</td>`).join('')}
      </tr>`,
    )
    .join('');
  return `
    <p><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(lb.competition?.title ?? slug)}</a></p>
    <h1>${esc(lb.competition?.title ?? slug)} — leaderboard</h1>
    <p class="lede">${num(entries.length)} ${entries.length === 1 ? 'entry' : 'entries'}${lb.phase ? ` · ${esc(lb.phase.title ?? '')} phase` : ''}</p>
    ${
      entries.length === 0
        ? '<p class="empty">No entries yet — this bounty has no submissions.</p>'
        : `<div class="table-wrap"><table>
      <thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th><th scope="col">Entry</th>${columns.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <nav class="pager" aria-label="Leaderboard pages">
      <button type="button" data-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>← Prev</button>
      <span>Page ${page + 1} of ${pages}</span>
      <button type="button" data-page="${page + 1}" ${page + 1 >= pages ? 'disabled' : ''}>Next →</button>
    </nav>`
    }`;
}

/** An account's public profile: who they are, their record, their entries. */
export function profile(p) {
  const name = p.display_name || p.handle;
  const solutions = (p.solutions ?? [])
    .map(
      (s) => `
      <tr>
        <td><a href="#/bounty/${encodeURIComponent(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? s.title ?? '')}</a></td>
        <td>${s.placement ? `#${num(s.placement)}` : '—'}</td>
        <td>${s.prize_usd ? money(s.prize_usd) : '—'}</td>
        <td>${esc(s.score?.value != null ? String(s.score.value) : '—')}</td>
      </tr>`,
    )
    .join('');
  const record = p.record ?? {};
  return `
    <p><a href="#/">← All bounties</a></p>
    ${p.image ? `<img class="avatar" crossorigin="anonymous" src="${esc(p.image)}" alt="" width="96" height="96">` : ''}
    <h1>${esc(name)}</h1>
    <p class="lede">@${esc(p.handle)}${p.joined_at ? ` · joined ${date(p.joined_at)}` : ''}</p>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    <dl class="meta">
      ${p.wallet?.address ? `<dt>Wallet</dt><dd><a href="${esc(safeHttps(p.wallet.explorer_url, `https://solscan.io/account/${p.wallet.address}`))}">${esc(short(p.wallet.address))}</a></dd>` : ''}
      <dt>Entered</dt><dd>${num(record.competitions_entered)} ${record.competitions_entered === 1 ? 'bounty' : 'bounties'}</dd>
      <dt>Placed</dt><dd>${num(record.competitions_placed)}</dd>
      <dt>Won</dt><dd>${num(record.competitions_won)}</dd>
      <dt>Prize money</dt><dd>${money(record.prize_usd)}</dd>
    </dl>
    <h2>Entries</h2>
    ${
      solutions
        ? `<div class="table-wrap"><table>
      <thead><tr><th scope="col">Bounty</th><th scope="col">Place</th><th scope="col">Prize</th><th scope="col">Score</th></tr></thead>
      <tbody>${solutions}</tbody>
    </table></div>`
        : '<p class="empty">No entries yet.</p>'
    }`;
}

export const loading = () => '<p>Loading…</p>';

export const error = (message) =>
  `<h1>Something went wrong</h1><p>${esc(message)}</p><p><a href="#/">Back to the board</a></p>`;

export const notFound = (what) =>
  `<h1>Not found</h1><p>${esc(what)} does not exist on make.fun.</p><p><a href="#/">Back to the board</a></p>`;
