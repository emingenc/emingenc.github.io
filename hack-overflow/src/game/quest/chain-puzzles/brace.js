import { TONE,cell,doneCounter,fresh,idle,moved,opens,slipped,solved } from './common.js';

const FRAMES = Object.freeze(['report()','log_err()','walls[9]','reseal()','main()']);
const CULPRIT = 2;
const PAR = 3;
const TITLE = 'BRACE · CRASH TRACE';

function start() {
return fresh({ popped:0 });
}
function tap(state,index) {
const left = FRAMES.length - state.popped;
if (!opens(state,index,left)) return idle(state);
if (index > 0) return slipped(state,'pop',FRAMES[state.popped] + ' sits on top: open it first');
const patch = { moves:state.moves + 1 };
if (state.popped === CULPRIT) return solved(state,patch,FRAMES[CULPRIT] + ' is past the end. That is the bad call.');
return moved(state,{ ...patch,popped:state.popped + 1 },'Popped ' + FRAMES[state.popped]);
}
function view(state) {
const cells = FRAMES.slice(state.popped).map((frame,at) => {
if (state.finished && at === 0) return cell(frame,TONE.good);
return cell(frame,at === 0 ? TONE.lit :TONE.plain);
});
const status = state.finished ? doneCounter('pops',state.moves,PAR) :'pops ' + state.moves + ' (par ' + PAR + ')';
return { title:TITLE,caption:'IndexError at walls[9]. Pop down to that call.',cells,counter:state.note || status };
}

export { FRAMES,CULPRIT,PAR,start,tap,view };
