import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseNumber,markQuestion,beginSelfAssessment,recordSelfScore,eligibility,selectSession} from './pilot-core.mjs';
const bank=JSON.parse(fs.readFileSync(new URL('./Pilot_Question_Bank.json',import.meta.url))),map=JSON.parse(fs.readFileSync(new URL('./Physics_Lesson_Map.json',import.meta.url)));
const find=id=>bank.questions.find(q=>q.id===id),allLessons=map.lessons.filter(l=>l.topic==='Waves').map(l=>l.id);
let checks=0;const check=(name,f)=>{f();checks++;console.log('PASS '+name);};
const correct=q=>Object.fromEntries(q.parts.map(p=>[p.id,p.type==='choice'?p.correctOptionId:p.answer.value]));
check('28 questions, 14 recall / 14 application, exactly one written test',()=>{
 assert.equal(bank.questions.length,28);assert.equal(bank.questions.filter(q=>q.strand==='recall').length,14);
 assert.equal(bank.questions.filter(q=>q.interaction==='written-self-assessment').length,1);
 assert.equal(bank.questions.filter(q=>q.interaction==='answer-completion').length,2);
 assert.equal(bank.questions.reduce((n,q)=>n+q.maxMarks,0),60);
});
check('All 27 auto-marked questions award full credit for authored answers',()=>{for(const q of bank.questions.filter(q=>q.interaction!=='written-self-assessment')){const r=markQuestion(q,correct(q));assert.equal(r.score,q.maxMarks,q.id);assert.equal(r.ecfMarks,0,q.id);}});
check('Every authored distractor is rejected in its part and supplies feedback',()=>{for(const q of bank.questions)for(const p of q.parts.filter(p=>p.type==='choice'))for(const o of p.options.filter(o=>o.id!==p.correctOptionId)){const r=markQuestion(q,{...correct(q),[p.id]:o.id}).parts.find(x=>x.id===p.id);assert.equal(r.marks,0,q.id+'/'+p.id);assert.ok(r.feedback.length>20);}});
check('ECF: wrong frequency followed through two conversion stages earns labelled method marks',()=>{
 const q=find('W03'),r=markQuestion(q,{...correct(q),frequency:85,'wavelength-m':4,'wavelength-mm':4000});
 assert.equal(r.directMarks,1);assert.equal(r.ecfMarks,2);assert.equal(r.score,3);assert.match(r.parts[2].feedback,/error carried forward/);
});
check('ECF requires the correct selected rearrangement',()=>{const q=find('W03'),r=markQuestion(q,{frequency:85,rearrange:q.parts[1].options[1].id,'wavelength-m':4,'wavelength-mm':4000});assert.equal(r.parts[2].marks,0);assert.equal(r.parts[3].credit,'error-carried-forward');});
check('ECF: blank or impossible values cannot seed method credit',()=>{assert.equal(markQuestion(find('W24'),{frequency:'',speed:50,wavelength:20}).ecfMarks,0);assert.equal(markQuestion(find('W09'),{index:0,sine:.5,angle:30}).parts[1].marks,0);assert.equal(markQuestion(find('W09'),{index:1.6,sine:2,angle:90}).parts[2].marks,0);});
check('A correct downstream answer earns direct credit despite an earlier error',()=>{const q=find('W03'),r=markQuestion(q,{...correct(q),frequency:85});assert.equal(r.parts[2].credit,'direct');assert.equal(r.ecfMarks,0);});
check('Independent string calculations remain independent',()=>{const q=find('W07'),r=markQuestion(q,{...correct(q),tension:100});assert.equal(r.parts[3].marks,1);assert.equal(r.score,3);});
check('Graph conversion error carried forward is explicit',()=>{const r=markQuestion(find('W24'),{period:.4,frequency:2.5,wavelength:20,speed:50});assert.equal(r.directMarks,2);assert.equal(r.ecfMarks,1);assert.equal(r.score,3);});
check('Conditional spectrum reason cannot earn credit with wrong gas pair',()=>{const q=find('W05'),r=markQuestion(q,{...correct(q),gases:q.parts[0].options[1].id});assert.equal(r.parts[1].status,'dependent');assert.equal(r.score,1);});
check('Valid numerical representations and equivalent units',()=>{
 for(const [raw,n] of [['85 000',85000],['85,000',85000],['0,625',.625],['1,5',1.5],['4e-3',.004],['4 × 10^-3',.004],['−2.5',-2.5]])assert.equal(parseNumber(raw),n);
 const q=find('W03'),r=markQuestion(q,{...correct(q),frequency:{value:'85',unit:'kHz'},'wavelength-m':{value:'4',unit:'mm'}});assert.equal(r.score,4);
});
check('Malformed or non-finite entries do not parse as correct numbers',()=>{for(const s of ['',null,'Infinity','NaN','85abc','1 2','1/2','1e999','<script>1</script>'])assert.equal(parseNumber(s),null);});
check('Final-answer route accepts correct equivalent value without guessing partial working',()=>{const r=markQuestion(find('W09'),{angle:38.7},'final-answer');assert.equal(r.score,3);assert.equal(r.ecfMarks,0);assert.equal(markQuestion(find('W09'),{angle:30},'final-answer').score,0);assert.throws(()=>markQuestion(find('W07'),{frequency:150},'final-answer'));});
check('Written response requires writing, then one bounded integer self-score',()=>{const q=find('W25');assert.throws(()=>beginSelfAssessment(q,' '));const a=beginSelfAssessment(q,'Bluetooth worked better with an obstruction.');for(const n of ['',-1,5,1.5,'NaN'])assert.throws(()=>recordSelfScore(q,a,n));const r=recordSelfScore(q,a,'3');assert.equal(r.selfAssessedMarks,3);assert.equal(r.directMarks,0);assert.equal(r.ecfMarks,0);assert.equal(r.firstWrittenResponse,a.firstWrittenResponse);assert.throws(()=>recordSelfScore(q,{...a,phase:'writing'},2));});
check('Draft gate and AND-prerequisites prevent unreviewed or untaught questions',()=>{assert.equal(eligibility(bank,allLessons).eligible.length,0);const e=eligibility(bank,['WA03'],{allowDrafts:true});assert.equal(e.eligible.length,0);assert.ok(e.blocked.find(q=>q.id==='W01').missingLessonIds.includes('WA02'));});
check('100 seeded sessions reach 20 marks and 50% recall when all Waves lessons selected',()=>{for(let seed=1;seed<=100;seed++){const s=selectSession(bank,allLessons,{seed,allowDrafts:true});assert.equal(s.actualMarks,20);assert.equal(s.recallCount,s.applicationCount);assert.equal(new Set(s.questionIds).size,s.questionCount);assert.ok(!(s.questionIds.includes('W12')&&s.questionIds.includes('W25')));}});
check('Narrow selections provide a clearly identified shorter session without new topics',()=>{const s=selectSession(bank,['WA01'],{allowDrafts:true});assert.equal(s.actualMarks,3);assert.equal(s.shortPool,true);assert.deepEqual(s.questionIds.sort(),['W02','W16']);const z=selectSession(bank,['FO01'],{allowDrafts:true});assert.equal(z.actualMarks,0);assert.deepEqual(z.questionIds,[]);});
check('Selection optimises marks then recall by count, checked against brute force',()=>{
 for(let k=0;k<12;k++){
  const qs=Array.from({length:9},(_,i)=>({id:'Q'+i,enabled:true,reviewStatus:'teacher-approved',requiredLessonIds:['L'],maxMarks:1+(i*3+k*2)%5,strand:(i+k)%3?'recall':'application'})),b={questions:qs};
  let best={m:0,d:Infinity};for(let mask=1;mask<512;mask++){const selected=qs.filter((q,i)=>mask&(1<<i)),m=selected.reduce((n,q)=>n+q.maxMarks,0);if(m>20)continue;const d=Math.abs(selected.filter(q=>q.strand==='recall').length/selected.length-.5);if(m>best.m||m===best.m&&d<best.d)best={m,d};}
  const s=selectSession(b,['L']);assert.equal(s.actualMarks,best.m);assert.ok(Math.abs(Math.abs(s.recallFraction-.5)-best.d)<1e-12);
 }
});
check('Stateful sessions can preserve option IDs despite a changed display order',()=>{const q=find('W04'),a=correct(q),r=markQuestion(q,a),copy=structuredClone(q);for(const p of copy.parts)p.options.reverse();assert.deepEqual(markQuestion(copy,a),r);});
console.log(`\n${checks} test groups passed. Reference logic only; no browser UI has been implemented or browser-tested in this content pack.`);
