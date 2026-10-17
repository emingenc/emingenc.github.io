const FIRE_HOLD_TOUCH = 'the A button';
const FIRE_HOLD_KEYS = 'F';

function fireHold(coarse) {
return coarse ? FIRE_HOLD_TOUCH :FIRE_HOLD_KEYS;
}

export { fireHold };
