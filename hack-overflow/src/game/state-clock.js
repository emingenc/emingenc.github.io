
function stateSince(clock,sample) {
const { key, on, now } = sample;
const prev = clock[key];
if (!prev) clock[key] = { on,at:on ? now :-Infinity };
else if (prev.on !== on) clock[key] = { on,at:now };
return now - clock[key].at;
}

export { stateSince };
