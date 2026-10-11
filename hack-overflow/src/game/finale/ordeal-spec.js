import { ANSWER,ORDEAL_LISTING,ORDEAL_PROMPT_TEXT,ordealPick } from './ordeal.js';

const ORDEAL_SETTLE_MS = 900;
const ORDEAL_PRESSURE = Object.freeze({ tiles:8,hero:7,start:2 });
const ORDEAL_TITLE = 'THE HELPER';

function ordealWatch(state) {
return 'flood tile ' + (state.flood + 1) + ' of ' + ORDEAL_PRESSURE.tiles;
}

function ordealSpec(onConfirm) {
return {
kind:'ordeal',listing:ORDEAL_LISTING,answer:ANSWER,onPick:ordealPick,onConfirm,
merge:true,title:ORDEAL_TITLE,prompts:ORDEAL_PROMPT_TEXT,canLeave:false,pressure:ORDEAL_PRESSURE,settleMs:ORDEAL_SETTLE_MS,watch:ordealWatch,
};
}

export { ORDEAL_SETTLE_MS,ORDEAL_PRESSURE,ORDEAL_TITLE,ordealSpec };
