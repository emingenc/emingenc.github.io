import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const PERCENT = 100;
const MIN_BAR_PERCENT = 6;

function uiRoomStar(index, stars) {
  const on = index < stars;
  return uiEl('span', { className: 'turret-star' + (on ? ' is-on' : ''), text: on ? STAR_ON : STAR_OFF });
}
function uiRoomStars(stars, className) {
  const cells = Array.from({ length: MAX_STARS }, (unused, index) => uiRoomStar(index, stars));
  return uiEl('p', { className, children: cells, attrs: { role: 'img', 'aria-label': stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiRoomBarRow(kind, label, share) {
  const fill = uiEl('div', { className: 'turret-vs-fill turret-vs-' + kind });
  if (fill.style && typeof fill.style.setProperty === 'function') fill.style.setProperty('--vs', share + '%');
  const track = uiEl('div', { className: 'turret-vs-track', children: [fill] });
  return uiEl('div', { className: 'turret-vs-row', children: [uiEl('span', { className: 'turret-vs-label', text: label }), track] });
}
function uiRoomBars(counts) {
  const { steps, brute } = counts;
  const ratio = brute > 0 ? steps / brute : 1;
  const you = Math.min(PERCENT, Math.max(MIN_BAR_PERCENT, Math.round(ratio * PERCENT)));
  const rows = [uiRoomBarRow('you', 'YOU ' + steps, you), uiRoomBarRow('brute', 'BRUTE ' + brute, PERCENT)];
  return uiEl('div', { className: 'turret-vs', children: rows, attrs: { 'aria-hidden': 'true' } });
}
function uiRoomLine(className, text) {
  return uiEl('p', { className: 'arena-card-line ' + className, text });
}

export { uiRoomStars, uiRoomBars, uiRoomLine };
