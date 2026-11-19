const QUIET_MS = 2500;
const IDLE_FRAME_MS = 33;
const FRAME_SLACK_MS = 4;

function shouldDrawFrame(pace,now) {
if (pace.busy || now - pace.activeAt < QUIET_MS) return true;
return now - pace.lastDrawAt >= IDLE_FRAME_MS - FRAME_SLACK_MS;
}

const RETRY_MS = 1500;
function retryDue(failedAt,now) {
return now - failedAt >= RETRY_MS;
}

function retrySpecifier(specifier,failures) {
return failures === 0 ? specifier :specifier + '?retry=' + failures;
}

const MOTION_EPS = 0.001;
function vectorMoves(vector) {
return Boolean(vector) && Math.abs(vector.col) + Math.abs(vector.row) > MOTION_EPS;
}

export { QUIET_MS,IDLE_FRAME_MS,RETRY_MS,retryDue,retrySpecifier,shouldDrawFrame,vectorMoves };
