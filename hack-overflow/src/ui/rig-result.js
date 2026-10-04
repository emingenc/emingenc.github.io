import { uiEl } from './dom.js';

const RIG_MAX_STARS = 3;
const RIG_STAR_FIRST_MS = 250;
const RIG_STAR_STEP_MS = 350;
const RIG_CODE_TAIL = 4;

function uiRigStars(count) {
return '★'.repeat(count) + '☆'.repeat(RIG_MAX_STARS - count);
}
function uiRigStarRow(stars,reveal) {
const spans = Array.from({ length:RIG_MAX_STARS },function (_,index) {
const on = index < stars;
const span = uiEl('span',{ className:'rig-star' + (on ? ' is-on' :''),text:on ? '★' :'☆',attrs:{ 'aria-hidden':'true' } });
if (on && reveal) span.style.setProperty('--rig-star-at',(RIG_STAR_FIRST_MS + index * RIG_STAR_STEP_MS) + 'ms');
return span;
});
return uiEl('p',{ className:'rig-stars' + (reveal ? ' is-reveal' :''),attrs:{ 'aria-label':stars + ' of ' + RIG_MAX_STARS + ' stars' },children:spans });
}
function uiRigXpLine(gained,won) {
if (!won) return null;
if (gained <= 0) return uiEl('p',{ className:'rig-xp is-kept',text:'BEST KEPT' });
const count = uiEl('span',{ className:'rig-xp-count',text:'+' + gained + ' XP' });
count.style.setProperty('--rig-xp-to',String(gained));
return uiEl('p',{ className:'rig-xp',children:[count] });
}
function uiRigCheckRow(check) {
return uiEl('li',{ className:'rig-check' + (check.ok ? ' is-ok' :''),children:[
uiEl('span',{ className:'rig-check-mark',text:check.ok ? '✓' :'✗',attrs:{ 'aria-label':check.ok ? 'done' :'not yet' } }),
uiEl('span',{ className:'rig-check-label',text:check.label }),
uiEl('span',{ className:'rig-check-value',text:check.value || '' }),
] });
}
function uiRigChecklist(checks) {
return uiEl('ul',{ className:'rig-checks',attrs:{ 'aria-label':'Stars' },children:checks.map(uiRigCheckRow) });
}
function uiRigCodeToggle(open,count) {
const text = open ? 'LAST ' + RIG_CODE_TAIL :'ALL MOVES (' + count + ')';
return uiEl('button',{ className:'btn btn-ghost rig-code-toggle',text,attrs:{ type:'button','data-action':'rig-code','data-focus-key':'rig-code','aria-expanded':String(open) } });
}
function uiRigCodeBlock(lines,open) {
const long = lines.length > RIG_CODE_TAIL;
const shown = long && !open ? lines.slice(-RIG_CODE_TAIL) :lines;
const pre = uiEl('pre',{ className:'rig-code',attrs:{ 'aria-label':'Your moves as code' },children:[uiEl('code',{ text:shown.join('\n') })] });
return uiEl('div',{ className:'rig-code-box',children:[pre,long ? uiRigCodeToggle(open,lines.length) :null].filter(Boolean) });
}
function uiRigWhy(card) {
return [card.culprit ? uiEl('p',{ className:'rig-culprit',text:card.culprit }) :null,
card.note ? uiEl('p',{ className:'rig-note',text:card.note }) :null];
}
function uiRigResultCard(card,view,buttons) {
const children = [uiEl('h2',{ className:'rig-verdict',text:card.title }),uiRigStarRow(card.stars,view.reveal),uiRigXpLine(view.gained,card.won),
uiRigChecklist(card.checks),...uiRigWhy(card),uiEl('p',{ className:'rig-bridge',text:card.bridge }),uiRigCodeBlock(card.code,view.codeOpen),buttons];
const attrs = view.reveal ? { 'data-action':'rig-skip' } :{};
return uiEl('div',{ className:'rig-result ' + (card.won ? 'is-won' :'is-lost') + (view.reveal ? ' is-reveal' :''),attrs,children:children.filter(Boolean) });
}

export { RIG_MAX_STARS, RIG_STAR_FIRST_MS, RIG_STAR_STEP_MS, RIG_CODE_TAIL, uiRigStars, uiRigResultCard };
