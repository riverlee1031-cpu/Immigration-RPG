const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,'data',f)));
const current=read('bank.json');
// Keep every existing question and its stable ID, so saved progress remains valid.
const recent={papers:current.papers.filter(p=>p.rocYear>=111),questions:current.questions.filter(q=>q.rocYear>=111)};
assert.equal(recent.questions.length,1775);
const groups=['101-104','105-107','108-110'].map(y=>read('history-'+y+'.json'));
assert.equal(groups.reduce((n,g)=>n+g.questions.length,0),3550);
const bank={version:'20261108-history',papers:[...groups.flatMap(g=>g.papers),...recent.papers],questions:[...groups.flatMap(g=>g.questions),...recent.questions]};
assert.equal(bank.questions.length,5325);assert.equal(bank.papers.length,189);
assert.equal(new Set(bank.questions.map(q=>q.id)).size,5325);
for(const p of bank.papers)if(!p.sha256)p.sha256=createHash('sha256').update(fs.readFileSync(path.join(root,'data',p.id,'Q.pdf'))).digest('hex');
for(const q of bank.questions)if(!q.explanation)q.explanation='依考選部標準答案判分。未附官方解析；法規題請留意考試當年度適用版本。';
fs.writeFileSync(path.join(root,'data/bank.json'),JSON.stringify(bank)+'\n');
console.log(JSON.stringify(Object.fromEntries([...new Set(bank.questions.map(q=>q.subject))].map(s=>[s,bank.questions.filter(q=>q.subject===s).length])),null,2));
