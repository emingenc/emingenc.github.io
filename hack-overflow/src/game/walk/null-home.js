const PROP_ID = 'null-home';
const HOME = Object.freeze({ col:19,row:21 });
const TEXT = Object.freeze({ bump:'NULL: I point to nothing. I will stay here.' });

function isHome(ext) {
return Boolean(ext.npc && ext.npc.nullHome);
}
function homeProps(ext) {
return isHome(ext) ? [{ id:PROP_ID,col:HOME.col,row:HOME.row }] :[];
}
function homeBump(ext,propId) {
return propId === PROP_ID && isHome(ext) ? TEXT.bump :null;
}

export { HOME,PROP_ID,TEXT,homeBump,homeProps };
