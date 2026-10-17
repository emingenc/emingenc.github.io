const MOST_WATER_ID = 'most-water';
const NEXT_TALLER_ID = 'next-taller';
const CLEAR_STRETCH_W3_ID = 'clear-stretch-w3';
const THIRD_WAVE = Object.freeze({
[MOST_WATER_ID]:Object.freeze({
ask:'TWINS: Hold the most water. I count every move you make.',
done:'MOST WATER done: dam gauge',
}),
[NEXT_TALLER_ID]:Object.freeze({
ask:'BRACE: Four rounds. Pop a plate for a strictly taller one.',
done:'NEXT TALLER done: apron',
}),
[CLEAR_STRETCH_W3_ID]:Object.freeze({
ask:'SILL: Clear the stretch. Every shrink and jump is counted.',
done:'CLEAR STRETCH done: stretch tape',
}),
});

export { MOST_WATER_ID,NEXT_TALLER_ID,CLEAR_STRETCH_W3_ID,THIRD_WAVE };
