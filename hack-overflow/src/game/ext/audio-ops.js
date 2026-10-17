const CHOICES = ['on','silent'];

function audioChoice(ext) {
const choice = ext && ext.audio;
return CHOICES.includes(choice) ? choice :null;
}
function withAudio(ext,choice) {
if (!CHOICES.includes(choice) || audioChoice(ext) === choice) return ext;
return { ...ext,audio:choice };
}
function audioWanted(ext) {
return audioChoice(ext) === 'on';
}

export { audioChoice,audioWanted,withAudio };
