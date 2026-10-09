import { FUSE_MS } from '../game/rooms/data/turret-wave1.js';
import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { uiEl } from './dom.js';


const MS_PER_S = 1000;
const KEEP_ACTION = 'turret-keep-clock';
const ASSIST_ACTION = 'turret-assist';

function uiBannerButton(action, label) {
  return uiEl('button', { className: 'btn arena-btn arena-verb turret-banner-btn', text: label, attrs: { type: 'button', 'data-action': action, 'data-focus-key': action } });
}
function uiTurretFuseBanner(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || !arena.banner) return null;
  const text = fillText(TURRET_TEXTS.banner, { sec: FUSE_MS.first / MS_PER_S });
  return uiEl('div', {
    className: 'turret-banner',
    attrs: { role: 'dialog', 'aria-modal': 'false', 'aria-label': 'FUSE' },
    children: [
      uiEl('p', { className: 'turret-banner-text', text }),
      uiEl('div', { className: 'turret-banner-actions', children: [uiBannerButton(KEEP_ACTION, 'KEEP CLOCK'), uiBannerButton(ASSIST_ACTION, 'ASSIST')] }),
    ],
  });
}
function uiTurretBannerFocus(reduced) {
  return reduced ? ASSIST_ACTION : KEEP_ACTION;
}

export { KEEP_ACTION, ASSIST_ACTION, uiTurretFuseBanner, uiTurretBannerFocus };
