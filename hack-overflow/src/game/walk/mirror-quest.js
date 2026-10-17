import { STAGE } from '../quest/quests.js';

const MIRROR_QUEST = Object.freeze({
id:'mirror-sign',
start:'TWINS: First pair that differs ends it.',
done:'TWINS: You moved both pointers. Take a pin.',
});
const EVENTS = { match:{ kind:'slip' },mismatch:{ kind:'progress' } };

function mirrorQuestEvent(kind) {
return Object.hasOwn(EVENTS,kind) ? { ...EVENTS[kind] } :null;
}
function mirrorQuestStarts(view) {
return view.usable && !view.solved && view.stage < STAGE.active;
}

export { MIRROR_QUEST,mirrorQuestEvent,mirrorQuestStarts };
