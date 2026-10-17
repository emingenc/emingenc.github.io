const BEAM_WAVES = {
w1:{ n:16,shotStays:0,mites:false,hint:true },
w2:{ n:32,shotStays:1,mites:true,hint:false },
w3:{ n:32,shotStays:1,mites:false,hint:false,rotated:true },
};
const W3_POOL = { seed:4417,size:16,min:12,minValue:1,maxValue:99 };
const BUDGET_SLACK = 2;
const HEARTS = 3;
const MITE = { every:2,bitesIn:2 };
const SHARD = { minDead:4,minAmmo:3,score:150 };
const HINT_SHOTS = 2;
const SCORE = { shot:100,heart:100 };
const COMBO_CAP = 5;
const ASSIST_PACE = 1;
const PACE_MAX = 2;
const DEFAULT_CTX = { pace:ASSIST_PACE };

export { BEAM_WAVES,W3_POOL,BUDGET_SLACK,HEARTS,MITE,SHARD,HINT_SHOTS,SCORE,COMBO_CAP,ASSIST_PACE,PACE_MAX,DEFAULT_CTX };
