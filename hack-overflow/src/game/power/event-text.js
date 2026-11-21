
const CARDS = Object.freeze({
ambush:Object.freeze({
id:'event-ambush',label:'START',
goal:'Tag all three foes, then RECALL ALL.',
buttons:'A tags the foe you aim at. RECALL ALL and STAND DOWN sit on the strip.',
ends:'All three foes down, STAND DOWN, or you go down. TAGS n/3 counts your tags. Foes act when you step.',
}),
volley:Object.freeze({
id:'event-volley',label:'START',
goal:'Answer each glyph the drone reads. Block both volleys.',
buttons:'PUSH, POP and REJECT (hold) sit on the strip, with STAND DOWN.',
ends:'Both volleys blocked, STAND DOWN, or you go down. VOLLEY n/2 counts the blocked ones. A wrong move costs a heart.',
}),
});
const PLURAL_ONE = 1;

function stepsWord(steps) {
return steps + (steps === PLURAL_ONE ? ' step' :' steps');
}
function eventCard(kind) {
const card = CARDS[kind];
return { id:card.id,label:card.label,lines:[{ who:kind.toUpperCase(),text:'GOAL: ' + card.goal + ' BUTTONS: ' + card.buttons + ' ENDS: ' + card.ends }] };
}
function eventLine(kind,count) {
if (kind === 'ambush') return 'AMBUSH · TAGS ' + count.done + '/' + count.total + ' · then RECALL ALL';
return 'VOLLEY · ' + count.done + '/' + count.total + ' blocked · PUSH, POP, hold REJECT';
}
const ENDS = Object.freeze({
ambush:Object.freeze({
clear:(steps,pay) => 'Ambush over: all three foes down in ' + stepsWord(steps) + '. +' + pay + ' R.',
standDown:() => 'Ambush over: you stood down.',
revive:() => 'Ambush over: you went down.',
}),
volley:Object.freeze({
clear:(steps,pay) => 'Volley over: both volleys blocked. +' + pay + ' R.',
standDown:() => 'Volley over: you stood down.',
revive:() => 'Volley over: you went down.',
shot:() => 'Volley over: the drone is down.',
}),
});
function endLine(kind,cause,detail = {}) {
return ENDS[kind][cause](detail.steps ?? 0,detail.pay ?? 0);
}
const FLOOD_CAUSES = Object.freeze({
time:(info) => info.name + ' over: ' + info.seconds + ' s up.',
rewrites:(info) => info.name + ' over: ' + info.rewrites + ' rewrites got through.',
spent:(info) => info.name + ' over: no bits left.',
});
function clockEndHead(cause,info) {
return FLOOD_CAUSES[cause](info);
}

export { eventCard,eventLine,endLine,clockEndHead };
