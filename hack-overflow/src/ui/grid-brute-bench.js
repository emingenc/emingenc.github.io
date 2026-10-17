import { BENCH_ID,benchMark,benchPlan,benchProps } from '../game/cast/brute-bench.js';
import { uiShowToast } from './grid-toast.js';
import { uiPropGuard,uiQuestLive,uiQuestMarks } from './grid-quest-kit.js';
import { uiHooksOnce } from './grid-power.js';

const BENCH_RUNS = { countersign:function () { return import('./grid-brute-countersign.js').then(function (module) { return module.uiBruteCountersign; }); } };
let asking = null;

function uiBenchTalks(app) {
const plan = benchPlan(app.game.ext);
if (plan.kind === 'fan') return import('./grid-brute-fan.js').then(function (fan) { return fan.uiBruteFan(app); });
if (plan.kind === 'talk' && BENCH_RUNS[plan.id]) return BENCH_RUNS[plan.id]().then(function (run) { return run(app); });
if (plan.kind === 'idle') uiShowToast(app,{ text:plan.text,kind:'info' });
return Promise.resolve();
}
function uiBenchDropped(app) {
if (!uiQuestLive(app)) return 'quest not live';
if (app.story) return 'a sheet is up';
if (asking === app.game.gen) return 'a question is in flight';
return '';
}
async function uiBenchBump(info) {
const app = info.app;
if (!info.event || info.event.prop !== BENCH_ID) return;
const dropped = uiBenchDropped(app);
if (dropped) {
console.debug('BRUTE bench: bump ignored, ' + dropped);
return;
}
const gen = app.game.gen;
asking = gen;
try {
await uiBenchTalks(app);
} finally {
if (asking === gen) asking = null;
}
}
const uiHookBench = uiHooksOnce({ bump:function (info) { uiBenchBump(info).catch(console.error); } });

function uiInstallBruteBench(app) {
uiPropGuard(app,function (gameApp) { return benchProps(gameApp.game.ext); });
uiQuestMarks(app,function (gameApp) { return [benchMark(gameApp.game.ext)].filter(Boolean); });
uiHookBench();
return app;
}

export { BENCH_RUNS,uiInstallBruteBench };
