const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json')));const store=new Map(),content={innerHTML:'',insertAdjacentHTML:(p,h)=>content.innerHTML+=h};const ctx=vm.createContext({document:{querySelector:s=>s==='#content'?content:{textContent:''},querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>bank}),localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},confirm:()=>true,alert:m=>{throw Error(m)},console});for(const f of ['app-v2.js','practice.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
(async()=>{await vm.runInContext('init()',ctx);vm.runInContext(`
data.attempts=bank.questions.slice(0,200).map(q=>({id:q.id,selected:0,correct:false}));data.attempts.push({...data.attempts[0]},{id:'legacy-demo',selected:0,correct:true});
if(bankProgress().done!==200||bankProgress().remaining!==bank.questions.length-200)throw Error('Unique historical count');
for(const s of [...new Set(bank.questions.map(q=>q.subject))]){const st=subjectStats(s),qs=bank.questions.filter(q=>q.subject===s),expected=new Set(data.attempts.filter(a=>qs.some(q=>q.id===a.id)).map(a=>a.id)).size;if(st.total!==qs.length||st.practiced!==expected||st.remaining!==qs.length-expected)throw Error('Subject unique coverage '+s)}
if([...new Set(bank.questions.map(q=>q.subject))].reduce((n,s)=>n+subjectStats(s).practiced,0)!==200)throw Error('Subject sum');
year='111';subject='行政法';mode='wrong';startBankRound();
if(data.activeRound.queue.length!==10||new Set(data.activeRound.queue).size!==10||data.activeRound.queue.filter(id=>!bankProgress().seen.has(id)).length!==8)throw Error('Unseen mixed pool');
const newIndex=data.activeRound.queue.findIndex(id=>!bankProgress().seen.has(id));[data.activeRound.queue[0],data.activeRound.queue[newIndex]]=[data.activeRound.queue[newIndex],data.activeRound.queue[0]];current=null;quiz();if(bankProgress().done!==200)throw Error('Displayed but unanswered counted');pick(current.acceptedAnswers[0]);submitAnswer();submitAnswer();if(bankProgress().done!==201)throw Error('Answer counted twice');
const saved=JSON.parse(localStorage.getItem(KEY));if(saved.attempts.length!==203)throw Error('Persistence');endRound();if(bankProgress().done!==201)throw Error('Unanswered round counted');
const last=bank.questions.find(q=>q.subject==='國土安全與移民政策');data.attempts=bank.questions.filter(q=>q.id!==last.id).map(q=>({id:q.id,selected:0,correct:true}));startBankRound();if(!data.activeRound.queue.includes(last.id)||data.activeRound.queue.length>3)throw Error('Archive or final remainder missing');while(data.activeRound){pick(current.acceptedAnswers[0]);submitAnswer();nextQuestion();quiz()}if(bankProgress().done!==bank.questions.length||data.activeRound)throw Error('Completion');
startBankRound(true);if(data.activeRound.queue.length!==10)throw Error('Review');pick(current.acceptedAnswers[0]);submitAnswer();if(bankProgress().done!==bank.questions.length)throw Error('Review inflated count');
data.attempts=bank.questions.slice(0,100).map((q,i)=>({id:q.id,selected:0,correct:i>=50}));const mixed=adaptiveQueue(bank.questions),lastAnswers=latest();if(mixed.length!==10||mixed.filter(q=>!lastAnswers.has(q.id)).length!==8||mixed.filter(q=>lastAnswers.get(q.id)?.correct===true).length!==1||mixed.some(q=>data.attempts.slice(-20).some(a=>a.id===q.id)))throw Error('Adaptive mix or recent avoidance');
const splitPaper=bank.papers.find(p=>new Set(bank.questions.filter(q=>q.paperId===p.id).map(q=>q.subject)).size>1);
const splitQuestions=bank.questions.filter(q=>q.paperId===splitPaper.id);
subject=splitQuestions.find(q=>q.subject!==splitQuestions[0].subject).subject;year=String(splitPaper.rocYear);
const matching=splitQuestions.filter(q=>q.subject===subject);library();
if(!content.innerHTML.includes('本科 '+matching.length+' 題／原卷 '+splitPaper.count+' 題')||!content.innerHTML.includes(matching[0].id))throw Error('Filtered split-paper coverage or practice link');
endRound();practice(matching[0].id);if(current?.id!==matching[0].id||data.activeRound.queue.length!==1)throw Error("Direct question practice");
pick(current.acceptedAnswers[0]);submitAnswer();if(!revealed||latest().get(current.id)?.correct!==true)throw Error("Direct answer recorded");
endRound();const tracked=bank.questions[0], untouched=bank.questions[1];
data.attempts=[{id:tracked.id,correct:false},{id:tracked.id,correct:true},{id:tracked.id,correct:false}];
data.favorites=[tracked.id];data.notes={[tracked.id]:'保留筆記'};save();
const historical=localStorage.getItem(KEY);
for(const filter of ['all','wrong','frequent','favorites','correct']){
  reviewFilter=filter;mistakes();
  if(!content.innerHTML.includes('累計答對 1 次 · 累計答錯 2 次 · 最近答錯')||content.innerHTML.includes(untouched.id))throw Error('History totals or filter '+filter);
}
if(localStorage.getItem(KEY)!==historical)throw Error('Viewing counts rewrote saved history');
practice(tracked.id);if(!content.innerHTML.includes('累計答對 1 次 · 累計答錯 2 次'))throw Error('Question history missing');
pick(current.acceptedAnswers[0]);submitAnswer();submitAnswer();
if(!content.innerHTML.includes('累計答對 2 次 · 累計答錯 2 次'))throw Error('Count after submission');
reviewFilter='wrong';mistakes();if(content.innerHTML.includes(tracked.id))throw Error('Latest correct answer remains in current mistakes');
reviewFilter='frequent';mistakes();if(!content.innerHTML.includes(tracked.id))throw Error('Historical wrong attempts disappeared');
const retained=JSON.parse(localStorage.getItem(KEY));if(retained.attempts.length!==4||retained.favorites[0]!==tracked.id||retained.notes[tracked.id]!=='保留筆記')throw Error('Saved history lost');
data.attempts=[
  {id:tracked.id,time:'2026-11-08T16:00:00Z'},
  {id:tracked.id,time:'2026-11-08T15:59:59Z'},
  {id:untouched.id,time:'2026-11-08T16:01:00Z'},
  {id:untouched.id,time:'2026-11-08T16:02:00Z'},
  {id:'legacy-demo',time:'2026-11-08T16:02:00Z'},
  {id:tracked.id,time:'invalid'}
];
const daily=dailyPractice();
if(daily.size!==2||daily.get('2026-11-08')?.fresh!==1||daily.get('2026-11-08')?.total!==1||daily.get('2026-11-09')?.total!==3||daily.get('2026-11-09')?.fresh!==1)throw Error('Daily history and Taipei midnight');
home();if(!content.innerHTML.includes('每日練習紀錄')||!content.innerHTML.includes('練習 3 題 · 新題 1 題 · 重做 2 題'))throw Error('Daily progress missing from home');
const oldAttempt={id:tracked.id,time:'2026-11-09T02:00:00Z',correct:true,selected:0};
const mobileAttempt={id:tracked.id,time:'2026-11-09T01:00:00Z',correct:false,selected:1};
data.attempts=[oldAttempt];data.favorites=[tracked.id];data.notes={[tracked.id]:'網頁筆記'};
const backup={attempts:[oldAttempt,mobileAttempt],favorites:[untouched.id],notes:{[tracked.id]:'手機筆記',[untouched.id]:'新增筆記'}};
const merged=mergeBackup(backup);
if(merged.added!==1||merged.conflicts!==1||data.attempts[0]!==mobileAttempt||!latest().get(tracked.id)?.correct||data.favorites.length!==2||data.notes[tracked.id]!=='網頁筆記'||data.notes[untouched.id]!=='新增筆記')throw Error('Merge lost local records or order');
if(mergeBackup(backup).added!==0||data.attempts.length!==2)throw Error('Repeated import inflated counts');

data.attempts=[];
if(choiceForecast().complete||choiceForecast().max!==47)throw Error('Choice maximum or empty forecast');
for(const subject of CORE){
  const sample=bank.questions.filter(q=>q.grade==='三等'&&q.rocYear>=111&&q.rocYear<=115&&!q.allCredit&&q.subject===subject).slice(0,10);
  data.attempts.push(...sample.map((q,i)=>({id:q.id,correct:i<7})),{id:sample[9].id,correct:true});
}
const oldFour=bank.questions.find(q=>q.grade==='四等');data.attempts.push({id:oldFour.id,correct:true});
const forecast=choiceForecast();
if(!forecast.complete||forecast.estimated.toFixed(1)!=='32.9'||forecast.subjects.some(s=>s.done!==10))throw Error('Weighted first-attempt choice forecast');
data.profile.writtenBaseline={'國文':40,'行政法':20,'移民執法與刑事法':10};
const estimate=choiceForecastHtml();
if(!estimate.includes('42.9 分')||!estimate.includes('7.1 分')||!estimate.includes('32.5／75'))throw Error('Written baseline simulation');
`,ctx);ctx.document.querySelector=()=>({querySelector:()=>({})});
content.contains=()=>false;
vm.runInContext(fs.readFileSync(path.join(root,'sync.js'),'utf8').replace(/startCloudSync\(\);\s*$/,''),ctx);
await vm.runInContext(`(async()=>{
  owner='test-owner';
  const local={id:bank.questions[0].id,time:'2026-11-09T00:00:00Z',selected:0,correct:true};
  const remote={id:bank.questions[0].id,time:'2026-11-10T00:00:00Z',selected:1,correct:false};
  data.attempts=[local];
  let requests=0;
  client={rpc:async(name,{changes,known_revision})=>{
    if(name!=='sync_practice')throw Error('Unexpected endpoint');
    requests++;
    if(requests===1){
      if(known_revision!==null||Object.keys(changes).length!==1)throw Error('Missing first upload');
      return {data:{revision:2,attempts:syncEntries([local,remote])}};
    }
    if(known_revision!==2||Object.keys(changes).length)throw Error('Sync retried acknowledged attempts');
    return {data:{revision:2,attempts:null}};
  }};
  await syncNow();await syncNow();
  if(data.attempts.length!==2||latest().get(local.id)?.correct!==false||requests!==2)throw Error('Cloud practice not merged');
})()`,ctx);console.log('PASS: 200 unique historical questions, duplicate/legacy exclusion, unseen random pool, saved answers, partial rounds, archive coverage, final remainder, completion, review and per-question answer counts, daily practice, backup merging, cloud retries, and the weighted score simulation')})().catch(e=>{console.error(e);process.exitCode=1});
