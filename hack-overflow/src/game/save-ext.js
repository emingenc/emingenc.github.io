import { MAP_REV,clampMapRev } from './map-rev.js';

const EXT_VERSION = 1;
const EXT_RANK_MAX = 9999;
const EXT_ZAPS_MAX = 999;
const EXT_RAW_MAX_CHARS = 2048;

function createExt() {
return { v:EXT_VERSION,anchor:false,rank:0,opening:false,assist:null,mapRev:MAP_REV,zaps:0 };
}
function clampRank(value) {
return Number.isFinite(value) ? Math.min(EXT_RANK_MAX,Math.max(0,Math.floor(value))) :0;
}
function clampZaps(value) {
return Number.isFinite(value) ? Math.min(EXT_ZAPS_MAX,Math.max(0,Math.floor(value))) :0;
}
function assistOf(value) {
return value === true || value === false ? value :null;
}
function parsedRecord(raw) {
if (typeof raw !== 'string' || raw.length > EXT_RAW_MAX_CHARS) return null;
try {
const data = JSON.parse(raw);
return typeof data === 'object' && data !== null && !Array.isArray(data) && data.v === EXT_VERSION ? data :null;
} catch (error) {
return null;
}
}
function parseExt(raw) {
const data = parsedRecord(raw);
if (!data) return createExt();
return { v:EXT_VERSION,anchor:Boolean(data.anchor),rank:clampRank(data.rank),opening:Boolean(data.opening),assist:assistOf(data.assist),mapRev:clampMapRev(data.mapRev),zaps:clampZaps(data.zaps) };
}
function extMapRev(raw) {
const data = parsedRecord(raw);
return clampMapRev(data && data.mapRev);
}
function withRank(ext,gain) {
const added = Number.isFinite(gain) ? Math.max(0,gain) :0;
return { ...ext,rank:clampRank(ext.rank + added) };
}
function withZap(ext) {
return { ...ext,zaps:clampZaps(clampZaps(ext.zaps) + 1) };
}
function withMapRev(ext) {
return { ...ext,mapRev:MAP_REV };
}
function markOpeningDone(ext) {
return { ...ext,opening:true };
}
function withAssist(ext,on) {
return { ...ext,assist:assistOf(on) };
}
function reconcileExt(ext,state) {
if (state.mainHasProgress && !ext.anchor) return { ext:{ ...ext,anchor:true },changed:true };
if (!state.mainHasProgress && ext.anchor) return { ext:createExt(),changed:true };
return { ext,changed:false };
}

export { EXT_VERSION, EXT_RANK_MAX, createExt, parseExt, extMapRev, withRank, withZap, markOpeningDone, withAssist, withMapRev, reconcileExt };
