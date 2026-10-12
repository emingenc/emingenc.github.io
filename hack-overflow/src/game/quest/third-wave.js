const MOST_WATER_ID = 'most-water';
const NEXT_TALLER_ID = 'next-taller';
const THIRD_WAVE = Object.freeze({
[MOST_WATER_ID]:Object.freeze({
ask:'TWINS: Hold the most water. I count every move you make.',
done:'MOST WATER done: dam gauge',
}),
[NEXT_TALLER_ID]:Object.freeze({
ask:'BRACE: Four rounds. Pop a plate for a strictly taller one.',
done:'NEXT TALLER done: apron',
}),
});

export { MOST_WATER_ID,NEXT_TALLER_ID,THIRD_WAVE };
