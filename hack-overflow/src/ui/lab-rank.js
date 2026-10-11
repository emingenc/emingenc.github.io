import { rigLevelRank } from '../game/rig-reward.js';
import { uiRenderKeepingFocus } from './app.js';


function uiLabRankText(paid) {
if (!paid) return '';
if (paid.gain <= 0) return 'NO NEW R: each level pays once';
return '+' + paid.gain + ' R' + (paid.up ? ' · ' + paid.up :'');
}
async function uiLabPay(app,win) {
const line = rigLevelRank(win.rig,win.levelId,win.stars);
if (!line) return { gain:0,up:null };
const pay = await import('./rank-pay.js');
const result = await pay.uiPayRank(app,line.source,line.amount);
return { gain:result.gain,up:result.up };
}
function uiLabPayRank(app,key,win) {
const session = app[key];
return uiLabPay(app,win)
.catch(function () { return { gain:0,up:null }; })
.then(function (paid) {
if (session && app[key] === session) {
session.rank = paid;
if (paid.gain > 0) app.pendingAnnounce = (win.spoken ? win.spoken + ' ' :'') + 'Plus ' + paid.gain + ' R.';
if (app.screen === key) uiRenderKeepingFocus(app);
}
return paid;
});
}

export { uiLabPayRank,uiLabRankText };
