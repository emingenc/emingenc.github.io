import { uiEl } from './dom.js';


const PENDING = '?';

function uiAnswerText(answer) {
  return answer === null || answer === undefined ? PENDING : String(answer);
}
function uiShieldHeightPlate(plate) {
  const { height, index, top } = plate;
  return uiEl('span', {
    className: 'shield-plate is-height is-h' + height + (top ? ' is-top' : ''), text: height,
    attrs: { role: 'listitem', 'aria-label': 'Plate height ' + height + ', tower ' + (index + 1) + (top ? ', top' : '') },
  });
}
function uiShieldColumn(state, index) {
  const height = state.wave[state.vi][index];
  const mode = index < state.gi ? ' is-done' : index === state.gi ? ' is-now' : '';
  const waiting = state.stack.includes(index) ? ' is-waiting' : '';
  const answer = uiAnswerText(state.ans[index]);
  const glyph = uiEl('span', { className: 'shield-glyph is-height' + mode + waiting, text: height, attrs: { 'aria-hidden': 'true' } });
  const cell = uiEl('span', { className: 'shield-ans' + (state.ans[index] === null ? '' : ' is-set'), text: answer, attrs: { 'aria-hidden': 'true' } });
  return uiEl('span', {
    className: 'shield-col', children: [glyph, cell],
    attrs: { role: 'listitem', 'aria-label': 'Tower ' + (index + 1) + ', height ' + height + ', answer ' + answer },
  });
}
function uiShieldTowersLane(state) {
  const volley = state.wave[state.vi] ?? '';
  const columns = [...volley].map((unused, index) => uiShieldColumn(state, index));
  return uiEl('div', { className: 'shield-lane is-towers', attrs: { role: 'list', 'aria-label': 'Towers and their answers' }, children: columns });
}

export { uiShieldHeightPlate, uiShieldTowersLane };
