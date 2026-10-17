import { JOBS_LINE,TALLY_WHO } from '../cast/tally.js';
import { questState,withPin,withQuest } from '../ext/ops.js';
import { abandonQuest,QUESTS,STAGE } from './quests.js';
import { QUEST_ID as ANAGRAM_ID } from '../walk/anagram.js';
import { DOUBLE_BILLED_ID } from '../walk/double-billed.js';

const STATUS = Object.freeze({ open:'OPEN',taken:'TAKEN',done:'DONE',wave:'IN THE WAVE' });
const TURRET_DOOR = Object.freeze({ col:41,row:15 });
const BINS_SPOT = Object.freeze({ col:23,row:16 });
const SEP = ' . ';
const WAVE_HINT = 'Stack a repeat in wave 2. It ends by itself.';
const CHOICE = Object.freeze({ take:'take',takeGo:'take-go',go:'go',abandon:'abandon',back:'back',later:'later' });
const LABEL = Object.freeze({ take:'TAKE IT',takeGo:'TAKE + GO',go:'GO THERE',abandon:'ABANDON',back:'BACK',later:'NOT NOW' });
const MAX_JOB_CHOICES = 2;

function statusOf(ext,id) {
const stage = questState(ext,id);
if (stage === STAGE.done) return STATUS.done;
if (id === DOUBLE_BILLED_ID) return STATUS.wave;
return stage === STAGE.active ? STATUS.taken :STATUS.open;
}
function rowOf(ext,{ id,where }) {
const def = QUESTS[id];
return { id,label:def.name,giver:def.giver,par:def.need + ' ' + def.goal,status:statusOf(ext,id),where:{ ...where } };
}
function boardRows(ext) {
return [{ id:DOUBLE_BILLED_ID,where:TURRET_DOOR },{ id:ANAGRAM_ID,where:BINS_SPOT }].map((job) => rowOf(ext,job));
}
function boardSheet(rows) {
const useful = rows.filter((row) => row.status !== STATUS.done);
const shown = (useful.length ? useful :rows).slice(0,MAX_JOB_CHOICES);
const focused = shown.find((row) => row.status === STATUS.open || row.status === STATUS.taken) || shown[0];
const choices = [...shown.map((row) => ({ id:row.id,label:row.label + SEP + row.status,focus:row === focused })),{ id:CHOICE.later,label:LABEL.later,default:true }];
return { id:'tally-board',lines:[{ who:TALLY_WHO,text:JOBS_LINE }],choices };
}
function choiceOf(id,label) {
return { id,label };
}
function jobChoices(status) {
const back = { id:CHOICE.back,label:LABEL.back,default:true };
if (status === STATUS.open) return [choiceOf(CHOICE.take,LABEL.take),choiceOf(CHOICE.takeGo,LABEL.takeGo),back];
if (status === STATUS.taken) return [choiceOf(CHOICE.go,LABEL.go),choiceOf(CHOICE.abandon,LABEL.abandon),back];
return [choiceOf(CHOICE.back,LABEL.back)];
}
function jobSheet(row) {
const texts = [row.label + ': giver ' + row.giver + '. Par ' + row.par + '. ' + row.status + '.'];
if (row.status === STATUS.wave) texts.push(WAVE_HINT);
return { id:'tally-job',lines:texts.map((text) => ({ who:row.giver,text })),choices:jobChoices(row.status) };
}
function abandonOps(ext,id) {
const stage = questState(ext,id);
if (!Object.hasOwn(QUESTS,id) || abandonQuest({ id,stage }).stage === stage) return ext;
const back = withQuest(ext,id,STAGE.offered);
return back.pin === id ? withPin(back,null) :back;
}

export { STATUS,TURRET_DOOR,BINS_SPOT,CHOICE,boardRows,boardSheet,jobSheet,abandonOps };
