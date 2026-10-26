const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const ids=new Set();
for(const p of bank.papers){
 const qs=bank.questions.filter(q=>q.paperId===p.id);
 assert.equal(qs.length,p.count,p.id);
 assert.deepEqual(qs.map(q=>q.number),Array.from({length:p.count},(_,i)=>i+1));
 assert(['三等','四等'].includes(p.grade));
 assert(p.questionUrl.startsWith('https://wwwq.moex.gov.tw/exam/'));
 for(let i=1;i<=p.pages;i++)assert(fs.existsSync(path.join(root,`data/${p.id}/page-${i}.jpg`)));
 assert(fs.existsSync(path.join(root,`data/${p.id}/Q.pdf`)));
 for(const q of qs){
  assert(!ids.has(q.id));ids.add(q.id);
  assert.equal(q.grade,p.grade);assert.equal(q.rocYear,p.rocYear);assert.equal(q.originalSubject,p.originalSubject);
  assert(q.acceptedAnswers.length>0&&q.acceptedAnswers.every(a=>Number.isInteger(a)&&a>=0&&a<4));
  assert(q.page>=1&&q.page<=p.pages);
  assert(typeof q.question==='string'&&q.question.trim().length>0);
  assert(q.choices.length===4&&q.choices.every(c=>typeof c==='string'&&c.trim().length>0));
  assert.notDeepEqual(q.choices,['A','B','C','D']);
  assert(!/[\ue000-\uf8ff]/.test(q.question+q.choices.join('')+(q.passage||'')),'Unmapped PDF glyph: '+q.id);
 }
}
assert.deepEqual([...new Set(bank.papers.map(p=>p.rocYear))].sort(),[111,112,113,114,115]);
console.log(`Verified ${bank.papers.length} official papers, ${bank.questions.length} questions, source files, grades, years and answer ranges.`);
