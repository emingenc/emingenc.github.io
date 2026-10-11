import { createDrone } from '../actors.js';
import { hasBeat } from '../ext/ops.js';
import { createSentinel } from '../sentinel.js';
import { ownedPowers } from './powers.js';

const AMBUSH = Object.freeze({
trigger:Object.freeze({ col:44,row:15 }),
foes:Object.freeze([
Object.freeze({ id:'s1',kind:'sentinel',col:46,row:15 }),
Object.freeze({ id:'d1',kind:'drone',col:46,row:14 }),
Object.freeze({ id:'d2',kind:'drone',col:46,row:16 }),
]),
reward:30,
source:'ambush',
beat:'ambush',
});
const MAKERS = { sentinel:createSentinel,drone:createDrone };
const TEXT = {
start:'AMBUSH. S1 heals every tick. TAG all three, then RECALL ALL.',
clear:'Ambush clear. +' + AMBUSH.reward + ' RANK.',
standDown:'Stood down. The ambush breaks off.',
};

function ambushDue(ext,won,pos) {
const there = pos.col === AMBUSH.trigger.col && pos.row === AMBUSH.trigger.row;
return there && ownedPowers(won).includes('lookup') && !hasBeat(ext,AMBUSH.beat);
}
function standAmbush() {
return AMBUSH.foes.map((foe) => MAKERS[foe.kind]({ id:foe.id,col:foe.col,row:foe.row }));
}
function isAmbushId(id) {
return AMBUSH.foes.some((foe) => foe.id === id);
}
function withoutAmbush(actors) {
return actors.filter((actor) => !isAmbushId(actor.id));
}
function ambushState(actors) {
const mine = actors.filter((actor) => isAmbushId(actor.id));
if (mine.length < AMBUSH.foes.length) return 'gone';
return mine.some((actor) => actor.hp > 0) ? 'standing' :'clear';
}
function ambushText() {
return { ...TEXT };
}

export { AMBUSH,ambushDue,ambushState,ambushText,standAmbush,withoutAmbush };
