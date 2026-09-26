import content from './content.gen.js';
import { createAudit } from './logic/index.js';
import { setUiContext } from './ui/app.js';
import { uiBoot } from './ui/events.js';

const audit = createAudit(content);
window.HO_AUDIT = audit;
setUiContext(content,audit);
uiBoot();
