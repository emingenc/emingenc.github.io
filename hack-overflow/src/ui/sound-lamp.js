function uiSoundLamp(button,on) {
button.setAttribute('data-lamp',on ? 'on' :'off');
return button;
}

export { uiSoundLamp };
