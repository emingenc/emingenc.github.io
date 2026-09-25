// cards.js — what some tools show inside their turn as clean cards: repos,
// each citing its repos.json line; a post the agent opened; and a game that
// plays in the page. Built from the knowledge rows in index.astro (#docWrap,
// data-* attributes) and Tools.games. Text only: nothing here takes HTML.
import { make, makeButton, makeLink } from './dom.js';

function external(link) {
  link.target = '_blank';
  link.rel = 'noopener';
  return link;
}

export function repoList() {
  const list = make('ul', 'cards');
  list.setAttribute('aria-label', 'Repositories');
  return list;
}

// row: a repos.json row ({line, data: {repo, stars, lang, desc, url}}).
export function repoCard(row) {
  const { repo, stars, lang, desc, url } = row.data;
  const card = external(makeLink(url, 'card'));
  const top = make('span', 'top');
  top.append(make('span', 'nm', repo), make('span', 'st', '★ ' + stars));
  card.append(top, make('span', 'desc', desc || lang), make('span', 'meta', lang + ' · repos.json L' + row.line));
  const item = make('li');
  item.append(card);
  return item;
}

function postMeta(data) {
  const meta = make('p', 'meta');
  meta.append(make('span', '', data.date));
  if (data.read) meta.append(make('span', '', data.read + ' min read'));
  if (data.tags) meta.append(make('span', 'tag', data.tags.split(',').map((tag) => '#' + tag).join(' ')));
  return meta;
}

// row: a writing.md row ({data: {slug, title, date, desc, tags, read}}).
export function postCard(row) {
  const { data } = row;
  const card = make('article', 'card post');
  const acts = make('div', 'acts');
  acts.append(makeLink('/blog/' + data.slug, 'btn pri', 'Read the post →'), makeLink('/blog', 'btn', 'All posts'));
  card.append(postMeta(data), make('h3', '', data.title), make('p', 'desc', data.desc), acts);
  return card;
}

// The game runs same-origin in a frame inside its card.
function play(card, game) {
  if (card.querySelector('iframe')) return;
  const screen = make('div', 'screen');
  const frame = make('iframe');
  frame.src = game.path;
  frame.title = game.name;
  frame.setAttribute('allow', 'fullscreen');
  screen.append(frame);
  card.querySelector('.acts').before(screen);
  card.querySelector('.play').hidden = true;
}

// game: a Tools.games entry ({name, path, desc}). playing: start it now.
export function gameCard(game, playing) {
  const card = make('article', 'card game');
  const start = makeButton('btn pri play', '▶ Play here');
  const acts = make('div', 'acts');
  start.addEventListener('click', () => play(card, game));
  acts.append(start, makeLink(game.path, 'btn', 'Open full screen ↗'));
  card.append(make('p', 'meta', 'web game · keyboard'), make('h3', '', game.name), make('p', 'desc', game.desc), acts);
  if (playing) play(card, game);
  return card;
}
