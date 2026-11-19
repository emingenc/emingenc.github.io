import { planBake,regionHolds } from '../game/bake-region.js';
import { uiArtRevision } from './art-hook.js';


function uiBakeIsCurrent(baked,job) {
const frame = job.frame;
return baked !== null && baked.world === frame.world && baked.palette === frame.palette && baked.tile === frame.tile
&& baked.dpr === frame.dpr && baked.revision === uiArtRevision() && regionHolds(baked.region,job.range);
}
function uiPaintBake(cache,job) {
const frame = job.frame;
const canvas = cache.canvas || document.createElement('canvas');
canvas.width = job.pixels.width;
canvas.height = job.pixels.height;
const ctx = canvas.getContext('2d');
ctx.setTransform(frame.dpr,0,0,frame.dpr,0,0);
ctx.imageSmoothingEnabled = false;
job.paint(ctx,{ frame,region:job.region,left:-job.pixels.x / frame.dpr,top:-job.pixels.y / frame.dpr });
cache.canvas = canvas;
return { canvas,region:job.region,pixels:job.pixels,world:frame.world,palette:frame.palette,tile:frame.tile,dpr:frame.dpr,revision:uiArtRevision() };
}
function uiBakedMap(cache,job) {
if (uiBakeIsCurrent(cache.baked,job)) return cache.baked;
const plan = planBake(job.range,{ world:job.frame.world,scale:job.frame.tile * job.frame.dpr });
cache.baked = plan ? uiPaintBake(cache,{ ...job,...plan }) :null;
return cache.baked;
}
function uiBlitBaked(ctx,baked,offset) {
const { pixels,dpr } = baked;
ctx.drawImage(baked.canvas,(pixels.x - offset.x) / dpr,(pixels.y - offset.y) / dpr,pixels.width / dpr,pixels.height / dpr);
}
function uiCreateBakeCache() {
return { baked:null,canvas:null };
}

export { uiBakedMap,uiBlitBaked,uiCreateBakeCache };
