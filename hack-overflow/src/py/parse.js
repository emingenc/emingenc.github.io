import { tokenize, TOKEN_TYPES, current, advance, atKeyword, atType, atOp, expectType, expectOp, expectKeyword, parseFail, nodeAt } from './lex.js';
import { parseTest, parseTestListStarExpr, parseExprListTarget } from './expr.js';

function isSimpleTarget(node) {
return node.type === 'Name' || node.type === 'Subscript';
}
function targetFail(node,message) {
parseFail(node,message);
}
function validateSimpleElement(element) {
if (element.type === 'Starred') { validateSimpleElement(element.value); return; }
if (!isSimpleTarget(element)) targetFail(element,`cannot assign to ${element.type}`);
}
function validateTarget(node) {
if (node.type === 'Tuple') {
const starCount = node.elts.filter((element) => element.type === 'Starred').length;
if (starCount > 1) targetFail(node,'multiple starred expressions in assignment');
node.elts.forEach(validateSimpleElement);
return node;
}
if (!isSimpleTarget(node)) targetFail(node,`cannot assign to ${node.type}`);
return node;
}
function validateAnnTarget(node) {
if (node.type === 'Tuple') targetFail(node,'only single target (not tuple) can be annotated');
if (!isSimpleTarget(node)) targetFail(node,'illegal target for annotation');
}
function validateAugTarget(node) {
if (!isSimpleTarget(node)) targetFail(node,'illegal target for augmented assignment');
}
function parseStatementsUntil(parser,endType) {
const statements = [];
while (current(parser).type !== endType) statements.push(parseStatement(parser));
return statements;
}
function parseStatement(parser) {
const tok = current(parser);
const compound = tok.type === TOKEN_TYPES.NAME ? COMPOUND_STATEMENTS[tok.value] :undefined;
return compound ? compound(parser) :parseSimpleLine(parser);
}
function parseSuite(parser) {
if (!atType(parser,TOKEN_TYPES.NEWLINE)) return [parseSimpleLine(parser)];
advance(parser);
expectType(parser,TOKEN_TYPES.INDENT);
const body = parseStatementsUntil(parser,TOKEN_TYPES.DEDENT);
expectType(parser,TOKEN_TYPES.DEDENT);
return body;
}
function parseOptionalElse(parser) {
if (!atKeyword(parser,'else')) return [];
advance(parser);
expectOp(parser,':');
return parseSuite(parser);
}
function parseParamList(parser) {
expectOp(parser,'(');
const params = [];
while (!atOp(parser,')')) {
params.push(expectType(parser,TOKEN_TYPES.NAME).value);
if (atOp(parser,',')) advance(parser);
}
advance(parser);
return params;
}
function parseFunctionDef(parser) {
const start = current(parser);
advance(parser);
const name = expectType(parser,TOKEN_TYPES.NAME).value;
const params = parseParamList(parser);
expectOp(parser,':');
const body = parseSuite(parser);
return nodeAt(start,{ type:'FunctionDef',name,params,body });
}
function parseForStmt(parser) {
const start = current(parser);
advance(parser);
const target = validateTarget(parseExprListTarget(parser));
expectKeyword(parser,'in');
const iterable = parseTestListStarExpr(parser);
expectOp(parser,':');
const body = parseSuite(parser);
return nodeAt(start,{ type:'For',target,iterable,body,orelse:parseOptionalElse(parser) });
}
function parseWhileStmt(parser) {
const start = current(parser);
advance(parser);
const test = parseTest(parser);
expectOp(parser,':');
const body = parseSuite(parser);
return nodeAt(start,{ type:'While',test,body,orelse:parseOptionalElse(parser) });
}
function parseElifClause(parser) {
const start = current(parser);
advance(parser);
const test = parseTest(parser);
expectOp(parser,':');
const body = parseSuite(parser);
return [nodeAt(start,{ type:'If',test,body,orelse:parseElifOrElse(parser) })];
}
function parseElifOrElse(parser) {
return atKeyword(parser,'elif') ? parseElifClause(parser) :parseOptionalElse(parser);
}
function parseIfStmt(parser) {
const start = current(parser);
advance(parser);
const test = parseTest(parser);
expectOp(parser,':');
const body = parseSuite(parser);
return nodeAt(start,{ type:'If',test,body,orelse:parseElifOrElse(parser) });
}
const COMPOUND_STATEMENTS = { def:parseFunctionDef,for:parseForStmt,while:parseWhileStmt,if:parseIfStmt };
const AUG_ASSIGN_OPS = new Set(['+=','-=','*=','//=','%=']);
function parseSimpleLine(parser) {
const statement = parseSimpleStatement(parser);
expectType(parser,TOKEN_TYPES.NEWLINE);
return statement;
}
function parseSimpleStatement(parser) {
if (atKeyword(parser,'return')) return parseReturnStmt(parser);
return parseExprLedStatement(parser);
}
function parseReturnStmt(parser) {
const start = current(parser);
advance(parser);
const value = atType(parser,TOKEN_TYPES.NEWLINE) ? null :parseTestListStarExpr(parser);
return nodeAt(start,{ type:'Return',value });
}
function parseExprLedStatement(parser) {
const start = current(parser);
const first = parseTestListStarExpr(parser);
if (atOp(parser,':')) return parseAnnAssign(parser,start,first);
if (atOp(parser,'=')) return parseAssign(parser,start,first);
const tok = current(parser);
if (tok.type === TOKEN_TYPES.OP && AUG_ASSIGN_OPS.has(tok.value)) return parseAugAssign(parser,start,first);
return nodeAt(start,{ type:'ExprStmt',value:first });
}
function parseAssign(parser,start,first) {
const targets = [];
let group = first;
while (atOp(parser,'=')) {
advance(parser);
targets.push(validateTarget(group));
group = parseTestListStarExpr(parser);
}
return nodeAt(start,{ type:'Assign',targets,value:group });
}
function parseAnnValue(parser) {
advance(parser);
return parseTestListStarExpr(parser);
}
function parseAnnAssign(parser,start,target) {
validateAnnTarget(target);
advance(parser);
const annotation = parseTest(parser);
const value = atOp(parser,'=') ? parseAnnValue(parser) :null;
return nodeAt(start,{ type:'AnnAssign',target,annotation,value });
}
function parseAugAssign(parser,start,target) {
validateAugTarget(target);
const op = current(parser).value;
advance(parser);
const value = parseTestListStarExpr(parser);
return nodeAt(start,{ type:'AugAssign',target,op,value });
}
function runParser(tokens) {
try {
const body = parseStatementsUntil({ tokens,pos:0 },TOKEN_TYPES.ENDMARKER);
return { ok:true,body };
} catch (caught) {
return { ok:false,line:caught.line,col:caught.col,message:caught.message };
}
}
function parseModule(source) {
const lexed = tokenize(source);
if (lexed.error) return { ok:false,line:lexed.error.line,col:lexed.error.col,message:lexed.error.message };
return runParser(lexed.tokens);
}
function chipStartColumns(chips,indent) {
const columns = [];
let offset = indent;
for (const chip of chips) {
columns.push(offset);
offset += chip.length + 1;
}
return columns;
}
function chipIndexForColumn(chips,indent,col) {
const columns = chipStartColumns(chips,indent);
for (let index = columns.length - 1; index >= 0; index -= 1) {
if (col >= columns[index]) return index;
}
return 0;
}
function parseProgram(options) {
const result = parseModule(options.source);
if (result.ok) return result;
if (result.line !== options.slotLine) return { ok:false,chip:options.chips.length - 1,message:result.message };
return { ok:false,chip:chipIndexForColumn(options.chips,options.indent,result.col),message:result.message };
}

export { parseModule, parseProgram };
