// A make.fun frontend: the board of open bounties and a page for each, its
// leaderboard and an account's public profile, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/profile/<handle>          an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, error, leaderboard, leaderboardRows, loading, notFound, profile, ROW_H } from './views.js';

const app = document.getElementById('app');

/** The board's loaded bounties, filter and page, kept across views so going
    back to the board costs no second request. */
const boardState = { items: [], cursor: null, page: 0, query: '' };
let leaderboardPage = 0;
let leaderboardData = null;
let leaderboardSlug = '';

function show(html, title) {
  app.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  try {
    const lb = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
    const one = hash.match(/^#\/bounty\/([^/]+)$/);
    const prof = hash.match(/^#\/profile\/([^/]+)$/);
    if (lb) {
      const slug = decodeURIComponent(lb[1]);
      const data = await getLeaderboard(slug);
      leaderboardData = data;
      leaderboardSlug = slug;
      leaderboardPage = 0;
      show(leaderboard(data, slug, leaderboardPage), `${data.competition?.title ?? slug} leaderboard | make.fun bounties`);
    } else if (one) {
      const slug = decodeURIComponent(one[1]);
      const b = await getBounty(slug);
      if (!b || b.slug == null) return show(notFound(`Bounty ${slug}`), 'Not found | make.fun bounties');
      show(bounty(b), `${b.title} | make.fun bounties`);
    } else if (prof) {
      const handle = decodeURIComponent(prof[1]);
      const p = await getProfile(handle);
      if (!p || p.handle == null) return show(notFound(`Profile @${handle}`), 'Not found | make.fun bounties');
      show(profile(p), `@${p.handle} | make.fun bounties`);
    } else {
      if (boardState.items.length === 0) {
        app.innerHTML = loading();
        const data = await getBounties();
        boardState.items = data.items ?? [];
        boardState.cursor = data.next_cursor ?? null;
      }
      show(board(boardState), 'make.fun bounties');
    }
  } catch (e) {
    show(error(e instanceof Error ? e.message : 'The request failed.'), 'Error | make.fun bounties');
  }
}

app.addEventListener('scroll', (event) => {
  const scroller = event.target.closest?.('.lb-scroll');
  if (!scroller || !leaderboardData) return;
  const body = scroller.querySelector('tbody');
  if (!body) return;
  const pageLength = Number(body.dataset.pageLength) || 0;
  const start = Math.max(0, Math.min(Math.max(0, pageLength - 30), Math.floor(scroller.scrollTop / ROW_H) - 7));
  if (start === Number(body.dataset.windowStart || 0)) return;
  body.innerHTML = leaderboardRows(leaderboardData, leaderboardPage, start);
  body.dataset.windowStart = String(start);
}, true);

/** The board's filter, pager and "load more" work without a new page load:
    one delegated listener for the whole main element. */
app.addEventListener('input', (event) => {
  if (event.target.id === 'board-filter') {
    boardState.query = event.target.value;
    boardState.page = 0;
    const list = app.querySelector('.board');
    const pager = app.querySelector('.pager');
    if (list && pager) {
      const html = board(boardState);
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      list.replaceWith(tmp.querySelector('.board'));
      pager.replaceWith(tmp.querySelector('.pager'));
      const input = document.getElementById('board-filter');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
});

app.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-page], button[data-more]');
  if (!button || button.disabled) return;
  if (button.hasAttribute('data-more')) {
    button.disabled = true;
    button.textContent = 'Loading…';
    try {
      const data = await getBounties(boardState.cursor);
      boardState.items = boardState.items.concat(data.items ?? []);
      boardState.cursor = data.next_cursor ?? null;
      show(board(boardState), 'make.fun bounties');
    } catch (e) {
      show(error(e instanceof Error ? e.message : 'The request failed.'), 'Error | make.fun bounties');
    }
    return;
  }
  const page = Number(button.getAttribute('data-page'));
  if (Number.isInteger(page) && page >= 0) {
    if (location.hash.startsWith('#/bounty/')) {
      leaderboardPage = page;
      const slug = location.hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/)[1];
      if (leaderboardData && leaderboardSlug === decodeURIComponent(slug)) {
        show(leaderboard(leaderboardData, leaderboardSlug, page), document.title);
      } else {
        leaderboardData = await getLeaderboard(decodeURIComponent(slug));
        leaderboardSlug = decodeURIComponent(slug);
        show(leaderboard(leaderboardData, leaderboardSlug, page), document.title);
      }
    } else {
      boardState.page = page;
      show(board(boardState), 'make.fun bounties');
    }
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id === 'profile-lookup') {
    event.preventDefault();
    const handle = document.getElementById('profile-handle').value.trim();
    if (handle) location.hash = `#/profile/${encodeURIComponent(handle)}`;
  } else if (event.target.id === 'board-tools') {
    event.preventDefault();
  }
});

window.addEventListener('hashchange', render);
render();
