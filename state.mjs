export const KEYS={prefs:'aaqPhysics.prefs.v1',progress:'aaqPhysics.progress.v1',active:'aaqPhysics.active.v1'};
export const copy=value=>JSON.parse(JSON.stringify(value));
export function createStore(backend,onNotice=()=>{}){
 const protectedKeys=new Set(),memory=new Map();let writable=!!backend;
 return {
  get(key,fallback,validate=()=>true){
   let raw;try{raw=backend?.getItem(key);}catch{writable=false;onNotice('Saving is unavailable. This visit still works; keep this tab open.');}
   if(raw===null||raw===undefined)return copy(fallback);
   try{const value=JSON.parse(raw);if(!validate(value))throw Error('Invalid saved data');memory.set(key,value);return value;}
   catch{protectedKeys.add(key);onNotice('Some saved data could not be read and has been left untouched. This visit still works.');return copy(fallback);}
  },
  set(key,value){memory.set(key,copy(value));if(protectedKeys.has(key))return false;
   if(!writable){onNotice('Saving is unavailable. This visit still works; keep this tab open.');return false;}
   try{backend.setItem(key,JSON.stringify(value));return true;}catch{onNotice('Progress could not be saved. This visit still works; keep this tab open.');return false;}
  },
  raw(){const result={};for(const key of Object.values(KEYS))try{result[key]=backend?.getItem(key)??null;}catch{result[key]=null;}return result;},
  resetProgress(){for(const key of [KEYS.progress,KEYS.active]){protectedKeys.delete(key);memory.delete(key);try{backend?.removeItem(key);}catch{}}},
 };
}
export function questionKey(q){return `${q.id}@${q.contentVersion}`;}
export function addAttempt(progress,q,attempt){
 const key=questionKey(q),record=progress.records[key]||{questionId:q.id,contentVersion:q.contentVersion,first:null,attempts:[],attemptCount:0};
 const saved=copy(attempt);record.first??=saved;record.attempts.push(saved);record.attempts=record.attempts.slice(-10);record.attemptCount++;
 record.latest=saved;record.corrected=!!record.first&&(record.first.revealed||record.first.result?.score<q.maxMarks)&&!saved.revealed&&saved.result?.score===q.maxMarks;
 progress.records[key]=record;return record;
}
export function sessionStats(session){
 const s={planned:session?.actualMarks||0,completedMarks:0,completedQuestions:0,direct:0,ecf:0,autoMax:0,self:0,selfMax:0,selfPending:0,revealed:0,unsubmitted:0};
 if(!session)return s;
 for(const q of session.questions){const entry=session.entries[q.id];
  if(!entry?.submission){s.unsubmitted++;continue;}
  if(entry.phase==='self-assess'){s.selfPending++;continue;}
  s.completedMarks+=q.maxMarks;s.completedQuestions++;
  if(entry.submission.revealed)s.revealed++;
  if(q.interaction==='written-self-assessment'){
   if(entry.result?.selfAssessedMarks!==null&&entry.result?.selfAssessedMarks!==undefined){s.self+=entry.result.selfAssessedMarks;s.selfMax+=q.maxMarks;}
  }else {s.autoMax+=q.maxMarks;s.direct+=entry.result?.directMarks||0;s.ecf+=entry.result?.ecfMarks||0;}
 }
 return s;
}
export function validateSession(s){
 if(!s)return true;
 if(s.schema!==1||!Array.isArray(s.questions)||!s.questions.length||s.questions.length>100||!Number.isInteger(s.index)||s.index<0||s.index>=s.questions.length||!s.entries||typeof s.entries!=='object')return false;
 if(new Set(s.questions.map(q=>q.id)).size!==s.questions.length)return false;
 if(s.actualMarks!==s.questions.reduce((n,q)=>n+q.maxMarks,0))return false;
 return s.questions.every(q=>{
  const e=s.entries[q.id];
  if(!e||e.phase==='feedback'&&(!e.result||!Number.isFinite(e.result.score)))return false;
  if(e.phase==='self-assess'&&(!e.selfAttempt||!q.selfAssessment))return false;
  return typeof q.id==='string'&&Number.isInteger(q.contentVersion)&&Number.isInteger(q.maxMarks)&&q.maxMarks>0&&Array.isArray(q.parts)&&Array.isArray(q.requiredLessonIds)&&typeof q.prompt==='string'&&typeof q.title==='string'&&e&&typeof e.responses==='object'&&e.responses!==null&&['answering','feedback','self-assess'].includes(e.phase)&&q.parts.every(p=>p&&typeof p.id==='string'&&(['choice','numeric'].includes(p.type))&&(p.type==='choice'?Array.isArray(p.options)&&p.options.some(o=>o.id===p.correctOptionId):p.answer&&typeof p.answer.value==='number'));
 });
}
