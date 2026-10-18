import { ANSWER,ORDEAL_LISTING,ordealPick,ordealPrompts } from './ordeal.js';

const ORDEAL_SETTLE_MS = 900;
const ORDEAL_PRESSURE = Object.freeze({ tiles:8,hero:7,start:2 });
const ORDEAL_CLOCK_MS = 3000;
const ORDEAL_CHIP = 1;
const ORDEAL_FLOOR = 1;
const ORDEAL_TITLE = 'THE HELPER';

function ordealWatch(state,view) {
const tile = 'flood tile ' + (state.flood + 1) + ' of ' + ORDEAL_PRESSURE.tiles;
return view && Number.isFinite(view.hearts) ? tile + ' \u00b7 integrity ' + view.hearts :tile;
}

function ordealSpec(onConfirm,stance = 'open') {
return {
kind:'ordeal',listing:ORDEAL_LISTING,answer:ANSWER,onPick:ordealPick,onConfirm,
merge:stance === 'merge',lockLines:stance === 'merge',title:ORDEAL_TITLE,prompts:ordealPrompts(stance),canLeave:false,pressure:ORDEAL_PRESSURE,settleMs:ORDEAL_SETTLE_MS,watch:ordealWatch,
clockMs:ORDEAL_CLOCK_MS,chip:ORDEAL_CHIP,floor:ORDEAL_FLOOR,
};
}

export { ORDEAL_SETTLE_MS,ORDEAL_PRESSURE,ORDEAL_CLOCK_MS,ORDEAL_CHIP,ORDEAL_FLOOR,ORDEAL_TITLE,ordealSpec };
