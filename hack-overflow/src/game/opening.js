
function openingPlan(ext,facts) {
if (ext.opening) return 'none';
return facts.breached > 0 ? 'signpost' :'play';
}

export { openingPlan };
