import { MAX_STARS_PER_LOCK } from '../logic/stars.js';
import { progressOf } from './progress.js';

function endingStats(world,save) {
const progress = progressOf(world,save);
const earned = world.placed.filter((key) => progress.breached.has(key)).map((key) => progress.best[key]);
const stars = earned.reduce((sum,best) => sum + best,0);
const perfect = earned.filter((best) => best === MAX_STARS_PER_LOCK).length;
return {
locks:earned.length,placed:world.placed.length,stars,maxStars:world.placed.length * MAX_STARS_PER_LOCK,
xp:progress.xp,level:progress.level,rank:progress.rank,
traced:save.stats.traced,fails:save.stats.fails,probes:save.stats.probes,perfect,
};
}

function sectorStars(world,save) {
const progress = progressOf(world,save);
return Object.values(world.sectors).map((sector) => ({
family:sector.key,name:sector.name,maxStars:sector.keys.length * MAX_STARS_PER_LOCK,
stars:sector.keys.reduce((sum,key) => sum + (progress.best[key] || 0),0),
}));
}

export { endingStats, sectorStars };
