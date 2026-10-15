// Reports stay on the student's device until they choose to send an email.
export const PILOT_VERSION='0.5.0';
export function reportRecipient(value){return typeof value==='string'&&/^[^\s@<>,;?&#]+@[^\s@<>,;?&#]+\.[^\s@<>,;?&#]+$/.test(value.trim())?value.trim():'';}
export function questionReport(q,entry,{issue='',bankVersion='',pageUrl='',email=''}={}){
 let link='Offline preview';
 try{const u=new URL(pageUrl);if(/^https?:$/.test(u.protocol)){u.search='';u.hash='';u.searchParams.set('preview',q.id);link=u.href;}}catch{}
 const parts=entry.mode==='final-answer'?q.parts.filter(p=>p.id===q.unscaffoldedFinalAnswerRoute?.partId):q.parts;
 const answers=q.interaction==='written-self-assessment'?[entry.writtenText?.trim()||'[No answer entered]']:parts.map(p=>{
  const r=entry.responses?.[p.id];let answer='[No answer entered]';
  if(p.type==='choice')answer=p.options.find(o=>o.id===r)?.text||answer;
  else if(r!==undefined&&r!==null){const value=typeof r==='object'?r.value:r;answer=String(value??'').trim()?`${value} ${typeof r==='object'?r.unit||'':p.answer.unit||''}`.trim():answer;}
  return `${p.prompt}\n${answer}`;
 });
 const score=entry.result?`${entry.result.score}/${q.maxMarks}${entry.result.selfAssessedMarks!==null&&entry.result.selfAssessedMarks!==undefined?' (self-assessed)':''}; ${entry.result.ecfMarks||0} error carried forward marks`:entry.phase==='self-assess'?'Awaiting self-assessment':'Not marked yet';
 const subject=`Question report: ${q.id} — ${q.title}`;
 const body=[
  'Question report — AAQ Applied Science Physics',`Question code: ${q.id}`,`Question: ${q.title}`,`App version: ${globalThis.window?.AAQ_BUILD?.label||PILOT_VERSION}`,`Bank version: ${bankVersion}`,`Question version: ${q.contentVersion}`,`Link: ${link}`,
  '', 'Problem noticed:',String(issue).trim()||'[Describe the problem here]',
  '', 'Question wording:',q.prompt,
  '', 'My answer:',answers.join('\n\n'),
  '',`Marking: ${score}`,`Answer method: ${entry.mode||'scaffold'}`,`Hint used: ${entry.hintUsed?'Yes':'No'}`,`Answer revealed: ${entry.result?.revealed||entry.submission?.revealed?'Yes':'No'}`,
  '', 'Please attach a screenshot if it helps explain the issue.'
 ].join('\n');
 const recipient=reportRecipient(email);
 return {subject,body,recipient,text:`To: ${recipient||'[Your teacher’s email address]'}\nSubject: ${subject}\n\n${body}`,mailto:`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\r?\n/g,'\r\n'))}`};
}
