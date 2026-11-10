'use strict';
const simpleHome=home,simpleLibrary=library,textQuestionHtml=questionHtml;
const CORE=['行政法','入出國及移民法規','移民執法與刑事法','外國文（英文）','國文','法學知識與英文'];
function ensureProgress(){data.favorites??=[];data.sessions??=[];data.profile??={target:70,scores:{}};data.profile.scores??={}}
function questionAttemptCounts(id){
  const counts=new Map();
  for(const attempt of data.attempts){
    if(id!==undefined&&attempt.id!==id)continue;
    if(!counts.has(attempt.id))counts.set(attempt.id,{correct:0,wrong:0});
    const count=counts.get(attempt.id);
    if(attempt.correct===true)count.correct++;
    if(attempt.correct===false)count.wrong++;
  }
  return counts;
}
function attemptCountText(count){return `累計答對 ${count?.correct??0} 次 · 累計答錯 ${count?.wrong??0} 次`}
function subjectStats(s){const qs=bank.questions.filter(q=>q.subject===s),byId=new Map(qs.map(q=>[q.id,q])),ids=new Set(byId.keys()),a=data.attempts.filter(a=>ids.has(a.id)),first=new Map();for(const x of a)if(!first.has(x.id)&&!byId.get(x.id)?.allCredit)first.set(x.id,x);const practiced=new Set(a.map(x=>x.id)).size;return {total:qs.length,practiced,remaining:qs.length-practiced,attempts:a.length,first:[...first.values()],wrong:a.filter(a=>!a.correct).length,correct:a.filter(a=>a.correct).length}}
function subjectProgressHtml(s){const st=subjectStats(s);return `<div class="subject-progress" aria-label="${escapeHtml(s)}題庫進度"><strong>已練 ${st.practiced} / ${st.total} 題</strong><span>尚未練 ${st.remaining} 題</span><div class="bar" role="progressbar" aria-label="${escapeHtml(s)}已練進度" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.practiced}"><div class="fill" style="width:${st.total?st.practiced/st.total*100:0}%"></div></div></div>`}
function percent(a){return a.length?Math.round(a.filter(x=>x.correct).length/a.length*100):null}
function shuffle(a){return a.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v)}
function adaptiveQueue(qs){const last=latest(),unseen=shuffle(qs.filter(q=>!last.has(q.id))),recent=new Set(data.attempts.slice(-20).map(a=>a.id));const review=correct=>{const pool=qs.filter(q=>last.has(q.id)&&last.get(q.id).correct===correct);return [...shuffle(pool.filter(q=>!recent.has(q.id))),...shuffle(pool.filter(q=>recent.has(q.id)))]};const wrong=review(false),correct=review(true);if(!unseen.length){const picked=[...wrong.slice(0,8),...correct.slice(0,2)];const ids=new Set(picked.map(q=>q.id));return shuffle([...picked,...wrong.filter(q=>!ids.has(q.id)),...correct.filter(q=>!ids.has(q.id))].slice(0,10))}const repeats=[...wrong.slice(0,correct.length?1:2),...correct.slice(0,1)];return shuffle([...unseen.slice(0,10-repeats.length),...repeats])}
function bankProgress(){const ids=new Set(bank.questions.map(q=>q.id)),seen=new Set(data.attempts.filter(a=>ids.has(a.id)).map(a=>a.id));return {seen,total:ids.size,done:seen.size,remaining:ids.size-seen.size}}
const practiceDateFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'});
function dailyPractice(){
  const ids=new Set(bank.questions.map(q=>q.id));
  const days=new Map(),firstDay=new Map();
  for(const attempt of data.attempts){
    if(!ids.has(attempt.id)||!attempt.time)continue;
    const time=new Date(attempt.time);
    if(!Number.isFinite(time.getTime()))continue;
    const date=practiceDateFormat.format(time);
    if(!days.has(date))days.set(date,{total:0,fresh:0});
    days.get(date).total++;
    if(!firstDay.has(attempt.id)||date<firstDay.get(attempt.id))firstDay.set(attempt.id,date);
  }
  for(const date of firstDay.values())days.get(date).fresh++;
  return days;
}
function dailyPracticeHtml(){
  const today=practiceDateFormat.format(new Date());
  const days=dailyPractice();
  const current=days.get(today)??{total:0,fresh:0};
  const previous=[...days.keys()].filter(date=>date<today).sort().reverse();
  const line=({total,fresh})=>`練習 ${total} 題 · 新題 ${fresh} 題 · 重做 ${total-fresh} 題`;
  return `<section class="panel"><h2>每日練習紀錄</h2><p><strong>今日（${today}）${line(current)}</strong></p><p class="muted">依台灣時間統計，送出答案才計入。</p>${previous.length?`<details><summary>查看歷日紀錄</summary><ul>${previous.map(date=>`<li>${date} · ${line(days.get(date))}</li>`).join('')}</ul></details>`:''}</section>`;
}
function bankProgressHtml(compact=false){const p=bankProgress();if(compact)return `<section class="panel bank-progress"><p><strong>全題庫已考 ${p.done} / ${p.total} 題</strong> · 尚未考 ${p.remaining} 題</p><p class="muted">每道題只計一次，送出答案即儲存。</p></section>`;const rate=p.total?Math.round(p.done/p.total*1000)/10:0;return `<section class="panel bank-progress"><h2>我的選擇題進度</h2><div class="stats"><div class="stat"><strong>${p.done} / ${p.total}</strong><span>已考不同題目</span></div><div class="stat"><strong>${p.remaining}</strong><span>尚未考過</span></div></div><div class="bar" role="progressbar" aria-label="全題庫已考進度" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><div class="fill" style="width:${p.total?p.done/p.total*100:0}%"></div></div><p>已完成 ${rate}% · 送出答案才計入，重做同一題不重複累計。既有答題紀錄已自動納入。</p><button class="primary" onclick="startBankRound(${p.remaining===0})">${p.remaining?'智慧隨機練習 · 優先練完題庫':'全部考過了！隨機複習 10 題'}</button><p class="muted">從全部 ${p.total} 題抽選，包含三等、四等及舊制政策補充題；不受下方科目與年度篩選影響。每輪以 8～10 題未考題為主，最多穿插 2 題複習；答對題最多 1 題，錯題優先，近期考過的盡量避開。接近完成時可不足 10 題。作答會先儲存在本機，登入同一個帳號後可在手機與電腦自動同步。</p><div class="actions progress-backup"><button onclick="downloadBackup()">匯出進度</button><label class="filelabel">載入其他裝置的備份<input aria-label="載入其他裝置的備份" type="file" accept=".json" onchange="restore(event,true)"></label></div><p class="muted">手機先匯出，再於此載入。合併會保留本機作答並略過重複紀錄。</p><details><summary>查看各科已考題數</summary>${[...new Set(bank.questions.map(q=>q.subject))].map(s=>{const qs=bank.questions.filter(q=>q.subject===s);return `<p>${escapeHtml(s)}：${qs.filter(q=>p.seen.has(q.id)).length} / ${qs.length} 題</p>`}).join('')}</details></section>`}
function startBankRound(review=false){ensureProgress();const p=bankProgress(),queue=adaptiveQueue(bank.questions);if(!queue.length){go('home');return}if(data.activeRound&&!confirm('要結束尚未完成的一輪，改開全題庫隨機練習嗎？'))return;if(data.activeRound)finishRound(false);data.activeRound={id:'bank-'+Date.now(),subject:p.remaining?'全題庫智慧練習':'全題庫隨機複習',queue:queue.map(q=>q.id),index:0,started:new Date().toISOString()};current=null;selected=null;revealed=false;save();go('quiz')}
function startRound(s){ensureProgress();if(data.activeRound&&!confirm('要結束尚未完成的一輪，改開新一輪嗎？'))return;if(data.activeRound)finishRound(false);subject=s;const qs=pool(),queue=adaptiveQueue(qs);if(!queue.length){alert('這個篩選範圍沒有題目，請調整年度、科目或練習範圍。');return}data.activeRound={id:'round-'+Date.now(),subject:s,queue:queue.map(q=>q.id),index:0,started:new Date().toISOString()};current=null;selected=null;revealed=false;save();go('quiz')}
practice=function(id){
  const question=bank.questions.find(q=>q.id===id);
  if(!question)return;
  ensureProgress();
  if(data.activeRound&&!confirm('要結束尚未完成的一輪，改練這道題嗎？'))return;
  if(data.activeRound)finishRound(false);
  data.activeRound={id:'direct-'+Date.now(),subject:question.subject,queue:[id],index:0,started:new Date().toISOString()};
  current=null;selected=null;revealed=false;save();go('quiz');
};
function finishRound(show=true){ensureProgress();const r=data.activeRound;if(!r)return;const a=data.attempts.filter(a=>a.roundId===r.id),correct=a.filter(a=>a.correct).length;const result={...r,completed:a.length===r.queue.length,ended:new Date().toISOString(),answered:a.length,correct,wrong:a.length-correct};data.sessions.push(result);data.activeRound=null;data.lastRoundId=result.id;current=null;save();if(show)quiz()}
function endRound(){finishRound()}
nextQuestion=function(){const r=data.activeRound;if(!r)return;const answered=data.attempts.some(a=>a.id===current?.id&&a.roundId===r.id);if(!answered)return;if(r.index+1>=r.queue.length){finishRound();return}r.index++;current=null;selected=null;revealed=false;save()};
function toggleFavorite(id){ensureProgress();data.favorites=data.favorites.includes(id)?data.favorites.filter(x=>x!==id):[...data.favorites,id];save();go(tab)}
function keypoint(q){const answer=q.acceptedAnswers.map(i=>`${'ABCD'[i]}：${q.choices[i]}`).join('；');if(q.allCredit)return '官方更正為一律給分，這題不適合用來判斷熟練度。';const negative=/錯誤|不正確|何者非|何者不|不包括|不是|不屬於/.test(q.question);return `${q.subject.includes('英文')?'語句／閱讀重點':negative?'審題重點：這題要找「不符合」的選項':'答題重點'}：${negative?'先辨識題目的否定問法。':''}依該年度官方答案，應選 ${answer}。${q.subject.includes('英文')?'請把答案帶回原句或共用文章核對語意。':'請把正確選項與題幹條件一起記憶；歷屆法規題以當年度版本為準。'}`}
questionHtml=function(q){ensureProgress();let html=textQuestionHtml(q);html=html.replace('<h2 class="question-title">',`<div class="actions"><button aria-pressed="${data.favorites.includes(q.id)}" onclick="toggleFavorite('${q.id}')">${data.favorites.includes(q.id)?'★ 已收藏':'☆ 收藏這題'}</button><span class="muted">${attemptCountText(questionAttemptCounts(q.id).get(q.id))}</span></div><h2 class="question-title">`);html=html.replace('<button onclick="nextQuestion();quiz()">跳過</button>','<button onclick="endRound()">結束本輪</button>');if(revealed){const at=html.lastIndexOf('<div class="actions">');html=html.slice(0,at)+`<section class="keypoint"><h3>簡短要點</h3><p>${escapeHtml(keypoint(q))}</p><label>我的筆記<textarea aria-label="我的筆記" onchange="saveNote('${q.id}',this.value)">${escapeHtml(data.notes?.[q.id]||'')}</textarea></label></section>`+html.slice(at);}return html};
function saveNote(id,value){data.notes??={};data.notes[id]=value;save()}
submitAnswer=function(){ensureProgress();if(!current||selected===null||revealed)return;const r=data.activeRound;if(!r||data.attempts.some(a=>a.roundId===r.id&&a.id===current.id))return;data.attempts.push({id:current.id,selected,correct:current.acceptedAnswers.includes(selected),time:new Date().toISOString(),roundId:r.id});revealed=true;save();quiz()};
quiz=function(){ensureProgress();const r=data.activeRound;if(r){const q=bank.questions.find(q=>q.id===r.queue[r.index]);if(!q){finishRound();return}if(current?.id!==q.id){current=q;selected=null;revealed=false}const a=data.attempts.find(a=>a.roundId===r.id&&a.id===q.id);if(a){selected=a.selected;revealed=true}const answered=data.attempts.filter(a=>a.roundId===r.id);root(`${bankProgressHtml(true)}<section class="panel"><h2>${r.subject.startsWith('全題庫')?'全題庫挑戰':SUBJECTS.includes(r.subject)?'三等新制備考':'舊制補充複習'}｜${escapeHtml(r.subject)} · 每輪 ${r.queue.length} 題</h2>${subjectProgressHtml(q.subject)}<p class="muted">本科題庫總進度（全部年度、原始三等與四等合計）</p><p>第 ${r.index+1} / ${r.queue.length} 題｜已答 ${answered.length} 題｜答對 ${answered.filter(a=>a.correct).length} 題</p><div class="bar"><div class="fill" style="width:${answered.length/r.queue.length*100}%"></div></div></section>${questionHtml(q)}`);return}const last=data.sessions.find(s=>s.id===data.lastRoundId);root(`${bankProgressHtml()}<section class="panel"><h2>每科 10 題練習</h2><p>每輪從同一科目抽題，未考題優先；仍有未考題時最多穿插 2 題複習，其中答對題最多 1 題。備考類別固定為三等，納入三等與四等歷屆題。可篩選年度與科目；不足 10 題時使用此範圍全部題目。</p>${filters()}<label>練習範圍 <select aria-label="練習範圍" onchange="mode=this.value;quiz()">${[['all','全部題目'],['unseen','未做過'],['wrong','目前錯題']].map(([v,s])=>`<option value="${v}" ${mode===v?'selected':''}>${s}</option>`).join('')}</select></label><div class="subject-rounds">${(subject==='全部科目'?SUBJECTS:[subject]).map(s=>`<button class="primary" onclick="startRound('${s}')">${s} · 開始 10 題<span class="subject-progress-count">已練 ${subjectStats(s).practiced} / ${subjectStats(s).total} 題</span></button>`).join('')}</div></section>${last?roundSummary(last):''}`)};
function roundSummary(r){const attempts=data.attempts.filter(a=>a.roundId===r.id);return `<section class="panel"><h2>本輪結果 · ${escapeHtml(r.subject)}</h2><div class="stats"><div class="stat"><strong>${r.correct}</strong><span>答對</span></div><div class="stat"><strong>${r.wrong}</strong><span>答錯</span></div><div class="stat"><strong>${r.queue.length-r.answered}</strong><span>未作答</span></div></div><p>本輪得分 ${r.correct}/${r.queue.length}（${Math.round(r.correct/r.queue.length*100)} 分）。這是 10 題練習分數，不是正式筆試總分。</p>${attempts.map(a=>{const q=bank.questions.find(q=>q.id===a.id);return `<div class="listitem"><b>${a.correct?'✅':'❌'} ${escapeHtml(label(q))}</b><p>${escapeHtml(q.question)}</p><p class="muted">${escapeHtml(keypoint(q))}</p><button onclick="toggleFavorite('${q.id}')">${data.favorites.includes(q.id)?'★ 已收藏':'☆ 收藏這題'}</button></div>`}).join('')}</section>`}
practice=function(id){ensureProgress();const q=bank.questions.find(q=>q.id===id);if(!q)return;if(data.activeRound)finishRound(false);data.activeRound={id:'review-'+Date.now(),subject:q.subject,queue:[id],index:0,started:new Date().toISOString()};current=null;selected=null;revealed=false;save();go('quiz')};
let reviewFilter='all';
mistakes=function(){ensureProgress();const last=latest(),counts=questionAttemptCounts();
const qs=bank.questions.filter(q=>{
  const count=counts.get(q.id);
  switch(reviewFilter){
    case 'all':return last.has(q.id);
    case 'favorites':return data.favorites.includes(q.id);
    case 'frequent':return (count?.wrong??0)>=2;
    case 'correct':return (count?.correct??0)>0;
    default:return last.get(q.id)?.correct===false;
  }
}).sort((a,b)=>(counts.get(b.id)?.wrong??0)-(counts.get(a.id)?.wrong??0));root(`<section class="panel"><h2>作答紀錄、錯題與收藏</h2><div class="actions">${[['all','全部已作答'],['wrong','目前錯題'],['frequent','常錯題（錯 2 次以上）'],['favorites','★ 我的收藏'],['correct','曾答對的題目']].map(([v,s])=>`<button class="${reviewFilter===v?'active':''}" onclick="reviewFilter='${v}';mistakes()">${s}</button>`).join('')}</div><p>此清單 ${qs.length} 題。每次送出答案都會累計到同一題。答對後會移出「目前錯題」，答錯次數、收藏和常錯標記仍會保留。</p>${qs.map(q=>`<div class="listitem"><b>${escapeHtml(label(q))}</b><p>${escapeHtml(q.question)}</p><p class="muted">${attemptCountText(counts.get(q.id))} · ${last.get(q.id)?.correct?'最近答對':last.has(q.id)?'最近答錯':'尚未作答'}</p><div class="actions"><button onclick="practice('${q.id}')">重做這題</button><button onclick="toggleFavorite('${q.id}')">${data.favorites.includes(q.id)?'★ 已收藏':'☆ 收藏'}</button></div></div>`).join('')||'<p>目前沒有符合條件的題目。</p>'}</section>`)};
home=function(){ensureProgress();simpleHome();(content.querySelector?.('.quest-main')||content).insertAdjacentHTML('afterbegin',bankProgressHtml()+dailyPracticeHtml());const progressSubjects=[...SUBJECTS,...new Set(bank.questions.map(q=>q.subject).filter(s=>!SUBJECTS.includes(s)))];const stats=progressSubjects.map(s=>{const st=subjectStats(s);return `<div class="skill"><b>${s}</b><span class="tag">${!SUBJECTS.includes(s)?'舊制補充':s==='國文'||s==='法學知識與英文'?'共同科目':'專業科目'}</span>${subjectProgressHtml(s)}<p>答對 ${st.correct} 次 · 答錯 ${st.wrong} 次</p><p class="muted">首次作答 ${st.first.length} 題 · 正確率 ${percent(st.first)??'—'}${st.first.length?'%':''}</p><button onclick="startRound('${s}')">練 10 題</button></div>`}).join('');content.insertAdjacentHTML('beforeend',`<section class="panel"><h2>各科選擇題進度與練習</h2><p class="muted">已練題數以不同題目計算，包含全部年度的三等與四等題；重做不重複累計。</p>${data.activeRound?'<button class="primary" onclick="go(\'quiz\')">繼續尚未完成的一輪</button>':''}<div class="skills">${stats}</div><p>★ 收藏 ${data.favorites.length} 題｜已完成 ${data.sessions.filter(r=>r.completed).length} 輪</p></section>${choiceScorePanel()}`)};
function choiceScorePanel(){const first=new Map(),last=latest(),byId=new Map(bank.questions.map(q=>[q.id,q]));for(const a of data.attempts){const q=byId.get(a.id);if(q&&!q.allCredit&&!first.has(a.id))first.set(a.id,a)}const attempts=[...first.values()],wrong=bank.questions.filter(q=>!q.allCredit&&last.get(q.id)?.correct===false).length;return `<section class="panel"><h2>選擇題學習表現</h2><p>首次作答正確率：<strong>${percent(attempts)===null?'尚無紀錄':percent(attempts)+'%'}</strong>（${attempts.length} 題，不含官方一律給分題）。目前待複習錯題 ${wrong} 題。</p><p>現階段以選擇題為主，目標是練完全部 ${bank.questions.length} 題並減少錯題。重做不會增加已考不同題數；本區正確率不換算為正式考試總分。</p><button onclick="go('mistakes')">查看錯題與收藏</button></section>`}
function setScore(s,value){ensureProgress();if(value==='')delete data.profile.scores[s];else {const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)return;data.profile.scores[s]=n}save();home()}
function setTarget(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100)return;data.profile.target=n;save();home()}
function scorePanel(){const scores=data.profile.scores,target=data.profile.target,complete=CORE.every(s=>Number.isFinite(scores[s])),total=complete?CORE.reduce((n,s)=>n+scores[s]*(s==='國文'||s==='法學知識與英文'?.1:.2),0):null;const allFirst=SUBJECTS.flatMap(s=>subjectStats(s).first),accuracy=percent(allFirst);return `<section class="panel"><h2>目前程度與筆試目標差距</h2><p>歷屆測驗首次作答正確率：<strong>${accuracy===null?'尚無紀錄':accuracy+'%'}</strong>（${allFirst.length} 題，含三等／四等）。重做熟題不會提高這個指標；10 題一輪只能用來觀察練習表現。</p><p>完整筆試包含申論、作文與翻譯，請輸入最近一次<strong>完整模考各科總分（含非選擇題）</strong>，系統會依三等一般組現行配分計算總分與差距。</p><div class="skills">${CORE.map(s=>`<label class="skill">${s}<input aria-label="模考${s}" type="number" min="0" max="100" step="0.1" placeholder="尚未填寫" value="${scores[s]??''}" onchange="setScore('${s}',this.value)"></label>`).join('')}</div><label>自訂筆試目標 <input aria-label="筆試目標" type="number" min="0" max="100" step="0.1" value="${target}" onchange="setTarget(this.value)"> 分</label><p class="muted">預設 70 分為可調整的讀書目標，不是官方錄取線。尚未核定的未來年度錄取標準無法預先確定。</p><div class="notice">${total===null?'尚缺完整模考成績，無法判斷距離筆試目標的分數。填完六科後會自動計算。':`模考加權總分：${total.toFixed(2)} 分。${total<target?`距離你設定的 ${target} 分目標還差 ${(target-total).toFixed(2)} 分。`:`已超過你設定的 ${target} 分目標 ${(total-target).toFixed(2)} 分。`}`}</div>${complete?`<p>優先補強：${CORE.map(s=>({s,gap:100-scores[s],weight:s==='國文'||s==='法學知識與英文'?.1:.2})).sort((a,b)=>b.gap*b.weight-a.gap*a.weight).slice(0,2).map(x=>x.s).join('、')}。專業科目每提高 10 分，加權總分提高 2 分；普通科目每提高 10 分，加權總分提高 1 分。</p>`:''}<p class="muted">配分依現行規則：普通科目每科 10%，四科專業科目合計 80%。達到自訂目標不代表錄取，仍須依當年度錄取標準及外國文、體能測驗等條件判定。<a href="https://law.exam.gov.tw/LawContent.aspx?id=FL062361" target="_blank" rel="noopener">官方規則第 6 條 ↗</a></p></section>`}
downloadBackup=function(){ensureProgress();download('immigration-official-backup.json',{format:KEY,bankVersion:bank.version,...data})};
function mergeBackup(backup){
  const key=a=>JSON.stringify([a.id,a.time??null,a.roundId??null,a.selected,a.correct]);
  const remaining=new Map();
  for(const attempt of data.attempts){
    const id=key(attempt);
    remaining.set(id,(remaining.get(id)??0)+1);
  }
  const added=backup.attempts.filter(attempt=>{
    const id=key(attempt),count=remaining.get(id)??0;
    if(!count)return true;
    remaining.set(id,count-1);
    return false;
  });
  const timestamp=attempt=>Date.parse(attempt.time)||0;
  data.attempts=[...data.attempts,...added].sort((a,b)=>timestamp(a)-timestamp(b));
  data.favorites=[...new Set([...(data.favorites??[]),...(Array.isArray(backup.favorites)?backup.favorites:[])])];
  const sessions=new Map((data.sessions??[]).map(session=>[session.id,session]));
  for(const session of Array.isArray(backup.sessions)?backup.sessions:[]){
    if(session&&typeof session.id==='string'&&!sessions.has(session.id))sessions.set(session.id,session);
  }
  data.sessions=[...sessions.values()];
  const notes=new Map(Object.entries(data.notes??{}));
  let conflicts=0;
  for(const [id,note] of Object.entries(backup.notes??{})){
    if(typeof note!=='string'||!note.trim())continue;
    if(!notes.get(id))notes.set(id,note);
    else if(notes.get(id)!==note)conflicts++;
  }
  data.notes=Object.fromEntries(notes);
  return {added:added.length,conflicts};
}
restore=async function(e,merge=false){try{const file=e.target.files[0];if(!file)return;const x=JSON.parse(await file.text());if(x.format!==KEY||!Array.isArray(x.attempts)||!x.attempts.every(a=>typeof a.id==='string'&&typeof a.correct==='boolean'&&Number.isInteger(a.selected)&&a.selected>=0&&a.selected<4))throw Error('備份格式不正確');if(merge){if(!confirm('要把這份備份合併到目前紀錄嗎？'))return;const result=mergeBackup(x);ensureProgress();save();go('home');alert(`已合併 ${result.added} 筆作答紀錄。${result.conflicts?`有 ${result.conflicts} 則筆記內容不同，網頁保留原筆記，手機筆記仍在備份中。`:''}`);return}if(!confirm('確定還原並覆蓋目前紀錄、收藏及筆記？'))return;data={attempts:x.attempts,notes:x.notes||{},favorites:Array.isArray(x.favorites)?x.favorites:[],sessions:Array.isArray(x.sessions)?x.sessions:[],profile:x.profile||{target:70,scores:{}},activeRound:x.activeRound||null};ensureProgress();save();go('home')}catch(err){alert((merge?'合併失敗：':'還原失敗：')+err.message)}finally{e.target.value=''}};
if(bank.questions.length)go(tab);
