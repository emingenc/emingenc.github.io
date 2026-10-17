import { STEPS,payoff } from '../game/quest/first-bad-commit.js';
import { uiEl } from './dom.js';

const CONTINUE_KEY = 'chain-continue';
const TITLE = 'CASE CLOSED';
const SUBTITLE = 'THE FIRST BAD COMMIT';

function uiLineText(line) {
return line.who + ': ' + line.text;
}
function uiLines(className,lines) {
return uiEl('div',{ className,children:lines.map((line) => uiEl('p',{ className:className + '-line',text:uiLineText(line) })) });
}
function uiBadge() {
const pin = uiEl('span',{ className:'grid-chain-badge-pin',attrs:{ 'aria-hidden':'true' } });
return uiEl('div',{
className:'grid-chain-badge',
children:[
pin,
uiEl('p',{ className:'grid-chain-badge-name',text:payoff.badgeName }),
uiEl('p',{ className:'grid-chain-badge-worn',text:'BIT wears the ' + payoff.cosmeticName }),
],
});
}
function uiChainCard(app,panel) {
const button = uiEl('button',{
className:'btn btn-ghost grid-chain-exit is-done',text:'CONTINUE',
attrs:{ type:'button','data-focus-key':CONTINUE_KEY,'aria-label':'Continue' },
});
button.addEventListener('click',function () { panel.close(); });
const box = uiEl('div',{
className:'grid-chain-panel grid-chain-card',
children:[
uiEl('h2',{ className:'grid-chain-title',text:TITLE }),
uiEl('p',{ className:'grid-chain-card-sub',text:SUBTITLE }),
uiLines('grid-chain-filed',STEPS.map((item) => item.found)),
uiLines('grid-chain-payoff',payoff.lines),
uiBadge(),
button,
],
});
const overlay = uiEl('div',{ className:'grid-chain',attrs:{ role:'dialog','aria-modal':'true','aria-label':TITLE },children:[box] });
return { overlay,button };
}

export { CONTINUE_KEY,uiChainCard,uiLineText };
