import { registerActorKind } from './actors.js';

const PATROL_PERIOD = 3;
const PATROL_HP = 2;
const PATROL_DAMAGE = 1;
const LEAD_AT = 1;
const TRAIL_AT = 0;

function standing(patrol,at) {
const cell = patrol.lane[at];
return { ...patrol,at,col:cell.col,row:cell.row };
}
function createPatrol(spec) {
const home = { at:spec.at || 0,dir:spec.dir || 1 };
const hp = spec.hp ?? PATROL_HP;
const patrol = { id:spec.id,kind:'patrol',lane:spec.lane,...home,col:0,row:0,hp,maxHp:hp,beat:PATROL_PERIOD,awake:true,home };
return standing(patrol,home.at);
}
function createPatrolPair(spec) {
return [createPatrol({ ...spec,id:spec.id + '-lead',at:LEAD_AT }),createPatrol({ ...spec,id:spec.id + '-trail',at:TRAIL_AT })];
}
function moves(patrol) {
return patrol.lane.length > 1;
}
function heading(patrol) {
const ahead = patrol.at + patrol.dir;
return ahead >= 0 && ahead < patrol.lane.length ? patrol.dir :-patrol.dir;
}
function sameCell(one,other) {
return Boolean(other) && one.col === other.col && one.row === other.row;
}
function sweep(patrol,hero) {
if (!moves(patrol)) return { actor:{ ...patrol,beat:PATROL_PERIOD },hits:0 };
const dir = heading(patrol);
const next = patrol.lane[patrol.at + dir];
if (sameCell(next,hero)) return { actor:{ ...patrol,dir:-dir,beat:PATROL_PERIOD },hits:PATROL_DAMAGE };
return { actor:{ ...standing(patrol,patrol.at + dir),dir,beat:PATROL_PERIOD },hits:0 };
}
function tickPatrol(patrol,hero) {
if (patrol.beat > 1) return { actor:{ ...patrol,beat:patrol.beat - 1 },hits:0 };
return sweep(patrol,hero);
}
registerActorKind('patrol',{
tick:tickPatrol,
intent:(patrol) => ({ verb:'sweeps',inTicks:patrol.beat }),
rearm:(patrol,arm) => ({ ...standing(patrol,patrol.home.at),dir:patrol.home.dir,beat:arm }),
});

export { PATROL_PERIOD, PATROL_HP, PATROL_DAMAGE, createPatrol, createPatrolPair };
