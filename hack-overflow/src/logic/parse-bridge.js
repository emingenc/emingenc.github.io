import { parseProgram } from '../py/parse.js';
import { assembledSource, slotLineOf } from '../judge/compile.js';
import { segmentIntoChips } from './line.js';

function slotIndentOf(problem) {
const slotLine = problem.skeleton.find((line) => line.includes('{slot}'));
return slotLine.indexOf('{slot}');
}
function parseCandidate(problem,text) {
const chips = segmentIntoChips(text,problem.palette);
if (!chips) return { ok:false,chip:null,message:'not built from this lock\'s chips' };
const result = parseProgram({
source:assembledSource(problem,text),
slotLine:slotLineOf(problem),
indent:slotIndentOf(problem),
chips,
});
if (result.ok) return { ok:true,chip:null,message:null };
return { ok:false,chip:result.chip,message:result.message };
}

export { parseCandidate };
