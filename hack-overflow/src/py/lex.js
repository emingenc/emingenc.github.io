const TOKEN_TYPES = {
NAME:'NAME',
NUMBER:'NUMBER',
STRING:'STRING',
OP:'OP',
NEWLINE:'NEWLINE',
INDENT:'INDENT',
DEDENT:'DEDENT',
ENDMARKER:'ENDMARKER',
};
const KEYWORDS = new Set([
'def','for','in','while','if','elif','else','return',
'and','or','not','is','True','False','None',
]);
const OPERATORS = [
'//=','%=','*=','==','!=','<=','>=','+=','-=','//','%',
'(',')','[',']','{','}',',',':','.','=','<','>','+','-','*',
];
const OPEN_BRACKETS = new Set(['(','[','{']);
const CLOSE_BRACKETS = new Set([')',']','}']);
function isDigitChar(ch) {
return ch >= '0' && ch <= '9';
}
function isNameStartChar(ch) {
return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}
function isNameChar(ch) {
return isNameStartChar(ch) || isDigitChar(ch);
}
function createLexer(source) {
return {
source,
pos:0,
line:1,
lineStart:0,
parenDepth:0,
indentStack:[0],
tokens:[],
error:null,
};
}
function currentChar(lexer) {
return lexer.source[lexer.pos];
}
function currentColumn(lexer) {
return lexer.pos - lexer.lineStart;
}
function topIndent(lexer) {
return lexer.indentStack[lexer.indentStack.length - 1];
}
function fail(lexer,message) {
if (!lexer.error) lexer.error = { line:lexer.line,col:currentColumn(lexer),message };
}
function advanceOverNewline(lexer) {
lexer.pos += 1;
lexer.line += 1;
lexer.lineStart = lexer.pos;
}
function pushToken(lexer,token) {
lexer.tokens.push({ line:lexer.line,col:token.col,type:token.type,value:token.value });
}
function measureLeadingSpaces(lexer) {
let count = 0;
while (currentChar(lexer) === ' ') {
lexer.pos += 1;
count += 1;
}
return count;
}
function handleLineStart(lexer) {
for (;;) {
const spaces = measureLeadingSpaces(lexer);
const ch = currentChar(lexer);
if (ch === undefined) return;
if (ch !== '\n') { applyIndent(lexer,spaces); return; }
advanceOverNewline(lexer);
}
}
function applyIndent(lexer,spaces) {
const top = topIndent(lexer);
if (spaces > top) { lexer.indentStack.push(spaces); pushToken(lexer,indentToken(lexer,TOKEN_TYPES.INDENT)); return; }
if (spaces < top) popDedents(lexer,spaces);
}
function popDedents(lexer,spaces) {
while (spaces < topIndent(lexer)) {
lexer.indentStack.pop();
pushToken(lexer,indentToken(lexer,TOKEN_TYPES.DEDENT));
}
if (spaces !== topIndent(lexer)) fail(lexer,'unindent does not match any outer indentation level');
}
function indentToken(lexer,type) {
return { type,value:'',col:currentColumn(lexer) };
}
function scanName(lexer) {
const col = currentColumn(lexer);
const start = lexer.pos;
while (isNameChar(currentChar(lexer))) lexer.pos += 1;
pushToken(lexer,{ type:TOKEN_TYPES.NAME,value:lexer.source.slice(start,lexer.pos),col });
}
function scanNumber(lexer) {
const col = currentColumn(lexer);
const start = lexer.pos;
while (isDigitChar(currentChar(lexer))) lexer.pos += 1;
const value = lexer.source.slice(start,lexer.pos);
if (value.length > 1 && value[0] === '0') { fail(lexer,'leading zeros in decimal integer literals are not permitted'); return; }
pushToken(lexer,{ type:TOKEN_TYPES.NUMBER,value,col });
}
function consumeStringChar(lexer) {
if (currentChar(lexer) !== '\\') { const ch = currentChar(lexer); lexer.pos += 1; return ch; }
lexer.pos += 1;
const escaped = currentChar(lexer);
lexer.pos += 1;
return escaped;
}
function scanString(lexer,quote) {
const col = currentColumn(lexer);
lexer.pos += 1;
let value = '';
while (currentChar(lexer) !== quote) {
if (currentChar(lexer) === undefined || currentChar(lexer) === '\n') { fail(lexer,'unterminated string literal'); return; }
value += consumeStringChar(lexer);
}
lexer.pos += 1;
pushToken(lexer,{ type:TOKEN_TYPES.STRING,value,col });
}
function matchOperator(lexer) {
for (const op of OPERATORS) {
if (lexer.source.startsWith(op,lexer.pos)) return op;
}
return null;
}
function scanOperator(lexer) {
const col = currentColumn(lexer);
const op = matchOperator(lexer);
if (op === null) { fail(lexer,`unexpected character '${currentChar(lexer)}'`); return; }
if (CLOSE_BRACKETS.has(op) && lexer.parenDepth === 0) { fail(lexer,`unmatched '${op}'`); return; }
pushToken(lexer,{ type:TOKEN_TYPES.OP,value:op,col });
lexer.pos += op.length;
if (OPEN_BRACKETS.has(op)) lexer.parenDepth += 1;
if (CLOSE_BRACKETS.has(op)) lexer.parenDepth -= 1;
}
function scanToken(lexer) {
const ch = currentChar(lexer);
if (ch === ' ') { lexer.pos += 1; return; }
if (isDigitChar(ch)) { scanNumber(lexer); return; }
if (isNameStartChar(ch)) { scanName(lexer); return; }
if (ch === "'" || ch === '"') { scanString(lexer,ch); return; }
scanOperator(lexer);
}
function endPhysicalLine(lexer) {
if (lexer.parenDepth === 0) pushToken(lexer,{ type:TOKEN_TYPES.NEWLINE,value:'',col:currentColumn(lexer) });
if (currentChar(lexer) === '\n') advanceOverNewline(lexer);
}
function scanLine(lexer) {
while (currentChar(lexer) !== undefined && currentChar(lexer) !== '\n') {
scanToken(lexer);
if (lexer.error) return;
}
endPhysicalLine(lexer);
}
function finishTokens(lexer) {
if (lexer.error) return;
if (lexer.parenDepth > 0) { fail(lexer,'bracket was never closed'); return; }
while (topIndent(lexer) > 0) {
lexer.indentStack.pop();
pushToken(lexer,indentToken(lexer,TOKEN_TYPES.DEDENT));
}
pushToken(lexer,indentToken(lexer,TOKEN_TYPES.ENDMARKER));
}
function tokenize(source) {
const lexer = createLexer(source);
while (currentChar(lexer) !== undefined && !lexer.error) {
if (lexer.parenDepth === 0) handleLineStart(lexer);
if (lexer.error || currentChar(lexer) === undefined) break;
scanLine(lexer);
}
finishTokens(lexer);
return { tokens:lexer.tokens,error:lexer.error };
}
function peek(parser,ahead) {
return parser.tokens[parser.pos + ahead];
}
function current(parser) {
return peek(parser,0);
}
function advance(parser) {
parser.pos += 1;
}
function tokenIsKeyword(token,word) {
return token !== undefined && token.type === TOKEN_TYPES.NAME && token.value === word;
}
function tokenIsOp(token,value) {
return token !== undefined && token.type === TOKEN_TYPES.OP && token.value === value;
}
function atKeyword(parser,word) {
return tokenIsKeyword(current(parser),word);
}
function atType(parser,type) {
return current(parser).type === type;
}
function atOp(parser,value) {
return tokenIsOp(current(parser),value);
}
// NEWLINE/INDENT/DEDENT/ENDMARKER tokens carry value:'', so quoting
// tok.value verbatim in an error message would print an empty, uninformative
// "found ''"; name the boundary in words instead so an unfinished line such
// as `x in` always gets a real message.
function describeToken(tok) {
if (tok.value) return `'${tok.value}'`;
if (tok.type === TOKEN_TYPES.NEWLINE) return 'end of line';
if (tok.type === TOKEN_TYPES.ENDMARKER) return 'end of input';
return 'an indentation change';
}
function expectType(parser,type) {
const tok = current(parser);
if (tok.type !== type) parseFail(tok,`expected ${type}, found ${describeToken(tok)}`);
advance(parser);
return tok;
}
function expectOp(parser,value) {
if (!atOp(parser,value)) parseFail(current(parser),`expected '${value}'`);
advance(parser);
}
function expectKeyword(parser,word) {
if (!atKeyword(parser,word)) parseFail(current(parser),`expected '${word}'`);
advance(parser);
}
function parseFail(place,message) {
throw { line:place.line,col:place.col,message };
}
function nodeAt(place,fields) {
return { line:place.line,col:place.col,...fields };
}

export { tokenize, TOKEN_TYPES, KEYWORDS, peek, current, advance, tokenIsKeyword, tokenIsOp, atKeyword, atType, atOp, expectType, expectOp, expectKeyword, parseFail, nodeAt, describeToken };
