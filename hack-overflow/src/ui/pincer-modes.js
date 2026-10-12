import { W2_STREAMS } from '../game/rooms/data/pincer-w2-pool.js';
import { W3_STREAMS } from '../game/rooms/data/pincer-w3-pool.js';
import { MODES } from '../game/rooms/data/pincer-waves.js';
import { bestIn } from '../game/ext-best.js';
import { createPincer } from '../game/rooms/pincer.js';
import { PINCER_TEXTS } from '../game/rooms/data/pincer-texts.js';
import { buildPool, pickStream } from '../game/rooms/pincer-stream.js';
import { uiRoomLabCleared, uiRoomPools } from './room-modes.js';


const LAB_ID = 'pincer';
const LAB_LEVEL = 'pincer-1';
const OPENED_BY = { w1: null, w2: 'w1', w3: 'w2' };

function uiPincerCleared(app, mode) {
  if (mode === 'w1') return uiRoomLabCleared(app, LAB_ID, LAB_LEVEL);
  return bestIn(app.game.ext, LAB_ID, mode).stars > 0;
}
function uiPincerUnlocked(app, mode) {
  if (!Object.hasOwn(OPENED_BY, mode)) return false;
  return OPENED_BY[mode] === null || uiPincerCleared(app, OPENED_BY[mode]);
}
function uiPincerFirstMode(app) {
  return MODES.filter((mode) => uiPincerUnlocked(app, mode)).pop();
}
function uiPincerOtherModes(app, mode) {
  return MODES.filter((id) => id !== mode && uiPincerUnlocked(app, id));
}
const HEADINGS = { w2: 'PINCER · W2', w3: 'PINCER · W3' };
const LABEL_SUFFIX = { w1: '', w2: ', wave 2: the pillars fall in line', w3: ', wave 3: the dam' };
const CARD_TITLES = { w1: PINCER_TEXTS.card.title, w2: PINCER_TEXTS.card.title2, w3: PINCER_TEXTS.card.title3 };
const POOLS = uiRoomPools(buildPool, W2_STREAMS, W3_STREAMS);
function uiPincerRunFor(start) {
  const picked = pickStream(POOLS[start.mode](), start.lastIndex, Math.random);
  return { state: createPincer(picked.stream), index: picked.index };
}

function uiPincerHeading(title, mode) {
  return HEADINGS[mode] || title;
}
function uiPincerHeadingLabel(title, mode) {
  return title + LABEL_SUFFIX[mode];
}
function uiPincerCardTitle(mode) {
  return CARD_TITLES[mode];
}

export { uiPincerHeading, uiPincerHeadingLabel, uiPincerCardTitle, uiPincerCleared, uiPincerUnlocked, uiPincerFirstMode, uiPincerOtherModes, uiPincerRunFor };
