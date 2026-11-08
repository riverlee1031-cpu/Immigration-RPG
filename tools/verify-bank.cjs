const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const ids=new Set();
for(const p of bank.papers){
 const qs=bank.questions.filter(q=>q.paperId===p.id);
 assert.equal(qs.length,p.count,p.id);
 assert.deepEqual(qs.map(q=>q.number),Array.from({length:p.count},(_,i)=>i+1));
 assert(['三等','四等'].includes(p.grade));
 assert(p.questionUrl.startsWith('https://wwwq.moex.gov.tw/exam/'));
 if(p.sourceFormat!=='pdf')for(let i=1;i<=p.pages;i++)assert(fs.existsSync(path.join(root,`data/${p.id}/page-${i}.jpg`)));
 const archive=path.join(root,'data',p.id);
 const questionPdf=fs.readFileSync(path.join(archive,'Q.pdf'));
 assert.equal(createHash('sha256').update(questionPdf).digest('hex'),p.sha256,p.id+' original paper checksum');
 assert(fs.existsSync(path.join(archive,'S.pdf')),p.id+' missing official answer');
 if(p.correctionUrl)assert(fs.existsSync(path.join(archive,'M.pdf')),p.id+' missing official correction');
 for(const q of qs){
  assert(!ids.has(q.id));ids.add(q.id);
  assert.equal(q.grade,p.grade);assert.equal(q.rocYear,p.rocYear);assert.equal(q.originalSubject,p.originalSubject);
  assert(q.acceptedAnswers.length>0&&q.acceptedAnswers.every(a=>Number.isInteger(a)&&a>=0&&a<4));
  assert(q.page>=1&&q.page<=p.pages);
  assert(typeof q.question==='string'&&(q.question.trim().length>0||q.passage?.trim().length>0));
  assert(!/^請依共用文章，選出第/.test(q.question),'Generated stem: '+q.id);
  assert(q.choices.length===4&&q.choices.every(c=>typeof c==='string'&&c.trim().length>0));
  assert.notDeepEqual(q.choices,['A','B','C','D']);
  assert(!/[\ue000-\uf8ff]/.test(q.question+q.choices.join('')+(q.passage||'')),'Unmapped PDF glyph: '+q.id);
 }
}
assert.deepEqual([...new Set(bank.papers.map(p=>p.rocYear))].sort((a,b)=>a-b),Array.from({length:15},(_,i)=>101+i));
assert.equal(bank.questions.length,5325,'Complete selected 101–115 coverage');
assert.equal(ids.size,bank.questions.length,'Every question belongs to a verified paper');
assert.equal(bank.papers.length,189,'Complete official papers with multiple-choice sections');
assert.equal(bank.questions.filter(q=>q.grade==='三等').length,2575);
assert.equal(bank.questions.filter(q=>q.grade==='四等').length,2750);
console.log(`Verified ${bank.papers.length} official papers, ${bank.questions.length} questions, source files, grades, years and answer ranges.`);
