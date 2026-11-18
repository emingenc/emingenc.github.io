const UI_RAMP_STEPS = 256;
const UI_RAMP_SHADE_AT = 0.35;
const UI_RAMP_TONE_AT = 0.75;
const UI_RAMP_STOPS = [0,UI_RAMP_SHADE_AT,UI_RAMP_TONE_AT,1];
const UI_RAMP_DEEP = '#1b1440';
const UI_CHANNELS = 3;
const UI_RGBA = 4;
const UI_HEX_PAIR = 2;
const UI_RAMP_SOFT = 0.62;
const UI_RAMP_DEEP_AMOUNT = 0.2;
const UI_RAMP_GLINT = 0.55;

function uiHexRgb(hex) {
const digits = String(hex).trim().replace('#','');
const full = digits.length === UI_CHANNELS ? digits.replace(/./g,'$&$&') :digits;
return [0,1,2].map(function (channel) { return parseInt(full.slice(channel * UI_HEX_PAIR,(channel + 1) * UI_HEX_PAIR),16) || 0; });
}
function uiMix(from,to,amount) {
return from.map(function (value,channel) { return Math.round(value * (1 - amount) + to[channel] * amount); });
}
function uiRampColours(palette,accent) {
const bg = uiHexRgb(palette.bg);
const tone = uiHexRgb(palette[accent]);
const shade = uiMix(uiMix(tone,bg,UI_RAMP_SOFT),uiHexRgb(UI_RAMP_DEEP),UI_RAMP_DEEP_AMOUNT);
return [bg,shade,tone,uiMix(tone,uiHexRgb(palette.text),UI_RAMP_GLINT)];
}
function uiRampAt(palette,accent,amount) {
const colours = uiRampColours(palette,accent);
const upper = UI_RAMP_STOPS.findIndex(function (stop) { return amount <= stop; });
const at = Math.max(1,upper);
const span = UI_RAMP_STOPS[at] - UI_RAMP_STOPS[at - 1];
return uiMix(colours[at - 1],colours[at],Math.min(1,Math.max(0,(amount - UI_RAMP_STOPS[at - 1]) / span)));
}
function uiRamp(palette,accent) {
const table = new Uint8ClampedArray(UI_RAMP_STEPS * UI_CHANNELS);
for (let level = 0; level < UI_RAMP_STEPS; level += 1) table.set(uiRampAt(palette,accent,level / (UI_RAMP_STEPS - 1)),level * UI_CHANNELS);
return table;
}
function uiTintPixels(pixels,ramp) {
for (let at = 0; at < pixels.length; at += UI_RGBA) {
const grey = pixels[at];
if (grey !== pixels[at + 1] || grey !== pixels[at + 2]) continue;
const base = grey * UI_CHANNELS;
pixels[at] = ramp[base];
pixels[at + 1] = ramp[base + 1];
pixels[at + 2] = ramp[base + 2];
}
return pixels;
}

export { UI_RAMP_STEPS,uiHexRgb,uiRampAt,uiRamp,uiTintPixels };
