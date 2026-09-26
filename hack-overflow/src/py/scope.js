const NESTED_BODY_KEYS = ['body', 'orelse'];
const BLOCK_TYPES = new Set(['If', 'For', 'While']);

function addAssignedNames(target, names) {
  if (target.type === 'Name') { names.add(target.id); return; }
  if (target.type === 'Tuple') { target.elts.forEach((element) => addAssignedNames(element, names)); return; }
  // PEP 3132 extended unpacking (`a, *b, c = seq`): the starred element's own
  // name is still an assignment target and must count as a local too.
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
/**
 * Names CPython's compiler classifies as this function's locals: every name
 * that appears as an assignment target anywhere in its body (`Assign`,
 * `AnnAssign`, `AugAssign`, or a `for` target), at any nesting depth.
 * CPython decides this per-function at compile time, not per-branch at run
 * time, so reading such a name before its first assignment ever runs raises
 * `UnboundLocalError`, never `NameError` - even if the assignment is inside
 * a branch that never executes.
 * @param {Array<object>} statements - a function's body statements
 * @returns {Set<string>}
 */
function collectLocalNames(statements) {
  const names = new Set();
  addFromBody(statements, names);
  return names;
}

export { collectLocalNames };
