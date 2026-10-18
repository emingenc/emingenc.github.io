
const FREE_FIRST = 'First one is free. ';

function trapId(phase,out) {
if (!out.hurt) return null;
return 'p' + phase.n + ':' + out.kind;
}
function freeTrap(seen,phase,out) {
const id = trapId(phase,out);
if (id === null || seen.includes(id)) return { seen,out };
return { seen:[...seen,id],out:{ ...out,hurt:false,note:FREE_FIRST + out.note,free:true } };
}

export { FREE_FIRST,trapId,freeTrap };
