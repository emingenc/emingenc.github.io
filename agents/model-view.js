// model-view.js — the live status line under the prompt: the agent runs in
// this browser with no servers, and one plain-word state says how its local
// models are doing: "model loading", the download as "model 42%", then
// "ready" ("model off · commands still work" if either model can't load
// here). While the chat model waits, the line stays "ready" and offers its
// button, labelled with the megabytes it downloads. The title names both.
const MODEL_ACTIONS = new Set(['MODEL_STATUS', 'MODEL_PROGRESS', 'LLM_POLICY']);

function modelFailed(models) {
  return Boolean(models.llmError || models.needleError);
}

function chatWaits(models) {
  return models.llmPolicy !== 'auto' && models.llmDownloadMB > 0 && !models.llmLoading && !models.llmReady;
}

// Needle loads first, so the state follows SmolLM2's download unless it waits.
function modelState(models) {
  if (modelFailed(models)) return ['off', 'model off · commands still work'];
  if (chatWaits(models)) return models.needleLoading ? ['busy', 'model loading'] : ['ok', 'ready'];
  if (models.llmReady && !models.needleLoading) return ['ok', 'ready'];
  if (models.llmDownloadProgress > 0) return ['busy', 'model ' + models.llmDownloadProgress + '%'];
  return ['busy', 'model loading'];
}

function titleText(models) {
  if (modelFailed(models)) return 'A model could not load in this tab; /commands still work. Nothing goes to a server.';
  const chat = models.llmDownloadMB ? ` (${models.llmDownloadMB} MB)` : '';
  return `Two models run in this tab: Needle 26M picks a tool for each question, and SmolLM2 360M checks answers and handles small talk${chat}. Nothing goes to a server.`;
}

export class ModelView {
  constructor(store) {
    this.els = { root: document.getElementById('liveStatus'), state: document.getElementById('liveModel'), load: this.makeLoadButton() };
    store.subscribe((state, action) => {
      if (MODEL_ACTIONS.has(action.type)) this.paint(state.models);
    });
    this.paint(store.getState().models);
  }

  makeLoadButton() {
    const text = document.getElementById('liveModel')?.parentElement;
    if (!text || !text.after) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'load';
    button.hidden = true;
    button.addEventListener('click', () => window._enableLLM());
    text.after(button);
    return button;
  }

  paint(models) {
    const { root, state, load } = this.els;
    if (state) {
      const [name, text] = modelState(models);
      state.dataset.state = name;
      if (state.textContent !== text) state.textContent = text;
    }
    if (root) root.title = titleText(models);
    if (load) {
      load.hidden = !chatWaits(models) || Boolean(models.llmError);
      load.textContent = `load chat model · ${models.llmDownloadMB} MB`;
    }
  }
}
