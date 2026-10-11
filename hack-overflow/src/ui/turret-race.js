import { OVERRUN_LINE, raceLine } from '../game/cast/brute.js';
import { ASSIST_BRUTE_PER_STEP, RACE_RANK, RACE_SOURCE, WRONG_MOVE_MS, bruteChecksAt, raceVerdict, racesIn } from '../game/rooms/turret-race.js';
import { BRUTE_MS_PER_COMPARE } from '../game/rooms/data/turret-wave1.js';
import { bruteCompares } from '../game/rooms/turret.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';


const MS_IN_SECOND = 1000;
const STAMPS = { you: 'YOU WIN', brute: 'BRUTE WINS' };
const AGAIN = 'RACE AGAIN';

function uiRaceTake(app) {
  const brute = app.game.brute;
  if (!brute || !brute.race) return false;
  brute.race = false;
  return true;
}
function uiRaceOn(asked, mode) {
  return Boolean(asked) && racesIn(mode);
}
function uiRaceDrones(arena) {
  return arena.state.stream.length;
}
function uiRaceStrip(arena) {
  const drones = uiRaceDrones(arena);
  const checks = bruteChecksAt({ assist: arena.state.assist, playMs: arena.playMs, steps: arena.state.steps, drones });
  return 'BRUTE ' + checks + '/' + bruteCompares(drones);
}
function uiRaceRule(arena) {
  const drones = uiRaceDrones(arena);
  if (arena.state.assist) return 'RACE BRUTE: clear in under ' + Math.ceil(bruteCompares(drones) / ASSIST_BRUTE_PER_STEP) + ' actions.';
  return 'RACE BRUTE: clear before his ' + secondsOf(bruteCompares(drones) * BRUTE_MS_PER_COMPARE) + ' s. A wrong move adds ' + secondsOf(WRONG_MOVE_MS) + ' s.';
}
function secondsOf(ms) {
  return (ms / MS_IN_SECOND).toFixed(1);
}
function uiRaceResult(arena) {
  const state = arena.state;
  const drones = uiRaceDrones(arena);
  if (state.status !== 'won') return { winner: 'brute', line: OVERRUN_LINE, detail: '' };
  const verdict = raceVerdict({ assist: arena.state.assist, playMs: arena.playMs, wrong: state.wrong, steps: state.steps, drones });
  return { winner: verdict.winner, line: raceLine(verdict, bruteCompares(drones)), detail: uiRaceDetail(verdict, state.wrong) };
}
function uiRaceDetail(verdict, wrong) {
  if (verdict.assist) return verdict.youTicks + ' actions to his ' + verdict.bruteTicks + '.';
  const slips = wrong > 0 ? ' (+' + secondsOf(wrong * WRONG_MOVE_MS) + ' s for ' + wrong + ' wrong move' + (wrong === 1 ? '' : 's') + ')' : '';
  return 'Your time ' + secondsOf(verdict.youMs) + ' s, his ' + secondsOf(verdict.bruteMs) + ' s' + slips + '.';
}
function uiRacePay(app, arena) {
  const earlier = app.rig.rankPay || Promise.resolve();
  const paying = earlier
    .then(() => import('./rank-pay.js'))
    .then((pay) => pay.uiPayRank(app, RACE_SOURCE, RACE_RANK))
    .then(function (paid) {
      if (paid.paid && arena.result) arena.result.racePaid = { gain: paid.gain, up: paid.up };
      if (paid.paid && app.screen === 'rig' && app.rig && app.rig.arena === arena) uiRenderKeepingFocus(app);
      return paid;
    })
    .catch(() => ({ paid: false, gain: 0, up: null }));
  app.rig.racePay = paying;
  return paying;
}
function uiRaceSpoken(result) {
  return result.race ? STAMPS[result.race.winner] + '. ' + result.race.line + ' ' : '';
}
function uiRaceFinish(app, arena) {
  const race = uiRaceResult(arena);
  arena.result.race = race;
  if (race.winner === 'you') uiRacePay(app, arena);
}
function uiRaceStamp(result) {
  const race = result.race;
  return race ? [uiEl('p', { className: 'turret-stamp is-' + race.winner, text: STAMPS[race.winner] })] : [];
}
function uiRaceCardLines(result) {
  const race = result.race;
  if (!race) return [];
  const lines = [
    race.detail ? uiEl('p', { className: 'arena-card-line turret-race-detail', text: race.detail }) : null,
    uiEl('p', { className: 'arena-card-line turret-race-says', text: race.line }),
    uiArenaPaidLine(result.racePaid, 'turret-race-paid'),
  ];
  return lines.filter(Boolean);
}

export { AGAIN, uiRaceSpoken, uiRaceStamp, uiRaceTake, uiRaceOn, uiRaceStrip, uiRaceRule, uiRaceFinish, uiRaceCardLines };
