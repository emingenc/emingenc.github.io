import { LANES, MITE_RANGE } from './sentry-lanes.js';

const STRIKE_DAMAGE = 1;

function createMite(spec) {
const home = { at:spec.at || 0,dir:spec.dir || 1,rest:Boolean(spec.rest) };
return { id:spec.id,kind:'mite',path:spec.path,...home,hp:spec.hp,maxHp:spec.hp,home };
}
function isLive(mite) {
return mite.hp > 0;
}
function cellOf(mite) {
return { col:mite.path[mite.at].col,row:mite.path[mite.at].row };
}
function sameCell(one,other) {
return one.col === other.col && one.row === other.row;
}
function reach(mite,pos) {
return Math.max(Math.abs(mite.path[mite.at].col - pos.col),Math.abs(mite.path[mite.at].row - pos.row));
}
function heading(mite) {
const ahead = mite.at + mite.dir;
return ahead >= 0 && ahead < mite.path.length ? mite.dir : -mite.dir;
}
function moves(mite) {
return !mite.rest && mite.path.length > 1;
}
function miteNext(mite) {
if (!moves(mite)) return cellOf(mite);
const cell = mite.path[mite.at + heading(mite)];
return { col:cell.col,row:cell.row };
}
function advance(mite) {
if (mite.rest) return { ...mite,rest:false };
if (!moves(mite)) return mite;
const dir = heading(mite);
const at = mite.at + dir;
const end = at === 0 || at === mite.path.length - 1;
return { ...mite,at,dir,rest:end };
}
function strike(mite) {
return { ...mite,dir:-heading(mite),rest:true };
}
function awake(mite,avatar,range) {
return isLive(mite) && reach(mite,avatar) <= range;
}
function tickMites(mites,avatar,{ range = MITE_RANGE } = {}) {
const struck = mites.filter((mite) => awake(mite,avatar,range) && moves(mite) && sameCell(miteNext(mite),avatar));
const next = mites.map((mite) => {
if (!awake(mite,avatar,range)) return mite;
return struck.includes(mite) ? strike(mite) :advance(mite);
});
return { mites:next,hits:struck.length * STRIKE_DAMAGE,struck:struck.map((mite) => mite.id) };
}
function zapMite(mites,id,dmg) {
const target = mites.find((mite) => mite.id === id);
if (!target || !isLive(target)) return { mites,killed:false };
const hp = Math.max(0,target.hp - dmg);
return { mites:mites.map((mite) => (mite === target ? { ...mite,hp } :mite)),killed:hp === 0 };
}
function miteAt(mites,cell) {
return mites.find((mite) => isLive(mite) && sameCell(cellOf(mite),cell)) || null;
}
function dangerCells(mites,avatar,{ range = MITE_RANGE } = {}) {
return mites.filter((mite) => awake(mite,avatar,range) && moves(mite)).map(miteNext);
}
function resetMites(mites) {
return mites.map((mite) => ({ ...mite,...mite.home,hp:mite.maxHp }));
}
function mitesView(mites) {
return mites.map((mite) => ({ id:mite.id,kind:'mite',...cellOf(mite),hp:mite.hp,maxHp:mite.maxHp,awake:true,next:miteNext(mite),lane:mite.path }));
}
function sentryMites(lanes = LANES) {
return lanes.map(createMite);
}

export { createMite, miteNext, tickMites, zapMite, miteAt, dangerCells, resetMites, mitesView, sentryMites };
