import { hasFind,questState } from '../game/ext/ops.js';
import { MIRROR } from '../game/power/mirror.js';
import { usablePowers } from '../game/power/powers.js';
import { MIRROR_QUEST,mirrorQuestEvent,mirrorQuestStarts } from '../game/walk/mirror-quest.js';
import { uiBeginQuest,uiQuestPaint,uiQuestSay } from './grid-quest-kit.js';
import { uiDrawMirrorSign } from './quest-mirror-draw.js';
import { uiQuestEvent } from './quest-run.js';

const POWER_ID = 'pincer';
const queues = new WeakMap();
const painted = new WeakSet();

function uiOpened(app) {
const game = app.game;
const view = { usable:usablePowers(game.progress.won,game.ext).includes(POWER_ID),solved:hasFind(game.ext,MIRROR.find),stage:questState(game.ext,MIRROR_QUEST.id) };
return mirrorQuestStarts(view);
}
function uiPaintOnce(app) {
const gen = app.game.gen;
if (painted.has(gen)) return;
painted.add(gen);
uiQuestPaint(app,uiDrawMirrorSign);
}
async function uiRun(app,kind) {
if (kind === 'open') {
uiPaintOnce(app);
if (uiOpened(app) && await uiBeginQuest(app,MIRROR_QUEST.id)) uiQuestSay(app,MIRROR_QUEST.start).catch(console.error);
return;
}
const event = mirrorQuestEvent(kind);
if (!event) return;
const result = await uiQuestEvent(app,MIRROR_QUEST.id,event);
if (result.done) uiQuestSay(app,MIRROR_QUEST.done).catch(console.error);
}
function uiMirrorQuest(app,kind) {
const game = app.game;
const next = (queues.get(game) || Promise.resolve()).then(() => uiRun(app,kind)).catch(console.error);
queues.set(game,next);
return next;
}

export { uiMirrorQuest };
