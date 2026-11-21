import { bestIn } from '../ext-best.js';


const ROOM_LOCKS = Object.freeze({
  turret: { key: 'lc1', idea: 'That was look-up: keep what you have seen, then ask for the partner of each number.' },
  pincer: { key: 'lc167', idea: 'That was two pointers: one at each end of sorted data, and the sum says which one moves.' },
  shield: { key: 'lc20', idea: 'That was a stack: the last opener is the one the next closer must match.' },
  beam: { key: 'lc704', idea: 'That was binary search: aim at the middle and half of the range is gone.' },
  net: { key: 'lc3', idea: 'That was a sliding window: grow it, shrink it, never start over.' },
});
const WAVE_LOCKS = Object.freeze({ pincer: { w3: 'lc11' } });

function roomLock(rigId, mode) {
  if (!Object.hasOwn(ROOM_LOCKS, rigId)) return null;
  const room = ROOM_LOCKS[rigId];
  const wave = Object.hasOwn(WAVE_LOCKS, rigId) ? WAVE_LOCKS[rigId] : {};
  return { key: Object.hasOwn(wave, mode) ? wave[mode] : room.key, idea: room.idea };
}
function waveFor(rigId, key) {
  const wave = Object.entries(WAVE_LOCKS[rigId] ?? {}).find(([, waveKey]) => waveKey === key);
  return wave ? wave[0] : null;
}
function roomsFor(key) {
  return Object.keys(ROOM_LOCKS).filter((id) => ROOM_LOCKS[id].key === key || waveFor(id, key) !== null);
}
function roomRehearsing(key, game) {
  const won = game.progress?.won;
  if (!won) return null;
  const rehearsed = (id) => {
    const wave = waveFor(id, key);
    return wave ? bestIn(game.ext, id, wave).stars > 0 : won.has(id);
  };
  return roomsFor(key).find(rehearsed) || null;
}

export { roomLock, roomRehearsing, roomsFor };
