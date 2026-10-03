const WILDCARD = '*';

function listenersFor(byType,type) {
if (!byType.has(type)) byType.set(type,[]);
return byType.get(type);
}
function removeListener(list,fn) {
const index = list.indexOf(fn);
if (index !== -1) list.splice(index,1);
}
function reportAsync(error) {
Promise.resolve().then(() => console.error(error));
}
function callSafely(fn,args) {
try {
fn(...args);
} catch (error) {
reportAsync(error);
}
}
function notify(byType,type,payload) {
for (const fn of [...listenersFor(byType,type)]) callSafely(fn,[payload]);
}
function notifyWildcard(byType,type,payload) {
for (const fn of [...listenersFor(byType,WILDCARD)]) callSafely(fn,[type,payload]);
}
function createBus() {
const byType = new Map();
function on(type,fn) {
listenersFor(byType,type).push(fn);
return () => removeListener(listenersFor(byType,type),fn);
}
function emit(type,payload) {
notify(byType,type,payload);
if (type !== WILDCARD) notifyWildcard(byType,type,payload);
}
return { on,emit };
}

export { createBus };
