import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, error, leaderboard, leaderboardRows, loading, notFound, profile, ROW_H } from './views.js';

const app = document.getElementById('app');
const boardState = { items: [], cursor: null, page: 0, query: '' };
let leaderboardData = null;
let leaderboardSlug = '';
let leaderboardPage = 0;
let renderToken = 0;

function show(html, title) {
  app.innerHTML = html;
  document.title = title;
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
  window.__shotReady = true;
}

async function render() {
  const token = ++renderToken;
  window.__shotReady = false;
  const hash = location.hash || '#/';
  try {
    const lbRoute = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
    const bountyRoute = hash.match(/^#\/bounty\/([^/]+)$/);
    const profileRoute = hash.match(/^#\/profile\/([^/]+)$/);
    if (lbRoute) {
      const slug = decodeURIComponent(lbRoute[1]);
      app.innerHTML = loading();
      const data = await getLeaderboard(slug);
      if (token !== renderToken) return;
      leaderboardData = data;
      leaderboardSlug = slug;
      leaderboardPage = 0;
      show(leaderboard(data, slug, 0), `${data.competition?.title ?? slug} leaderboard | make.fun bounties`);
      return;
    }
    if (bountyRoute) {
      const slug = decodeURIComponent(bountyRoute[1]);
      app.innerHTML = loading();
      const data = await getBounty(slug);
      if (token !== renderToken) return;
      if (!data || data.slug == null) {
        show(notFound(`Bounty ${slug}`), 'Not found | make.fun bounties');
      } else {
        show(bounty(data), `${data.title} | make.fun bounties`);
      }
      return;
    }
    if (profileRoute) {
      const handle = decodeURIComponent(profileRoute[1]);
      app.innerHTML = loading();
      const data = await getProfile(handle);
      if (token !== renderToken) return;
      if (!data || data.handle == null) {
        show(notFound(`Profile @${handle}`), 'Not found | make.fun bounties');
      } else {
        show(profile(data), `@${data.handle} | make.fun bounties`);
      }
      return;
    }
    if (boardState.items.length === 0) {
      app.innerHTML = loading();
      const data = await getBounties();
      if (token !== renderToken) return;
      boardState.items = data.items ?? [];
      boardState.cursor = data.next_cursor ?? null;
    }
    show(board(boardState), 'make.fun bounties');
  } catch (cause) {
    if (token !== renderToken) return;
    show(error(cause instanceof Error ? cause.message : 'The request failed.'), 'Error | make.fun bounties');
  }
}

app.addEventListener('scroll', (event) => {
  const scroller = event.target.closest?.('.lb-scroll');
  if (!scroller || !leaderboardData || leaderboardSlug === '') return;
  const body = scroller.querySelector('tbody');
  if (!body) return;
  const length = Number(body.dataset.pageLength) || 0;
  const maxStart = Math.max(0, length - 30);
  const start = Math.max(0, Math.min(maxStart, Math.floor(scroller.scrollTop / ROW_H) - 7));
  if (start === Number(body.dataset.windowStart || 0)) return;
  body.innerHTML = leaderboardRows(leaderboardData, leaderboardPage, start);
  body.dataset.windowStart = String(start);
}, true);

app.addEventListener('input', (event) => {
  if (event.target.id !== 'board-filter') return;
  boardState.query = event.target.value;
  boardState.page = 0;
  const oldList = app.querySelector('.board');
  const oldPager = app.querySelector('.pager');
  if (!oldList || !oldPager) return;
  const fragment = document.createElement('div');
  fragment.innerHTML = board(boardState);
  oldList.replaceWith(fragment.querySelector('.board'));
  oldPager.replaceWith(fragment.querySelector('.pager'));
  const filter = document.getElementById('board-filter');
  filter.focus();
  filter.setSelectionRange(filter.value.length, filter.value.length);
});

app.addEventListener('click', async (event) => {
  const button = event.target.closest?.('button[data-page], button[data-more]');
  if (!button || button.disabled) return;
  if (button.hasAttribute('data-more')) {
    button.disabled = true;
    button.textContent = 'Loading…';
    try {
      const next = await getBounties(boardState.cursor);
      boardState.items = boardState.items.concat(next.items ?? []);
      boardState.cursor = next.next_cursor ?? null;
      show(board(boardState), 'make.fun bounties');
    } catch (cause) {
      show(error(cause instanceof Error ? cause.message : 'The request failed.'), 'Error | make.fun bounties');
    }
    return;
  }
  const requested = Number(button.dataset.page);
  if (!Number.isInteger(requested) || requested < 0) return;
  if (location.hash.startsWith('#/bounty/')) {
    const route = location.hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
    if (!route) return;
    leaderboardPage = requested;
    const slug = decodeURIComponent(route[1]);
    try {
      if (!leaderboardData || leaderboardSlug !== slug) {
        app.innerHTML = loading();
        leaderboardData = await getLeaderboard(slug);
        leaderboardSlug = slug;
      }
      show(leaderboard(leaderboardData, slug, requested), `${leaderboardData.competition?.title ?? slug} leaderboard | make.fun bounties`);
    } catch (cause) {
      show(error(cause instanceof Error ? cause.message : 'The request failed.'), 'Error | make.fun bounties');
    }
  } else {
    boardState.page = requested;
    show(board(boardState), 'make.fun bounties');
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
