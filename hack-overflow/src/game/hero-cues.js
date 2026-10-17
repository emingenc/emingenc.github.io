const HERO_CUES = {
RANK_UP:{ type:'arpeggio',wave:'sine',notes:{ first:440,second:554.37,third:659.25,fourth:880 },durationMs:170,stepMs:90,motion:false },
POWER:{ type:'arpeggio',wave:'sine',notes:{ first:587.33,second:880 },durationMs:150,stepMs:100,motion:false },
FUSION:{ type:'arpeggio',wave:'triangle',notes:{ first:659.25,second:830.61,third:987.77 },durationMs:140,stepMs:80,motion:false },
FIND:{ type:'tone',wave:'sine',freq:1318.5,durationMs:130,motion:false },
ROOT_PHASE:{ type:'sweep',wave:'sine',freq:120,sweepTo:45,durationMs:320,motion:true },
ROOT_ACCESS:{ type:'chord',wave:'triangle',notes:{ root:130.81,fifth:196,third:329.63,octave:523.25 },durationMs:1400,motion:false },
};
const AMBIENT_OSCILLATORS = [
{ type:'sine',freq:55,gain:0.5 },
{ type:'sine',freq:55.4,gain:0.4 },
{ type:'triangle',freq:82.41,gain:0.18 },
];
const AMBIENT_TREMOLO_HZ = 0.12;

function cuesAllowed(cueName,state) {
if (!Object.hasOwn(HERO_CUES,cueName)) return false;
const { wanted,soundOn,reducedMotion } = state || {};
if (!wanted || !soundOn) return false;
return !(HERO_CUES[cueName].motion && reducedMotion);
}
function ambientPlan(reducedMotion) {
return { oscillators:AMBIENT_OSCILLATORS.map((osc) => ({ ...osc })),tremoloHz:reducedMotion === true ? 0 :AMBIENT_TREMOLO_HZ };
}

export { HERO_CUES,ambientPlan,cuesAllowed };
