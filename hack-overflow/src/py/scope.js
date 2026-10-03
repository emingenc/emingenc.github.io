const NESTED_BODY_KEYS = ['body', 'orelse'];
const BLOCK_TYPES = new Set(['If', 'For', 'While']);

function addAssignedNames(target, names) {
  if (target.type === 'Name') { names.add(target.id); return; }
  if (target.type === 'Tuple') { target.elts.forEach((element) => addAssignedNames(element, names)); return; }
  if (target.type === 'Starred') addAssignedNames(target.value, names);
}
function addFromStatement(node, names) {
  if (node.type === 'Assign') node.targets.forEach((target) => addAssignedNames(target, names));
  else if (node.type === 'AnnAssign' || node.type === 'AugAssign') addAssignedNames(node.target, names);
  else if (node.type === 'For') addAssignedNames(node.target, names);
}
function addFromBlock(node, names) {
  NESTED_BODY_KEYS.forEach((key) => { if (node[key]) addFromBody(node[key], names); });
}
function addFromBody(statements, names) {
  statements.forEach((node) => {
    addFromStatement(node, names);
    if (BLOCK_TYPES.has(node.type)) addFromBlock(node, names);
  });
}
function collectLocalNames(statements) {
  const names = new Set();
  addFromBody(statements, names);
  return names;
}

export { collectLocalNames };
