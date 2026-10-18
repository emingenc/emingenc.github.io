import{pipeline as A,InterruptableStoppingCriteria as b}from"https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js";import{createTally as x,createLoadTimer as k}from"./download-tally.js";const y=6e4,v={webgpu:45e3,wasm:9e4},_=1e3,q="onnx-community/SmolLM2-360M-Instruct-ONNX",L=7500,P=100,C=.1,G=80,J=.35,j=150,D=.3,K=50;let o=null,c="",w="",d="",M="";function U(e,t){var a=t||c||"You are Emin's portfolio assistant. Keep answers short, friendly, and helpful.";return`<|im_start|>system
`+a+`
<|im_end|>
<|im_start|>user
`+e+`
<|im_end|>
<|im_start|>assistant
`}function E(e){var t=c||"You are Emin's portfolio assistant. Keep answers short, friendly, and helpful.";return`<|im_start|>system
`+t+`
<|im_end|>
<|im_start|>user
`+e+`
<|im_end|>
<|im_start|>assistant
`}function W(e,t,a){var n=M||`Decide if this portfolio query is in scope. Return JSON only: {"inScope":true/false,"suggestedTool":"","confidence":0,"reason":""}
Question: {{question}}
Needle proposal: {{intent}}
Tool scopes: {{toolScopes}}`;return E(n.replace(/\{\{question\}\}/g,e||"").replace(/\{\{intent\}\}/g,t||"").replace(/\{\{toolScopes\}\}/g,a||""))}function Y(e,t){return d?E(d.replace(/\{\{question\}\}/g,e||"").replace(/\{\{context\}\}/g,t||"")):U(e)}function F(e,t,a,n){var r=w;r||(r=`<|im_start|>system
You evaluate whether a tool response answers the user's question. Return ONLY valid JSON: {"stop":true/false,"summary":"brief summary","confidence":0-100,"nextTool":"ask_user|faq|chat|stop|","next":""}
<|im_end|>
<|im_start|>user
Question: {{question}}
Results: {{results}}
Context: {{context}}
Errors: {{errors}}

Evaluate now. Return JSON only.
<|im_end|>
<|im_start|>assistant
`);var s="";Array.isArray(t)&&(s=t.map(function(i){var T=(i.content||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,200);return(i.toolName||"tool")+": "+T}).join(" | "));var u="";Array.isArray(a)&&(u=a.map(function(i){return i.role+": "+(i.content||"").slice(0,100)}).join(" | "));var R=Array.isArray(n)?n.join(" | "):"";return r.replace(/\{\{question\}\}/g,e||"").replace(/\{\{results\}\}/g,s).replace(/\{\{context\}\}/g,u).replace(/\{\{errors\}\}/g,R)}function h(e){try{return JSON.parse(e.trim())}catch{}var t=e.match(/```(?:json)?\s*\n?([\s\S]*?)```/);if(t)try{return JSON.parse(t[1].trim())}catch{}var a=e.indexOf("{"),n=e.lastIndexOf("}");if(a!==-1&&n>a)try{return JSON.parse(e.slice(a,n+1))}catch{}return null}function p(e){var t=e.indexOf("<|im_end|>");return t!==-1?e.slice(0,t).trim():e.trim()}function f(){return{stop:!0,summary:null,confidence:K,next:"",checked:!1}}var m=new Map,S=Promise.resolve();function g(e,t){var a={stopper:new b,cancelled:!1};m.set(e,a);var n=S.then(function(){return a.cancelled?null:t(a)}).finally(function(){m.delete(e)});return S=n.catch(function(){}),n}function Q(e){var t=m.get(e);t&&(t.cancelled=!0,t.stopper.interrupt())}function V(e,t){var a=e==="stall"?"no data for "+y/_+" s while downloading on "+t:"model did not start within "+v[t]/_+" s on "+t;return Object.assign(new Error(a),{kind:e})}function H(e,t){return function(a){if(!(!a||!a.file)){if(a.status==="progress")e.set(a.file,a.loaded,a.total);else if(a.status==="done")e.done(a.file);else return;self.postMessage({type:"progress",loaded:e.bytes()}),e.complete()?t.starting():t.downloading()}}}function X(e,t){return{dtype:e==="wasm"?"q8":"q4f16",device:e,progress_callback:t}}function z(e){var t=x();return self.postMessage({type:"progress",loaded:0}),new Promise(function(a,n){var r=k(function(s){n(V(s,e))},{stallMs:y,initMs:v[e]});r.downloading(),A("text-generation",q,X(e,H(t,r))).then(function(s){r.stop(),a(s)},function(s){r.stop(),n(s)})})}async function I(e){self.postMessage({type:"status",data:"loading model ("+e+")..."});try{return{model:await z(e)}}catch(t){return{error:t}}}function O(e){self.postMessage({type:"error",data:"LLM load failed: "+(e?e.message:"All backends exhausted"),fatal:!0})}function B(e){return e.kind==="stall"?(O(e),!0):e.kind==="init"?(self.postMessage({type:"restart",device:"wasm",data:e.message}),!0):(self.postMessage({type:"fallback",device:"wasm"}),self.postMessage({type:"status",data:"webgpu failed, trying wasm..."}),console.warn("[chat-worker] WebGPU failed:",e.message,"- falling back to WASM"),!1)}function N(e){self.postMessage({type:"status",data:"ready ("+e+")"}),self.postMessage({type:"status",data:"ready"})}async function Z(e){if(e!=="wasm"){var t=await I("webgpu");if(t.model)return o=t.model,N("webgpu");if(B(t.error))return}var a=await I("wasm");if(a.model)return o=a.model,N("wasm");console.warn("[chat-worker] WASM also failed:",a.error.message),O(a.error)}self.onerror=function(e){self.postMessage({type:"error",data:"Worker crashed: "+(e.message||e.filename||String(e)),fatal:!0})},self.onmessageerror=function(){self.postMessage({type:"error",data:"Worker received an unserializable message",fatal:!0})};async function l(e){try{var t=await fetch(e);if(t.ok)return(await t.text()).trim()}catch{}return""}async function $(){var e=await l("/agents/prompts/system.md");e&&(c=e);var t=await l("/agents/prompts/evaluate.md");t&&(w=`<|im_start|>system
`+t+`
<|im_end|>
<|im_start|>user
Question: {{question}}
Results: {{results}}
Context: {{context}}
Errors: {{errors}}

Evaluate now. Return JSON only.
<|im_end|>
<|im_start|>assistant
`),d=await l("/agents/prompts/generate.md"),M=await l("/agents/prompts/align.md")}async function ee(e){try{self.postMessage({type:"status",data:"loading prompts..."}),await $(),await Z(e.device)}catch(t){self.postMessage({type:"error",data:"LLM load failed: "+(t.message||String(t)),fatal:!0})}}function te(e){Q(e.id)}async function ae(e,t,a){try{var n=W(e.text,(e.intent||{}).label||"",JSON.stringify(e.toolScopes||[])),r=await o(n,{max_new_tokens:P,temperature:C,stopping_criteria:t.stopper});if(t.cancelled)return;var s=h(p(r[0].generated_text.slice(n.length)));self.postMessage({type:"alignResult",alignId:e.alignId,data:s||Object.assign(a,{reason:"invalid alignment response"})})}catch{if(t.cancelled)return;self.postMessage({type:"alignResult",alignId:e.alignId,data:Object.assign(a,{reason:"alignment failed"})})}}function ne(e){var t={inScope:!1,suggestedTool:"out_of_scope",confidence:0,reason:"model unavailable"};return o?g(e.alignId,function(a){return ae(e,a,t)}):self.postMessage({type:"alignResult",alignId:e.alignId,data:t})}async function re(e,t){try{var a=Y(e.text,(e.context||"").slice(0,L)),n=await o(a,{max_new_tokens:G,temperature:J,stopping_criteria:t.stopper});if(t.cancelled)return;self.postMessage({type:"token",requestId:e.requestId,token:p(n[0].generated_text.slice(a.length))})}catch(r){if(t.cancelled)return;self.postMessage({type:"error",data:"Generation failed: "+(r.message||String(r)),requestId:e.requestId})}self.postMessage({type:"done",requestId:e.requestId})}function se(e){return o?g(e.requestId,function(t){return re(e,t)}):(self.postMessage({type:"error",data:"Model not loaded",requestId:e.requestId}),self.postMessage({type:"done",requestId:e.requestId}))}async function oe(e,t){try{var a=F(e.question,e.results,e.context,e.compactErrors),n=await o(a,{max_new_tokens:j,temperature:D,stopping_criteria:t.stopper});if(t.cancelled)return;var r=p(n[0].generated_text.slice(a.length));self.postMessage({type:"evalResult",evalId:e.evalId,data:h(r)||f()})}catch(s){if(t.cancelled)return;self.postMessage({type:"evalResult",evalId:e.evalId,data:f()}),self.postMessage({type:"error",data:"Eval failed: "+(s.message||String(s)),evalId:e.evalId})}}function ie(e){return o?g(e.evalId,function(t){return oe(e,t)}):self.postMessage({type:"evalResult",evalId:e.evalId,data:f()})}var le={load:ee,cancel:te,align:ne,generate:se,evaluate:ie};self.onmessage=function(e){var t=le[e.data.type];if(t)return t(e.data)};
