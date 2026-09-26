import { parseModule } from '../py/parse.js';

function assembledSource(problem,text) {
const lines = problem.skeleton.map((line) => line.replace('{slot}',text));
return `${lines.join('\n')}\n`;
}
function compileLine(problem,text) {
const parsed = parseModule(assembledSource(problem,text));
return parsed.ok ? parsed.body[0] :null;
}
function slotLineOf(problem) {
return problem.skeleton.findIndex((line) => line.includes('{slot}')) + 1;
}

export { compileLine, slotLineOf, assembledSource };
