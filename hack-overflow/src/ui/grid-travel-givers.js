import { boardRows,STATUS } from '../game/quest/jobs-board.js';
import { uiSectorAt } from './grid-draw-tiles.js';
import { uiChainCellsOf,uiChainOwed } from './grid-chain.js';
import { uiQuestRoute } from './quest-travel.js';

const GIVER_PREFIX = 'giver-';
const TAG = Object.freeze({ lead:'CASE LEAD',job:'JOB' });

function uiGiverRow(app,spec) {
const dirs = uiQuestRoute(app,spec.cell);
if (!dirs) return null;
return { id:GIVER_PREFIX + spec.id,kind:'giver',label:spec.label,tag:spec.tag,sector:uiSectorAt(app.game.world,spec.cell),state:'lead',steps:dirs.length,cell:spec.cell };
}
function uiLeadSpecs(game) {
return uiChainOwed(game).map((step) => ({ id:'case-' + step.id,label:step.name,tag:TAG.lead,cell:uiChainCellsOf(step)[0] }));
}
function uiJobSpecs(game) {
return boardRows(game.ext).filter((job) => job.status === STATUS.taken).map((job) => ({ id:'job-' + job.id,label:job.label,tag:TAG.job,cell:job.where }));
}
function uiTravelGivers(app) {
const specs = [...uiLeadSpecs(app.game),...uiJobSpecs(app.game)];
return specs.map((spec) => uiGiverRow(app,spec)).filter((row) => row !== null);
}

export { GIVER_PREFIX,uiTravelGivers };
