import { clamp01, countUpValue } from './ease.js';

const TOAST_COUNT_DELAY_MS = 120;
const TOAST_COUNT_MS = 400;
const TOAST_GAINED = /^\+(\d+)(\s.*)?$/;

function toastCountText(detail,elapsedMs) {
const match = TOAST_GAINED.exec(detail);
if (!match || elapsedMs < TOAST_COUNT_DELAY_MS) return detail;
const progress = clamp01((elapsedMs - TOAST_COUNT_DELAY_MS) / TOAST_COUNT_MS);
return '+' + Math.round(countUpValue(0,Number(match[1]),progress)) + (match[2] || '');
}

function toastCountRunning(elapsedMs) {
return elapsedMs < TOAST_COUNT_DELAY_MS + TOAST_COUNT_MS;
}

export { TOAST_COUNT_DELAY_MS, TOAST_COUNT_MS, toastCountText, toastCountRunning };
