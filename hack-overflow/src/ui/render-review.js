import { uiEl, uiLeetcodeLink } from './dom.js';
import { GRADE_A_RATIO, GRADE_B_RATIO } from '../logic/index.js';
import { UI_BAR_MAX_PERCENT } from './format.js';
import { uiFamilyName } from './render-lock-left.js';
import { uiReviewLocksList, uiFamilyBoxList } from './render-review-locks.js';
import { ui } from './app.js';

function uiReviewBanner(view) {
const text = view.top ? 'CLEAN BREACH' :'GRADE: ' + view.grade;
return uiEl('h1',{ className:'review-banner',text:text,attrs:{ tabindex:'-1','data-focus-key':'review-header' } });
}
function uiGradeLegend() {
const aPct = Math.round(GRADE_A_RATIO * UI_BAR_MAX_PERCENT);
const bPct = Math.round(GRADE_B_RATIO * UI_BAR_MAX_PERCENT);
const text = 'S = every lock ★★★. A = at least ' + aPct + '% of possible stars. B = at least ' + bPct + '%. C otherwise.';
return uiEl('p',{ className:'grade-legend',text:text });
}
function uiFamilyNextItem(next) {
return uiEl('li',{ children:[uiLeetcodeLink(next.slug,next.number + '. ' + next.title + ' ↗')] });
}
function uiFamilyNextBlock(family) {
const items = family.next.map(uiFamilyNextItem);
return uiEl('div',{
className:'family-next',
children:[uiEl('h3',{ text:uiFamilyName(family.key) }),uiEl('ul',{ className:'family-next-list',children:items })],
});
}
function uiSolveItForRealSection() {
const blocks = ui.content.families.map(uiFamilyNextBlock);
const heading = uiEl('h2',{ text:'SOLVE IT FOR REAL' });
return uiEl('div',{ className:'solve-section',children:[heading].concat(blocks) });
}
function uiReviewOptionButton(option) {
return uiEl('button',{
className:'btn btn-primary',
text:option.label,
attrs:{ type:'button','data-action':option.id,'data-focus-key':option.id },
});
}
function uiReviewRouteButton() {
return uiEl('button',{
className:'btn btn-ghost',
text:'ROUTE',
attrs:{ type:'button','data-action':'route','data-focus-key':'review-route' },
});
}
function uiReviewButtons(view) {
const buttons = view.options.map(uiReviewOptionButton).concat([uiReviewRouteButton()]);
return uiEl('div',{ className:'review-buttons',children:buttons });
}
function uiReviewSchedule(app,run) {
return uiEl('div',{ className:'review-boxes',children:[uiEl('h2',{ text:'Schedule' }),uiFamilyBoxList(app,run)] });
}
function uiRenderReview(app,run,view) {
const children = [
uiReviewBanner(view),
uiGradeLegend(),
uiReviewLocksList(view.completedLocks),
uiReviewSchedule(app,run),
uiSolveItForRealSection(),
uiReviewButtons(view),
];
return uiEl('section',{ className:'screen review-screen',attrs:{ 'data-screen':'review' },children:children });
}

export { uiRenderReview };
