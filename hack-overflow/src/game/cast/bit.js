import { WALK_FEEL } from '../tween.js';

const SCAN_TOAST = '+1 HP per tick. It heals faster than you hit.';
const CHECKED_TOAST = 'You checked!';
const DRAG_TOAST = 'BIT: Too risky! Back to the bench!';
const MS_PER_CELL = 40;
const DRAG_MIN_MS = 400;
const DRAG_MAX_MS = 900;

function cellsApart(from,to) {
return Math.max(Math.abs(from.col - to.col),Math.abs(from.row - to.row));
}
function dragTween(from,to,clock) {
const ms = Math.min(DRAG_MAX_MS,Math.max(DRAG_MIN_MS,cellsApart(from,to) * MS_PER_CELL,WALK_FEEL.stepMs));
return { from,to,start:clock.now,until:clock.now + ms,glideMs:clock.reducedMotion ? 0 :ms,curve:'ease',stride:0 };
}

export { SCAN_TOAST,CHECKED_TOAST,DRAG_TOAST,DRAG_MAX_MS,dragTween };
