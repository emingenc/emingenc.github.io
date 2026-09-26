import { uiEl } from './dom.js';
import { uiProblemByKey } from './render-lock-left.js';
import { ui } from './app.js';
import { availableFamilies } from '../logic/schedule.js';
import { hasBeenSolved, isFamilySolved } from '../logic/profile.js';
import { uiDayLabel } from './format.js';

// logic/profile.js declares MAX_BOX (5) but does not export it; mirrored
// here since this file cannot edit logic/profile.js.
const UI_ROUTE_MAX_BOX = 5;
// logic/profile.js's START_BOX; a family still in it has never been
// promoted, so the route shows "new" rather than a bare "0" (defect #8's
// box-0 wording carried over to the route screen).
const UI_ROUTE_NEW_BOX = 0;

const UI_ROUTE_LIVE = 'live';
const UI_ROUTE_UPCOMING = 'upcoming';
const UI_ROUTE_FUTURE = 'future';

function routeEntryByKey(key) {
return ui.content.route.find(function (entry) { return entry.key === key; });
}
function liveFamilyByKey(key) {
return ui.content.families.find(function (family) { return family.key === key; }) ?? null;
}
function isFamilyBuilt(key) {
return liveFamilyByKey(key) !== null;
}
function isFamilyUnlocked(key,profile) {
return availableFamilies(profile,ui.content.families).some(function (family) { return family.key === key; });
}
function prereqsSolved(entry,profile) {
return entry.prereqs.every(function (key) {
const family = liveFamilyByKey(key);
return family !== null && isFamilySolved(profile,family);
});
}
function prereqNames(entry) {
return entry.prereqs.map(function (key) { return routeEntryByKey(key).name; });
}
/**
 * Which of the three route states a family is in: live and playable now,
 * locked behind a built prereq chain (named), or not yet built at all
 * (generic, dimmed). A family with no content is only "upcoming" while its
 * prereqs are still unsolved; once they are solved it has nothing left to
 * open into, so it falls back to "coming later" instead of naming a prereq
 * that is already done.
 * @param {object} entry - a content.route entry
 * @param {object} profile
 * @returns {'live'|'upcoming'|'future'}
 */
function routeNodeCategory(entry,profile) {
if (isFamilyBuilt(entry.key) && isFamilyUnlocked(entry.key,profile)) return UI_ROUTE_LIVE;
if (isFamilyBuilt(entry.key)) return UI_ROUTE_UPCOMING;
if (entry.prereqs.length > 0 && entry.prereqs.every(isFamilyBuilt) && !prereqsSolved(entry,profile)) return UI_ROUTE_UPCOMING;
return UI_ROUTE_FUTURE;
}
function familyBoxText(box) {
return box === UI_ROUTE_NEW_BOX ? 'new' :'box ' + box + '/' + UI_ROUTE_MAX_BOX;
}
function familyProgressText(entry,profile) {
const family = liveFamilyByKey(entry.key);
const state = profile.families[entry.key];
const solved = family.problems.filter(function (key) { return hasBeenSolved(profile.problems[key]); }).length;
return solved + '/' + family.problems.length + ' solved | ' + familyBoxText(state.box) + ' | due day ' + uiDayLabel(state.due);
}
function uiRouteNodeStatus(entry,category,profile) {
if (category === UI_ROUTE_LIVE) return familyProgressText(entry,profile);
if (category === UI_ROUTE_UPCOMING) return 'opens after ' + prereqNames(entry).join(', ');
return 'coming later';
}
function uiRouteNodeKind(category) {
if (category === UI_ROUTE_LIVE) return 'route-live';
if (category === UI_ROUTE_UPCOMING) return 'route-upcoming';
return 'route-future';
}
function uiRouteNodeButton(entry,category,isOpen,profile) {
const children = [
uiEl('span',{ className:'route-node-name',text:entry.name }),
uiEl('span',{ className:'route-node-status',text:uiRouteNodeStatus(entry,category,profile) }),
];
return uiEl('button',{
className:'route-node ' + uiRouteNodeKind(category) + (isOpen ? ' peek-open' :''),
attrs:{
type:'button','data-action':'route-peek-' + entry.key,'data-focus-key':'route-node-' + entry.key,
'aria-expanded':isOpen ? 'true' :'false',
},
children:children,
});
}
function uiRouteLivePeek(entry,profile) {
const family = liveFamilyByKey(entry.key);
const solved = family.problems.filter(function (key) { return hasBeenSolved(profile.problems[key]); });
const unseen = family.problems.length - solved.length;
const lines = [entry.idea];
if (solved.length > 0) lines.push('Solved: ' + solved.map(function (key) { return uiProblemByKey(key).name; }).join(', '));
if (unseen > 0) lines.push(unseen + ' unseen');
return lines;
}
function uiRoutePeekLines(entry,category,profile) {
if (category === UI_ROUTE_LIVE) return uiRouteLivePeek(entry,profile);
if (category === UI_ROUTE_UPCOMING) return ['Opens after ' + prereqNames(entry).join(', ') + '.'];
return ['Coming later. Not part of this preview.'];
}
function uiRoutePeekClose() {
return uiEl('button',{
className:'btn btn-ghost route-peek-close',
text:'CLOSE',
attrs:{ type:'button','data-action':'route-peek-close','data-focus-key':'route-peek-close' },
});
}
function uiRoutePeekPanel(entry,category,profile) {
const lines = uiRoutePeekLines(entry,category,profile).map(function (text) { return uiEl('p',{ text:text }); });
return uiEl('div',{
className:'route-peek',attrs:{ role:'group','aria-label':entry.name + ' details' },
children:lines.concat([uiRoutePeekClose()]),
});
}
function uiRouteNode(entry,app,profile) {
const isOpen = app.routePeekKey === entry.key;
const category = routeNodeCategory(entry,profile);
const button = uiRouteNodeButton(entry,category,isOpen,profile);
const children = isOpen ? [button,uiRoutePeekPanel(entry,category,profile)] :[button];
return uiEl('div',{ className:'route-node-wrap',children:children });
}
function uiRouteTierRow(tier,app,profile) {
return uiEl('div',{ className:'route-tier',children:tier.map(function (entry) { return uiRouteNode(entry,app,profile); }) });
}
function uiRouteTiers(route) {
const byTier = new Map();
for (const entry of route) {
const tierRow = byTier.get(entry.tier) ?? [];
tierRow.push(entry);
byTier.set(entry.tier,tierRow);
}
return [...byTier.entries()].sort(function (left,right) { return left[0] - right[0]; }).map(function (pair) { return pair[1]; });
}
function uiRouteBackButton() {
return uiEl('button',{
className:'btn btn-ghost route-back',
text:'BACK',
attrs:{ type:'button','data-action':'route-back','data-focus-key':'route-back' },
});
}
/**
 * The route screen: every family from content.route grouped by tier. A
 * live and currently-unlocked family shows its solved/total count, box
 * and next due day; a not-yet-live family whose prereq chain is already
 * built names those prereqs; a family with no built prereq yet is a
 * dimmed 'coming later' placeholder.
 * @param {object} app
 * @param {object} profile
 * @returns {HTMLElement}
 */
function uiRenderRoute(app,profile) {
const heading = uiEl('h1',{ className:'route-heading',text:'ROUTE',attrs:{ tabindex:'-1','data-focus-key':'route-header' } });
const rows = uiRouteTiers(ui.content.route).map(function (tier) { return uiRouteTierRow(tier,app,profile); });
const children = [heading,uiRouteBackButton()].concat(rows);
return uiEl('section',{ className:'screen route-screen',attrs:{ 'data-screen':'route' },children:children });
}

export { uiRenderRoute };
