
function cloneState(state) {
return Object.assign({},state,{ stack:state.stack.slice(),results:state.results.slice(),ans:state.ans.slice(),answers:state.answers.slice() });
}
function endVolley(state,result) {
state.results.push(result);
state.vi += 1;
state.gi = 0;
state.stack = [];
if (state.vi >= state.wave.length) state.status = 'won';
}
function outcome(state,extra) {
state.last = Object.assign({ kind:'',glyph:'',points:0,depth:state.stack.length,why:'' },extra);
}

export { cloneState,endVolley,outcome };
