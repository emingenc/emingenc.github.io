import { WORLD_MAP } from '../world-data.js';
import { LOG_LINE,dealSheetLines,heartsLost } from './ordeal.js';

const REGION = Object.freeze({ cols:13,rows:11 });
const WORLD = Object.freeze({ cols:WORLD_MAP[0].length,rows:WORLD_MAP.length });
const WAVE_COUNT = 3;
const WAVES = Object.freeze([
{ wave:1,dir:1,stepMs:180,hits:1,live:false },
{ wave:2,dir:-1,stepMs:140,hits:1,live:false },
{ wave:3,dir:1,stepMs:0,hits:0,live:true },
].map((wave) => Object.freeze(wave)));
const PATCH_WAVE = 2;
const PATCH = 'PATCH';
const LOG = 'LOG';
const BIT = 'BIT';
const WAVE_ONE_TEXT = 'Hold the line. Measure twice.';
const PATCH_CUT_TEXT = 'Keep BIT fed. He likes the—';

function spanAround(at,size,limit) {
const from = Math.max(0,Math.min(at - Math.floor(size / 2),limit - size));
return [from,Math.min(limit,from + size) - 1];
}
function waveOf(wave) {
return WAVES[wave - 1] || null;
}
function region(hero) {
const [fromCol,toCol] = spanAround(hero.col,REGION.cols,WORLD.cols);
const [minRow,maxRow] = spanAround(hero.row,REGION.rows,WORLD.rows);
return { fromCol,toCol,minRow,maxRow };
}
function waveColumns(wave,area) {
const found = waveOf(wave);
if (!found || found.live) return [];
const columns = Array.from({ length:area.toCol - area.fromCol + 1 },(blank,index) => area.fromCol + index);
return found.dir === 1 ? columns :columns.reverse();
}
function waveSteps(wave,area,reduced) {
const columns = waveColumns(wave,area).length;
return reduced ? Math.min(1,columns) :columns;
}
function waveFront(wave,step,area,reduced) {
const columns = waveColumns(wave,area);
if (!Number.isInteger(step) || step < 0 || step >= waveSteps(wave,area,reduced)) return null;
if (reduced) return { col:columns.at(-1),atMs:0 };
return { col:columns[step],atMs:step * waveOf(wave).stepMs };
}
function waveTouches(front,hero,area,reduced) {
if (!front || hero.row < area.minRow || hero.row > area.maxRow) return false;
return reduced ? hero.col >= area.fromCol && hero.col <= area.toCol :front.col === hero.col;
}
function waveHearts(wave,hearts) {
const found = waveOf(wave);
return found ? heartsLost(hearts,found.hits) :0;
}
function dragsPatch(wave) {
return wave === PATCH_WAVE;
}
function waveSheets(ghost) {
return {
hold:{ who:PATCH,text:WAVE_ONE_TEXT },
bubbles:[
{ who:PATCH,text:PATCH_CUT_TEXT,at:'patch' },
{ who:LOG,text:LOG_LINE,at:'hero' },
{ who:BIT,text:'He never opened it?',at:'hero' },
],
deal:{ id:'ordeal-deal',lines:dealSheetLines(ghost),choices:[{ id:'read',label:'SHOW ME',default:true }] },
};
}

export { REGION,WAVES,WAVE_COUNT,PATCH_WAVE,region,waveColumns,waveSteps,waveFront,waveTouches,waveHearts,dragsPatch,waveSheets };
