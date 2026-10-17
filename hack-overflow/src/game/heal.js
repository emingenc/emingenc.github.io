
function healHp(hp) {
return hp.hearts >= hp.max ? hp :{ ...hp,hearts:hp.max };
}

export { healHp };
