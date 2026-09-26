import { TOKEN_TYPES, KEYWORDS, peek, current, advance, tokenIsKeyword, tokenIsOp, atKeyword, atOp, expectType, expectOp, parseFail, nodeAt, describeToken } from './lex.js';

function parseTest(parser) {
return parseOrTest(parser);
}
/**
 * `*expr` (PEP 448 iterable unpacking) wherever one comma-list item may be
 * starred: a tuple/list display element or a call argument. The evaluator
 * side (run-expr.js's evalList/evalTuple, run-call.js's evalArgs) spreads a
 * `Starred` node's iterable items into that position at run time.
 */
function parseStarrableTest(parser) {
if (!atOp(parser,'*')) return parseTest(parser);
const start = current(parser);
advance(parser);
return nodeAt(start,{ type:'Starred',value:parseTest(parser) });
}
/**
 * `*expr` is only meaningful spread into a real sequence (a list/tuple
 * display of 2+ items, a trailing-comma 1-tuple, or a call's argument list);
 * a *lone* `*expr` with nothing to spread into - bare grouping parens `(*x)`,
 * a bare statement `*x`, or an assignment side `y = *x` / `*x = y` - is a
 * CPython syntax error (verified live: each of those three shapes raises
 * SyntaxError). This parser's own syntax-error wording is never compared
 * against CPython's - porting CPython's exact SyntaxError text was
 * descoped (see judge-fixtures.test.js) - so only the outcome, not this
 * message, needs to match.
 */
function rejectBareStarred(node) {
if (node.type === 'Starred') parseFail(node,"can't use starred expression here");
return node;
}
function parseOrTest(parser) {
let node = parseAndTest(parser);
while (atKeyword(parser,'or')) {
advance(parser);
node = nodeAt(node,{ type:'BoolOp',op:'or',left:node,right:parseAndTest(parser) });
}
return node;
}
function parseAndTest(parser) {
let node = parseNotTest(parser);
while (atKeyword(parser,'and')) {
advance(parser);
node = nodeAt(node,{ type:'BoolOp',op:'and',left:node,right:parseNotTest(parser) });
}
return node;
}
function parseNotTest(parser) {
if (!atKeyword(parser,'not')) return parseComparison(parser);
const start = current(parser);
advance(parser);
return nodeAt(start,{ type:'UnaryNot',value:parseNotTest(parser) });
}
function parseIsTail(parser) {
advance(parser);
if (!atKeyword(parser,'not')) return 'is';
advance(parser);
return 'is not';
}
const COMPARE_OPS = new Set(['<','>','==','!=','<=','>=']);
function tryParseCompareOp(parser) {
const tok = current(parser);
if (tok.type === TOKEN_TYPES.OP && COMPARE_OPS.has(tok.value)) { advance(parser); return tok.value; }
if (atKeyword(parser,'in')) { advance(parser); return 'in'; }
if (atKeyword(parser,'not') && tokenIsKeyword(peek(parser,1),'in')) { advance(parser); advance(parser); return 'not in'; }
if (atKeyword(parser,'is')) return parseIsTail(parser);
return null;
}
function collectComparisons(parser,ops,comparators) {
let op = tryParseCompareOp(parser);
while (op !== null) {
ops.push(op);
comparators.push(parseArithExpr(parser));
op = tryParseCompareOp(parser);
}
}
function parseComparison(parser) {
const node = parseArithExpr(parser);
const ops = [];
const comparators = [];
collectComparisons(parser,ops,comparators);
return ops.length === 0 ? node :nodeAt(node,{ type:'Compare',left:node,ops,comparators });
}
const ADD_OPS = new Set(['+','-']);
function isOpIn(parser,opSet) {
const tok = current(parser);
return tok.type === TOKEN_TYPES.OP && opSet.has(tok.value);
}
function parseArithExpr(parser) {
let node = parseTerm(parser);
while (isOpIn(parser,ADD_OPS)) {
const op = current(parser).value;
advance(parser);
node = nodeAt(node,{ type:'BinOp',op,left:node,right:parseTerm(parser) });
}
return node;
}
const TERM_OPS = new Set(['*','//','%']);
function parseTerm(parser) {
let node = parseFactor(parser);
while (isOpIn(parser,TERM_OPS)) {
const op = current(parser).value;
advance(parser);
node = nodeAt(node,{ type:'BinOp',op,left:node,right:parseFactor(parser) });
}
return node;
}
function parseFactor(parser) {
if (atOp(parser,'-')) {
const start = current(parser);
advance(parser);
return nodeAt(start,{ type:'UnaryMinus',value:parseFactor(parser) });
}
if (atOp(parser,'+')) {
const start = current(parser);
advance(parser);
return nodeAt(start,{ type:'UnaryPlus',value:parseFactor(parser) });
}
return parsePower(parser);
}
function parsePower(parser) {
let node = parseAtom(parser);
while (startsTrailer(parser)) node = parseTrailer(parser,node);
return node;
}
function startsTrailer(parser) {
return atOp(parser,'.') || atOp(parser,'(') || atOp(parser,'[');
}
function parseTrailer(parser,node) {
if (atOp(parser,'.')) return parseAttributeTrailer(parser,node);
if (atOp(parser,'(')) return parseCallTrailer(parser,node);
return parseSubscriptTrailer(parser,node);
}
function parseAttributeTrailer(parser,node) {
advance(parser);
const name = expectType(parser,TOKEN_TYPES.NAME).value;
return nodeAt(node,{ type:'Attribute',object:node,name });
}
function tryParseKeywordArg(parser) {
const tok = current(parser);
if (tok.type !== TOKEN_TYPES.NAME || KEYWORDS.has(tok.value)) return null;
if (!tokenIsOp(peek(parser,1),'=')) return null;
advance(parser);
advance(parser);
return nodeAt(tok,{ type:'Keyword',name:tok.value,value:parseTest(parser) });
}
/**
 * A plain positional argument may never follow a keyword argument, but PEP
 * 448 carves out `*expr` unpacking: `f(x=1, *a)` and even `f(*a, x=1, *b)`
 * are valid CPython syntax (verified live) because iterable unpacking is not
 * itself a positional argument in the grammar's sense.
 */
function parseOneArgument(parser,positional,keyword) {
const asKeyword = tryParseKeywordArg(parser);
if (asKeyword) { keyword.push(asKeyword); return; }
const argument = parseStarrableTest(parser);
if (keyword.length > 0 && argument.type !== 'Starred') {
parseFail(current(parser),'positional argument follows keyword argument');
}
positional.push(argument);
}
function parseArgList(parser) {
const positional = [];
const keyword = [];
while (!atOp(parser,')')) {
parseOneArgument(parser,positional,keyword);
if (!atOp(parser,',')) break;
advance(parser);
}
return { positional,keyword };
}
function parseCallTrailer(parser,node) {
advance(parser);
const args = parseArgList(parser);
expectOp(parser,')');
return nodeAt(node,{ type:'Call',func:node,args:args.positional,keywords:args.keyword });
}
function sliceBoundEnds(parser) {
return atOp(parser,':') || atOp(parser,']') || atOp(parser,',');
}
function parseOptionalStep(parser) {
if (!atOp(parser,':')) return null;
advance(parser);
return sliceBoundEnds(parser) ? null :parseTest(parser);
}
function parseSliceFrom(parser,start,lower) {
advance(parser);
const upper = sliceBoundEnds(parser) ? null :parseTest(parser);
const step = parseOptionalStep(parser);
return nodeAt(start,{ type:'Slice',lower,upper,step });
}
function parseSubscriptItem(parser) {
const start = current(parser);
if (atOp(parser,':')) return parseSliceFrom(parser,start,null);
const first = parseTest(parser);
return atOp(parser,':') ? parseSliceFrom(parser,start,first) :first;
}
function parseSubscriptTrailer(parser,node) {
advance(parser);
const { parts,trailingComma } = parseCommaList(parser,']',parseSubscriptItem);
expectOp(parser,']');
const asTuple = parts.length > 1 || trailingComma;
const slice = asTuple ? nodeAt(node,{ type:'Tuple',elts:parts }) :parts[0];
return nodeAt(node,{ type:'Subscript',object:node,slice });
}
function parseNameConstant(parser) {
const tok = current(parser);
advance(parser);
return nodeAt(tok,{ type:'NameConstant',value:tok.value });
}
function parseNameAtom(parser) {
const tok = current(parser);
advance(parser);
return nodeAt(tok,{ type:'Name',id:tok.value });
}
function parseNumberAtom(parser) {
const tok = current(parser);
advance(parser);
return nodeAt(tok,{ type:'Num',value:Number(tok.value) });
}
function parseStringAtom(parser) {
const tok = current(parser);
advance(parser);
return nodeAt(tok,{ type:'Str',value:tok.value });
}
function parseParenForm(parser) {
const start = current(parser);
advance(parser);
if (atOp(parser,')')) { advance(parser); return nodeAt(start,{ type:'Tuple',elts:[] }); }
const { parts,trailingComma } = parseCommaList(parser,')',parseStarrableTest);
expectOp(parser,')');
if (parts.length === 1 && !trailingComma) return rejectBareStarred(parts[0]);
return nodeAt(start,{ type:'Tuple',elts:parts });
}
function parseListDisplay(parser) {
const start = current(parser);
advance(parser);
if (atOp(parser,']')) { advance(parser); return nodeAt(start,{ type:'List',elts:[] }); }
const { parts } = parseCommaList(parser,']',parseStarrableTest);
expectOp(parser,']');
return nodeAt(start,{ type:'List',elts:parts });
}
function parseDictEntry(parser,keys,values) {
keys.push(parseTest(parser));
expectOp(parser,':');
values.push(parseTest(parser));
}
function parseDictEntries(parser) {
const keys = [];
const values = [];
parseDictEntry(parser,keys,values);
while (atOp(parser,',')) {
advance(parser);
if (atOp(parser,'}')) break;
parseDictEntry(parser,keys,values);
}
return { keys,values };
}
function parseDictDisplay(parser) {
const start = current(parser);
advance(parser);
if (atOp(parser,'}')) { advance(parser); return nodeAt(start,{ type:'Dict',keys:[],values:[] }); }
const { keys,values } = parseDictEntries(parser);
expectOp(parser,'}');
return nodeAt(start,{ type:'Dict',keys,values });
}
const ATOM_KEYWORDS = new Set(['True','False','None']);
function parseAtom(parser) {
const tok = current(parser);
if (tok.type === TOKEN_TYPES.NAME && ATOM_KEYWORDS.has(tok.value)) return parseNameConstant(parser);
if (tok.type === TOKEN_TYPES.NAME && !KEYWORDS.has(tok.value)) return parseNameAtom(parser);
if (tok.type === TOKEN_TYPES.NUMBER) return parseNumberAtom(parser);
if (tok.type === TOKEN_TYPES.STRING) return parseStringAtom(parser);
if (atOp(parser,'(')) return parseParenForm(parser);
if (atOp(parser,'[')) return parseListDisplay(parser);
if (atOp(parser,'{')) return parseDictDisplay(parser);
return parseFail(tok,tok.value ? `unexpected token '${tok.value}'` : `unexpected ${describeToken(tok)}`);
}
function parseCommaList(parser,closer,parseItem) {
const parts = [parseItem(parser)];
let trailingComma = false;
while (atOp(parser,',')) {
advance(parser);
trailingComma = true;
if (atOp(parser,closer)) break;
parts.push(parseItem(parser));
trailingComma = false;
}
return { parts,trailingComma };
}
const TEST_START_KEYWORDS = new Set(['not','True','False','None']);
const TEST_START_OPS = new Set(['(','[','{','-','+']);
function canStartTest(token) {
if (token.type === TOKEN_TYPES.NAME) return TEST_START_KEYWORDS.has(token.value) || !KEYWORDS.has(token.value);
if (token.type === TOKEN_TYPES.NUMBER || token.type === TOKEN_TYPES.STRING) return true;
return token.type === TOKEN_TYPES.OP && TEST_START_OPS.has(token.value);
}
function wrapTestList(start,parts,trailingComma) {
if (parts.length === 1 && !trailingComma) return rejectBareStarred(parts[0]);
return nodeAt(start,{ type:'Tuple',elts:parts });
}
function canStartStarrableTest(token) {
return (token.type === TOKEN_TYPES.OP && token.value === '*') || canStartTest(token);
}
function parseTestListStarExpr(parser) {
const start = current(parser);
const parts = [parseStarrableTest(parser)];
let trailingComma = false;
while (atOp(parser,',')) {
advance(parser);
trailingComma = true;
if (!canStartStarrableTest(current(parser))) break;
parts.push(parseStarrableTest(parser));
trailingComma = false;
}
return wrapTestList(start,parts,trailingComma);
}
function parseExprListTarget(parser) {
const start = current(parser);
const parts = [parseArithExpr(parser)];
let trailingComma = false;
while (atOp(parser,',')) {
advance(parser);
trailingComma = true;
if (!canStartTest(current(parser))) break;
parts.push(parseArithExpr(parser));
trailingComma = false;
}
return wrapTestList(start,parts,trailingComma);
}

export { parseTest, parseTestListStarExpr, parseExprListTarget };
