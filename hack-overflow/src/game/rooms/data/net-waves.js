const W1_RUN_MIN = 5;
const W1_RUN_MAX = 7;
const W1_PAR_OVER_MIN = 3;
const W1_PAR_OVER_MAX = 7;
const W2_RUN_MIN = 4;
const W2_RUN_MAX = 7;
const W2_PAR_OVER_MIN = 4;
const W2_PAR_OVER_MAX = 10;
const W2_K_MIN = 10;
const W2_K_MAX = 14;
const W2_WEIGHT_MIN = 1;
const W2_WEIGHT_MAX = 9;
const W3_ALPHABET = 7;
const W3_RUN_MIN = 5;
const W3_RUN_MAX = 7;
const W3_PAR_OVER_MIN = 4;
const W3_PAR_OVER_MAX = 9;
const W1_RUN = [W1_RUN_MIN,W1_RUN_MAX];
const W1_PAR_OVER = [W1_PAR_OVER_MIN,W1_PAR_OVER_MAX];
const W2_RUN = [W2_RUN_MIN,W2_RUN_MAX];
const W2_PAR_OVER = [W2_PAR_OVER_MIN,W2_PAR_OVER_MAX];
const W3_RUN = [W3_RUN_MIN,W3_RUN_MAX];
const W3_PAR_OVER = [W3_PAR_OVER_MIN,W3_PAR_OVER_MAX];
const W2_K_RANGE = [W2_K_MIN,W2_K_MAX];
const W2_WEIGHTS = [W2_WEIGHT_MIN,W2_WEIGHT_MAX];
const NET_WAVES = {
w1:{ id:'w1',n:12,judge:'distinct',jump:'raw',snags:true,hidden:false,alphabet:6,seed:4491,pool:12,run:W1_RUN,parOver:W1_PAR_OVER },
w2:{
id:'w2',n:16,judge:'sum',jump:null,snags:true,hidden:true,kRange:W2_K_RANGE,weights:W2_WEIGHTS,seed:4492,pool:12,run:W2_RUN,
parOver:W2_PAR_OVER,
},
w3:{
id:'w3',n:16,judge:'distinct',jump:'max',snags:false,hidden:true,alphabet:W3_ALPHABET,seed:4493,pool:12,run:W3_RUN,
parOver:W3_PAR_OVER,
},
};
const NET_MODES = ['w1','w2','w3'];
const NET_INTEGRITY = 3;
const NET_BUSY_MS = 300;
const MAX_RUN = 7;
const NET_SCORE = { clear:100,perBest:10,perIntegrity:25,gold:200 };

export { NET_WAVES,NET_MODES,NET_INTEGRITY,NET_BUSY_MS,MAX_RUN,NET_SCORE };
