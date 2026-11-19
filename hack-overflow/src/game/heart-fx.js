const HEART_FX = { ms:520,staggerMs:45 };

function heartChange(seen,now,atMs) {
if (!seen) return null;
if (now.hearts < seen.hearts) return { kind:'lost',from:now.hearts,to:seen.hearts,at:atMs };
if (now.hearts > seen.hearts) return { kind:'gain',from:seen.hearts,to:now.hearts,at:atMs };
return null;
}
function heartChangeLive(change,nowMs) {
return Boolean(change) && nowMs - change.at < HEART_FX.ms + (change.to - change.from) * HEART_FX.staggerMs;
}
function heartSlots(hearts,change,nowMs) {
return Array.from({ length:hearts.max },function (unused,slot) {
const plays = Boolean(change) && slot >= change.from && slot < change.to;
return {
full:slot < hearts.hearts,fx:plays ? change.kind :null,
delayMs:plays ? (slot - change.from) * HEART_FX.staggerMs - (nowMs - change.at) :0,
};
});
}

export { HEART_FX,heartChange,heartChangeLive,heartSlots };
