const QUEST_MODULES = [
() => import('./grid-walk-bytes.js'),
() => import('./grid-walk-anagram.js'),
() => import('./grid-walk-undo.js'),
() => import('./grid-walk-unref.js'),
() => import('./grid-walk-null-home.js'),
() => import('./grid-brute-bench.js'),
];

function uiRunInstallers(app,module) {
return Promise.all(Object.keys(module).filter((name) => name.startsWith('uiInstall')).map((name) => module[name](app)));
}
async function uiInstallQuests(app) {
await Promise.all(QUEST_MODULES.map((load) => load().then((module) => uiRunInstallers(app,module)).catch(console.error)));
}

export { QUEST_MODULES,uiInstallQuests };
