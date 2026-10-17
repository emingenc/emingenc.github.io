import { BENCH_ID,benchMark,benchPlan,benchProps } from '../game/cast/brute-bench.js';
import { uiShowToast } from './grid-toast.js';
import { uiPropGuard,uiQuestLive,uiQuestMarks } from './grid-quest-kit.js';
import { uiHooksOnce } from './grid-power.js';

const BENCH_RUNS = { countersign:function () { return import('./grid-brute-countersign.js').then(function (module) { return module.uiBruteCountersign; }); } };
const asking = new WeakSet();

function uiBenchTalks(app) {
const plan = benchPlan(app.game.ext);
if (plan.kind === 'fan') return import('./grid-brute-fan.js').then(function (fan) { return fan.uiBruteFan(app); });
if (plan.kind === 'talk' && BENCH_RUNS[plan.id]) return BENCH_RUNS[plan.id]().then(function (run) { return run(app); });
if (plan.kind === 'idle') uiShowToast(app,{ text:plan.text,kind:'info' });
return Promise.resolve();
}
async function uiBenchBump(info) {
const app = info.app;
const gen = app.game.gen;
if (!uiQuestLive(app) || !info.event || info.event.prop !== BENCH_ID || app.story || asking.has(gen)) return;
asking.add(gen);
try {
await uiBenchTalks(app);
} finally {
asking.delete(gen);
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
