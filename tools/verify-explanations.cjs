const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const bank=JSON.parse(fs.readFileSync('data/bank.json','utf8'));
const context=vm.createContext({questionHtml:q=>`<p>${q.explanation}</p><section class="keypoint"><p>old</p><label>我的筆記<textarea></textarea></label></section><div class="actions"></div>`,quiz:()=>{},home:()=>{},keypoint:()=>'',escapeHtml:s=>String(s),revealed:false,bank});
vm.runInContext(fs.readFileSync('explanations.js','utf8'),context);
const coverage=vm.runInContext(`Object.entries(EXPLANATIONS).map(([id,e])=>{const q=bank.questions.find(q=>q.id===id);if(!q)throw Error('Unknown question '+id);if(!e.summary||!e.basis||e.options.length!==4||e.options.some(x=>!x))throw Error('Incomplete explanation '+id);revealed=false;if(questionHtml(q).includes('各選項解析'))throw Error('Answer leaked '+id);revealed=true;const html=questionHtml(q);if(!html.includes('各選項解析')||!html.includes('我的筆記')||!html.includes('本題應選'))throw Error('Missing feedback '+id);for(const [,url] of e.sources)if(!url.startsWith('https://'))throw Error('Invalid source '+id);return id})`,context);
assert(coverage.length<=bank.questions.length);
console.log(`Verified ${coverage.length}/${bank.questions.length} explanations: four options, source metadata, hidden until submitted, notes preserved.`);
