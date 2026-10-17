const ID_PATTERN = /^[a-z0-9-]{1,32}$/;
const LIMITS = { rank:9999,paid:48,finds:32,beats:128,met:16,quests:24,state:3,count:99,tags:6,trials:3,allies:4,held:24,chain:31,cosmetics:16,badges:8 };

function isId(value) {
return typeof value === 'string' && ID_PATTERN.test(value);
}
function isRecord(value) {
return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function clampInt(value,min,max) {
return Number.isFinite(value) ? Math.min(max,Math.max(min,Math.floor(value))) :min;
}
function idList(value,cap) {
return Array.isArray(value) ? [...new Set(value.filter(isId))].slice(-cap) :[];
}
function field(KEY,repair) {
return { KEY,repair,make:() => repair() };
}
const ids = (cap) => (value) => idList(value,cap);
const whole = (max) => (value) => clampInt(value,0,max);
const pick = (choices) => (value) => (choices.includes(value) ? value :null);
const isTrue = (value) => value === true;
function record(KEY,cleaners) {
return field(KEY,(value) => {
const data = isRecord(value) ? value :{};
return Object.fromEntries(Object.entries(cleaners).map(([name,clean]) => [name,clean(data[name])]));
});
}
const count = whole(LIMITS.count);
const quests = field('quests',(value) => {
const entries = Object.entries(isRecord(value) ? value :{}).filter(([id,state]) => isId(id) && Number.isFinite(state));
return Object.fromEntries(entries.slice(0,LIMITS.quests).map(([id,state]) => [id,clampInt(state,0,LIMITS.state)]));
});
const POWERS = ['lookup','pincer','plate','net'];
function table(KEY,cap,{ keep,clean }) {
return field(KEY,(value) => Object.fromEntries(Object.entries(isRecord(value) ? value :{}).filter(([id,item]) => keep(id) && clean(item) !== null).slice(0,cap).map(([id,item]) => [id,clean(item)])));
}
const upTo = (max) => (value) => (Number.isFinite(value) ? clampInt(value,0,max) :null);
const EXT_FIELDS = [
record('rank',{ r:whole(LIMITS.rank),paid:ids(LIMITS.paid) }),
field('finds',ids(LIMITS.finds)),
quests,
field('pin',(value) => (isId(value) ? value :null)),
record('ghost',{ first:pick(['go','check']),offered:count,trusted:count,verified:count,trustedWrong:count,flag:pick(['reviewed','merged']),base:count }),
record('npc',{ bruteHelped:isTrue,nullHome:isTrue }),
field('beats',ids(LIMITS.beats)),
field('met',ids(LIMITS.met)),
table('tags',LIMITS.tags,{ keep:isId,clean:(value) => (typeof value === 'string' && /^\d{1,2},\d{1,2}$/.test(value) ? value :null) }),
table('trials',POWERS.length,{ keep:(id) => POWERS.includes(id),clean:upTo(LIMITS.trials) }),
table('lends',LIMITS.allies,{ keep:isId,clean:upTo(LIMITS.count) }),
field('held',ids(LIMITS.held)),
field('chain',whole(LIMITS.chain)),
field('cosmetics',ids(LIMITS.cosmetics)),
field('badges',ids(LIMITS.badges)),
field('audio',pick(['on','silent'])),
];

function makeExtFields() {
return Object.fromEntries(EXT_FIELDS.map((field) => [field.KEY,field.make()]));
}
function repairExtFields(data) {
return Object.fromEntries(EXT_FIELDS.map((field) => [field.KEY,field.repair(data[field.KEY])]));
}

export { EXT_FIELDS,LIMITS,clampInt,isId,makeExtFields,repairExtFields };
