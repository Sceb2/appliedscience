// Reference logic for the AAQ pilot. No DOM, network, eval or storage side effects.
export function seededRandom(seed=1){let x=seed>>>0;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function shuffle(a,rng){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function parseNumber(raw){
 if(typeof raw==='number')return Number.isFinite(raw)?raw:null;
 if(typeof raw!=='string')return null;
 let s=raw.trim().replace(/\u2212/g,'-').replace(/\u00a0|\u202f/g,' ');
 if(!s)return null;
 s=s.replace(/\s*[×x*]\s*10\s*\^\s*([+-]?\d+)$/i,'e$1');
 if(/[ ]/.test(s)){
  if(!/^[+-]?\d{1,3}( \d{3})+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(s))return null;
  s=s.replace(/ /g,'');
 }
 if(s.includes(',')){
  if(/^[+-]?[1-9]\d{0,2}(,\d{3})+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(s))s=s.replace(/,/g,'');
  else if(!s.includes('.')&&/^[+-]?\d*,\d+(?:e[+-]?\d+)?$/i.test(s))s=s.replace(',','.');
  else return null;
 }
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return null;
 const n=Number(s);return Number.isFinite(n)?n:null;
}
const near=(a,b,t)=>Math.abs(a-b)<=t+Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b))*8;
function inDomain(value,domain={}){return Number.isFinite(value)&&(domain.minExclusive===undefined||value>domain.minExclusive)&&(domain.maxInclusive===undefined||value<=domain.maxInclusive);}
function numericInput(part,raw){
 const valueRaw=raw&&typeof raw==='object'?raw.value:raw;
 const blank=valueRaw===undefined||valueRaw===null||(typeof valueRaw==='string'&&!valueRaw.trim());
 if(blank)return {present:false,valid:false,value:null};
 const parsed=parseNumber(valueRaw),unit=raw&&typeof raw==='object'?(raw.unit??part.answer.unit):part.answer.unit;
 const factor=part.answer.allowedUnits[unit];
 if(parsed===null||!Number.isFinite(factor))return {present:true,valid:false,value:null};
 const value=parsed*factor;
 return {present:true,valid:inDomain(value,part.domain),value,unit,raw:valueRaw};
}
function expectedEcf(rule,inputs){
 const a=inputs[0],b=inputs[1],c=rule.constant;
 switch(rule.operation){
  case 'constant-divided-by':return a!==0?c/a:NaN;
  case 'multiply-constant':return a*c;
  case 'divide-constant':return c!==0?a/c:NaN;
  case 'multiply':return a*b;
  case 'asin-degrees':return Math.asin(a)*180/Math.PI;
  default:return NaN;
 }
}
export function markQuestion(q,responses={},mode='scaffold'){
 if(q.interaction==='written-self-assessment')throw Error('Written responses use the separate self-assessment workflow.');
 if(mode==='final-answer'){
  const route=q.unscaffoldedFinalAnswerRoute;
  if(!route?.enabled)throw Error('This question has no final-answer route.');
  const part=q.parts.find(p=>p.id===route.partId),input=numericInput(part,responses[part.id]);
  const correct=input.valid&&near(input.value,part.answer.value,part.answer.absoluteTolerance);
  return {questionId:q.id,mode,maxMarks:q.maxMarks,directMarks:correct?q.maxMarks:0,ecfMarks:0,selfAssessedMarks:null,score:correct?q.maxMarks:0,parts:[],finalAnswerCorrect:correct,feedback:correct?'Correct final answer. Full credit awarded for this route.':'Check the value and units. You can use the scaffold before submitting your attempt.'};
 }
 const byId=Object.fromEntries(q.parts.map(p=>[p.id,p])),results={},parts=[];
 for(const part of q.parts){
  const raw=responses[part.id];let result={id:part.id,status:'incorrect',marks:0,credit:'none'};
  if(part.type==='choice'){
   const opt=part.options.find(o=>o.id===raw);
   if(!opt)result={...result,status:raw===undefined||raw===null||raw===''?'unanswered':'invalid',feedback:'Select one answer for this part.'};
   else if(raw===part.correctOptionId){
    const blocked=(part.requiresCorrectParts||[]).some(id=>results[id]?.status!=='direct');
    result={...result,status:blocked?'dependent':'direct',marks:blocked?0:part.marks,credit:blocked?'none':'direct',feedback:blocked?'This reason must support the correct identification in the earlier part. '+opt.feedback:opt.feedback};
   }else {
    const correctText=part.options.find(o=>o.id===part.correctOptionId).text;
    result={...result,correctAnswerText:correctText,selectedAnswerText:opt.text,feedback:`The answer is: ${correctText.replace(/\.$/,'')}. ${opt.feedback}`};
   }
  }else{
   const input=numericInput(part,raw);
   if(!input.present)result={...result,status:'unanswered',feedback:'Enter a value or intentionally submit this part blank.'};
   else if(!input.valid)result={...result,status:'invalid',feedback:'Use a finite value in the stated range and an allowed unit. '+part.incorrectFeedback};
   else if(near(input.value,part.answer.value,part.answer.absoluteTolerance))result={...result,status:'direct',marks:part.marks,credit:'direct',feedback:part.correctFeedback};
   else if(part.ecf){
    const rule=part.ecf,sourceParts=rule.inputs.map(id=>byId[id]);
    const sourceInputs=sourceParts.map(p=>numericInput(p,responses[p.id]));
    const canUse=sourceInputs.every(x=>x.valid&&inDomain(x.value,rule.inputDomain))&&(rule.requiresCorrectParts||[]).every(id=>results[id]?.status==='direct');
    const originalError=sourceInputs.some((x,i)=>x.valid&&!near(x.value,sourceParts[i].answer.value,sourceParts[i].answer.absoluteTolerance));
    const expected=canUse?expectedEcf(rule,sourceInputs.map(x=>x.value)):NaN;
    if(canUse&&originalError&&inDomain(expected,part.domain)&&near(input.value,expected,part.answer.absoluteTolerance)){
     result={...result,status:'ecf',marks:part.marks,credit:'error-carried-forward',basedOnParts:rule.inputs,methodValue:expected,feedback:`Method mark awarded (error carried forward). You used your earlier value${rule.inputs.length>1?'s':''} correctly for this step. The earlier error still needs correcting. ${part.incorrectFeedback}`};
    }else result={...result,feedback:part.incorrectFeedback};
   }else result={...result,feedback:part.incorrectFeedback};
  }
  results[part.id]=result;parts.push(result);
 }
 const directMarks=parts.filter(p=>p.credit==='direct').reduce((n,p)=>n+p.marks,0),ecfMarks=parts.filter(p=>p.credit==='error-carried-forward').reduce((n,p)=>n+p.marks,0);
 return {questionId:q.id,mode,maxMarks:q.maxMarks,directMarks,ecfMarks,selfAssessedMarks:null,score:directMarks+ecfMarks,parts};
}
export function beginSelfAssessment(q,text){
 if(q.interaction!=='written-self-assessment')throw Error('Not a written self-assessment question.');
 if(typeof text!=='string'||!text.trim())throw Error('Write an answer before revealing the marking points.');
 if(text.length>q.selfAssessment.maxCharacters)throw Error('The response is too long.');
 return {questionId:q.id,contentVersion:q.contentVersion,firstWrittenResponse:text,phase:'marking-points-revealed',selfAssessedMarks:null,directMarks:0,ecfMarks:0,maxMarks:q.maxMarks};
}
export function recordSelfScore(q,attempt,rawScore){
 if(attempt.questionId!==q.id||attempt.contentVersion!==q.contentVersion||attempt.phase!=='marking-points-revealed')throw Error('Reveal the marking points for this question version after writing first.');
 const score=parseNumber(rawScore);
 if(score===null||!Number.isInteger(score)||score<0||score>q.maxMarks)throw Error(`Enter a whole-number score from 0 to ${q.maxMarks}.`);
 return {...attempt,phase:'self-assessed',selfAssessedMarks:score,score};
}
export function eligibility(bank,selectedLessonIds,{allowDrafts=false}={}){
 const selected=new Set(selectedLessonIds),enabled=bank.questions.filter(q=>q.enabled&&(q.reviewStatus==='teacher-approved'||allowDrafts&&q.reviewStatus==='draft-for-teacher-review'));
 return {eligible:enabled.filter(q=>q.requiredLessonIds.every(l=>selected.has(l))),blocked:enabled.filter(q=>!q.requiredLessonIds.every(l=>selected.has(l))).map(q=>({id:q.id,missingLessonIds:q.requiredLessonIds.filter(l=>!selected.has(l))}))};
}
export function selectSession(bank,selectedLessonIds,{targetMarks=20,allowDrafts=false,seed=1,history={}}={}){
 if(!Number.isInteger(targetMarks)||targetMarks<1||targetMarks>100)throw Error('Invalid mark target.');
 const {eligible,blocked}=eligibility(bank,selectedLessonIds,{allowDrafts});
 const rng=seededRandom(seed),groups=new Map();
 for(const q of shuffle(eligible,rng)){
  if(!Number.isInteger(q.maxMarks)||q.maxMarks<1||q.maxMarks>targetMarks)continue;
  const key=q.familyId||q.id;(groups.get(key)||groups.set(key,[]).get(key)).push(q);
 }
 let states=new Map([['0:0:0',{marks:0,count:0,recall:0,ids:[],seen:0}]]);
 for(const group of groups.values()){
  const next=new Map(states);
  for(const state of states.values())for(const q of group){
   const marks=state.marks+q.maxMarks;if(marks>targetMarks)continue;
   const candidate={marks,count:state.count+1,recall:state.recall+Number(q.strand==='recall'),ids:[...state.ids,q.id],seen:state.seen+Number(Boolean(history[q.id]))};
   const key=`${marks}:${candidate.count}:${candidate.recall}`,previous=next.get(key);
   if(!previous||candidate.seen<previous.seen)next.set(key,candidate);
  }
  states=next;
 }
 const options=[...states.values()].filter(s=>s.count);
 options.sort((a,b)=>b.marks-a.marks||Math.abs(a.recall/a.count-.5)-Math.abs(b.recall/b.count-.5)||a.seen-b.seen);
 const best=options[0]||{marks:0,count:0,recall:0,ids:[]};
 return {questionIds:shuffle(best.ids,rng),targetMarks,actualMarks:best.marks,questionCount:best.count,recallCount:best.recall,applicationCount:best.count-best.recall,recallFraction:best.count?best.recall/best.count:null,exactMarkTarget:best.marks===targetMarks,exactRecallBalance:best.count>0&&best.recall*2===best.count,shortPool:best.marks<targetMarks,blocked,seed};
}
