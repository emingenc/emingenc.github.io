
const BEST_MAX = { score:999999,combo:999,stars:3,drones:9999 };
const BEST_MODES = { turret:['w1','w2','w3','overflow'],shield:['w1','w2','w3'],pincer:['w1','w2','w3'],beam:['w1','w2','w3'],net:['w2','w3'] };
const FIELDS = Object.keys(BEST_MAX);

function isRecord(value) {
return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function clampField(value,max) {
return Number.isFinite(value) ? Math.min(max,Math.max(0,Math.floor(value))) :0;
}
function runOf(raw) {
const source = isRecord(raw) ? raw :{};
return Object.fromEntries(FIELDS.map((field) => [field,clampField(source[field],BEST_MAX[field])]));
}
function modesOf(raw,modes) {
const source = isRecord(raw) ? raw :{};
return Object.fromEntries(modes.filter((mode) => isRecord(source[mode])).map((mode) => [mode,runOf(source[mode])]));
}
function bestOf(raw) {
const source = isRecord(raw) ? raw :{};
const rooms = Object.keys(BEST_MODES).map((room) => [room,modesOf(source[room],BEST_MODES[room])]);
return Object.fromEntries(rooms.filter(([,modes]) => Object.keys(modes).length > 0));
}
function bestPart(raw) {
const best = bestOf(raw);
return Object.keys(best).length > 0 ? { best } :{};
}
function bestIn(ext,room,mode) {
const rooms = isRecord(ext && ext.best) ? ext.best :{};
return runOf(isRecord(rooms[room]) ? rooms[room][mode] :null);
}
function withBest(ext,where,run) {
const { room,mode } = where;
const before = bestIn(ext,room,mode);
const next = runOf(run);
const merged = Object.fromEntries(FIELDS.map((field) => [field,Math.max(before[field],next[field])]));
const rooms = isRecord(ext.best) ? ext.best :{};
return { ...ext,best:{ ...rooms,[room]:{ ...(isRecord(rooms[room]) ? rooms[room] :{}),[mode]:merged } } };
}
function bestGain(ext,where,run) {
const before = bestIn(ext,where.room,where.mode);
const next = runOf(run);
return { score:next.score > before.score,stars:next.stars > before.stars };
}

export { BEST_MODES,bestOf,bestPart,bestIn,withBest,bestGain };
