const COACH_MAX_CHARS = 60;
const COACH_LINES = {
full:{
touch:"Red square = a mite's next step. Tap ◆ to wait, A to zap.",
keys:"Red square = a mite's next step. Enter waits, F zaps.",
},
short:{
touch:'Tap ◆ to wait. A zaps a mite up close.',
keys:'Enter waits. F zaps a mite up close.',
},
};
const DANGER_HINT = 'A mite steps there next. Wait for a gap, or press again to go anyway.';
const WAIT_TEXT = 'You wait. The mites move.';

function sentryCoachLine(told,coarse) {
return COACH_LINES[told ? 'short' :'full'][coarse ? 'touch' :'keys'];
}

export { COACH_MAX_CHARS,DANGER_HINT,WAIT_TEXT,sentryCoachLine };
