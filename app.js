import {selectSession,eligibility,seededRandom,markQuestion,beginSelfAssessment,recordSelfScore,formatNumber} from './pilot-core.mjs?v=r-64a551bc1cbb50fc02e4';
import {KEYS,copy,createStore,questionKey,addAttempt,sessionStats,validateSession} from './state.mjs?v=r-64a551bc1cbb50fc02e4';
import {questionReport,reportRecipient} from './report.mjs?v=r-64a551bc1cbb50fc02e4';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=()=>$('#app'),uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const types=['selected-answer','scaffolded-calculation','answer-completion','written-self-assessment'];
const labels={'selected-answer':'Selected answers','scaffolded-calculation':'Calculations','answer-completion':'Finish the answer','written-self-assessment':'Written self-assessment'};
const defaults={schema:1,lessons:[],types:[...types],celebrations:true,sound:false,disclosures:{waves:true}};
const S={bank:null,map:null,prefs:null,progress:null,session:null,parked:null,view:'setup',seed:Date.now()>>>0,plan:null,assetCache:{},dialogFocus:null,archiveView:null,reportEmail:''};
let native;try{native=window.localStorage;}catch{}
const storage=createStore(native,message=>{if($('#storage-note'))$('#storage-note').textContent=message;});
const titleFor=id=>wavesTopics().find(t=>t.ids.includes(id))?.title||S.map.lessons.find(l=>l.id===id)?.title||id;
const qRecord=q=>S.progress.records[questionKey(q)];
const hasActive=()=>S.session&&!S.session.finished;
const current=()=>S.session?.questions[S.session.index];
function save(){
 const prefsSaved=storage.set(KEYS.prefs,S.prefs),progressSaved=storage.set(KEYS.progress,S.progress);
 const draftSaved=storage.set(KEYS.active,{schema:1,current:S.session,parked:S.parked,view:S.view});
 return prefsSaved&&progressSaved&&draftSaved;
}
window.addEventListener('revision:before-update',event=>{if(S.bank&&S.progress&&!save())event.preventDefault();});
function announce(message){const host=$('#live-status');if(!host)return;host.textContent='';queueMicrotask(()=>{if(host.isConnected)host.textContent=message;});}
function focusHeading(selector='h1'){
 const el=app().querySelector(selector);if(!el)return;el.setAttribute('tabindex','-1');el.focus({preventScroll:true});
 window.scrollTo?.({top:0,behavior:'instant'});
}
function renderShell(view){
 S.view=view;document.body.dataset.screen=view==='self-assess'?'feedback':view;
 window.AAQEffects?.clear();
 $$('.side-link').forEach(b=>{const active=b.dataset.nav===(view==='mistakes'?'mistakes':view==='progress'?'progress':'practice');b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('#session-controls').innerHTML='';
 document.documentElement.style.setProperty('--session-bar-space','0px');
}
function button(text,id,cls='btn'){return `<button type="button" class="${cls}" id="${esc(id)}">${text}</button>`;}
function wavesTopics(){
 const grouped=new Map();
 for(const l of S.map.lessons.filter(l=>l.topic==='Waves'))(grouped.get(l.group)||grouped.set(l.group,[]).get(l.group)).push(l);
 return [...grouped].map(([group,ls])=>({id:group==='Total Internal Reflection'?'WA12':group==='Uses of Waves'?'WA16':ls[0].id,title:group==='Total Internal Reflection'?'Optical Fibres':group,ids:ls.map(l=>l.id),description:group==='Total Internal Reflection'?'Refraction, critical angle, total internal reflection and fibre applications.':group==='Uses of Waves'?'Electromagnetic spectrum, analogue and digital signals, and communication.':''}));
}
function syncTopicRows(){
 $$('[data-lesson]').forEach(input=>{const ids=JSON.parse(input.dataset.lessonIds),count=ids.filter(id=>S.prefs.lessons.includes(id)).length;input.checked=count===ids.length;input.indeterminate=count>0&&count<ids.length;});
}
function matchingBank({mistakes=false}={}){
 return {...S.bank,questions:S.bank.questions.filter(q=>S.prefs.types.includes(q.interaction)&&(!mistakes||needsReview(q)))};
}
function needsReview(q){const r=qRecord(q);return !!r?.first&&!r.corrected&&(r.first.revealed||(r.latest?.result?.score??r.first.result?.score)<q.maxMarks);}
function calculatePlan(mistakes=false){
 const history=Object.fromEntries(S.bank.questions.filter(q=>qRecord(q)).map(q=>[q.id,true]));
 return selectSession(matchingBank({mistakes}),S.prefs.lessons,{targetMarks:20,allowDrafts:true,seed:S.seed,history});
}
function disclosureAttrs(id,defaultOpen=false){return `data-disclosure="${esc(id)}" ${(S.prefs.disclosures[id]??defaultOpen)?'open':''}`;}
function bindDisclosures(){
 $$('[data-disclosure]').forEach(el=>el.addEventListener('toggle',()=>{S.prefs.disclosures[el.dataset.disclosure]=el.open;save();}));
}
function lessonRow(l){
 const direct=S.bank.questions.filter(q=>l.ids.includes(q.primaryLessonId)&&S.prefs.types.includes(q.interaction));
 const count=direct.length;
 return `<label class="lesson-row"><input type="checkbox" data-lesson="${esc(l.id)}" data-lesson-ids="${esc(JSON.stringify(l.ids))}"><span><strong class="topic-name">${esc(l.title)}</strong>${l.description?`<small>${esc(l.description)}</small>`:''}<small>${count?`${count} ${count===1?'question':'questions'}`:'No matching question types'}${direct.some(q=>q.requiredLessonIds.some(id=>!l.ids.includes(id)))?' · some need other topics':''}</small></span></label>`;
}
function resumeActions(){
 let html='';
 if(hasActive())html+=button('Resume '+(S.session.mode==='practice'?'practice':'question review'),'resume-session');
 if(S.parked&&!S.parked.finished)html+=button('Return to saved practice','resume-parked','btn secondary');
 return html?`<div class="resume-actions">${html}</div>`:'';
}
function showSetup(){
 renderShell('setup');
 app().innerHTML=`<section class="card setup-page"><header class="page-heading"><h1>Choose your topics</h1><p>Select topics you have studied.</p></header>
 <details class="module-section" ${disclosureAttrs('waves',true)}><summary><span>Waves</span><span class="module-selected" id="waves-selected"></span></summary>
 <div class="topic-tools">${button('Select all Waves','select-all','btn text-button')}${button('Clear selection','select-none','btn text-button')}</div>
 <div class="wave-topic-list">${wavesTopics().map(lessonRow).join('')}</div></details>
 <details class="module-section" ${disclosureAttrs('forces')}><summary><span>Forces</span><span class="module-selected">Coming later</span></summary><p class="small-note">Questions for this unit are not available yet.</p></details>
 <details class="module-section" ${disclosureAttrs('electricity-energy')}><summary><span>Electricity and Energy</span><span class="module-selected">Coming later</span></summary><p class="small-note">Questions for this unit are not available yet.</p></details>
 <details class="practice-settings" ${disclosureAttrs('settings')}><summary>Practice settings</summary><h2>Question types</h2><div class="settings-options">${types.map(t=>`<label><input type="checkbox" data-type="${t}" ${S.prefs.types.includes(t)?'checked':''}>${labels[t]}</label>`).join('')}</div>
 <label class="topic"><input type="checkbox" id="effects-pref" ${S.prefs.celebrations?'checked':''}><span>Celebration effects<span class="topic-code">Reduced-motion preferences are respected.</span></span></label>
 <p class="small-note">Sessions target 20 available marks and an equal number of recall and application questions. Your selected lessons determine what is available.</p>
 <details ${disclosureAttrs('question-browser')}><summary>Question browser</summary><p class="small-note">Open an individual question without recording a practice score.</p><label for="review-question">Question</label><select class="review-select" id="review-question">${S.bank.questions.map(q=>`<option value="${q.id}">${esc(q.title)}</option>`).join('')}</select>${button('Open question','open-review','btn secondary')}<div class="celebration-preview-controls"><h3>Celebration previews</h3><label for="preview-celebration">Effect</label><select class="review-select" id="preview-celebration"><option value="random">Random question celebration</option><option value="comet">Comet parade</option><option value="starburst">Starburst spectacular</option><option value="ribbons">Ribbon carnival</option><option value="orbit">Orbiting stars</option><option value="trophy">Trophy triumph</option><option value="session">Perfect-session finale</option></select>${button('Play celebration','play-celebration','btn secondary')}<p id="celebration-preview-status" class="small-note" role="status"></p></div></details></details>
 <div id="missing-lessons"></div>
 <div class="setup-actions"> <div class="session-plan" id="session-plan" aria-live="polite"></div><div>${resumeActions()}${button(hasActive()?'Start a new session':'Start practice','start-practice')}</div></div>
 <p class="small-note">${S.bank.summary.questionCount} questions · ${S.bank.summary.recallQuestions} recall and ${S.bank.summary.applicationQuestions} application.</p></section>`;
 bindDisclosures();
 syncTopicRows();
 $$('[data-lesson]').forEach(el=>el.onchange=()=>{const ids=JSON.parse(el.dataset.lessonIds),selected=new Set(S.prefs.lessons);for(const id of ids)el.checked?selected.add(id):selected.delete(id);S.prefs.lessons=[...selected];syncTopicRows();S.seed=Date.now()>>>0;updatePlan();save();});
 $('#select-all').onclick=()=>setLessons(S.map.lessons.filter(l=>l.topic==='Waves').map(l=>l.id));$('#select-none').onclick=()=>setLessons([]);
 $$('[data-type]').forEach(el=>el.onchange=()=>{S.prefs.types=$$('[data-type]:checked').map(x=>x.dataset.type);S.seed=Date.now()>>>0;updatePlan();save();});
 $('#effects-pref').onchange=e=>{S.prefs.celebrations=e.target.checked;updateEffects();save();};
 $('#open-review').onclick=()=>openSingle($('#review-question').value,'review');$('#start-practice').onclick=()=>startPlan(S.plan,'practice');
 $('#play-celebration').onclick=()=>{
  const played=window.AAQEffects?.preview?.($('#preview-celebration').value);
  $('#celebration-preview-status').textContent=played?'Playing this celebration. Your progress is unchanged.':!S.prefs.celebrations?'Turn on Celebration effects above to play a preview.':'Your device’s reduced-motion setting keeps motion effects off.';
 };
 bindResume();updatePlan();save();focusHeading();
}
function setLessons(ids){S.prefs.lessons=ids;S.seed=Date.now()>>>0;syncTopicRows();updatePlan();save();}
function updatePlan(){
 S.plan=calculatePlan();const p=S.plan;
 const topics=wavesTopics(),selectedCount=topics.filter(t=>t.ids.every(id=>S.prefs.lessons.includes(id))).length,partialCount=topics.filter(t=>t.ids.some(id=>S.prefs.lessons.includes(id))&&!t.ids.every(id=>S.prefs.lessons.includes(id))).length;
 $('#waves-selected').textContent=`${selectedCount} selected${partialCount?` · ${partialCount} partly selected`:''}`;
 const message=!S.prefs.lessons.length?'Select lessons you have studied.':!S.prefs.types.length?'Select at least one question type in Practice settings.':!p.questionCount?'No questions are available yet for this selection. Check the required lessons below.':p.shortPool?`Only ${p.actualMarks} marks are available from these lessons. Start this shorter session or select more lessons.`:'';
 $('#session-plan').innerHTML=`<strong>${p.actualMarks} available marks</strong>${p.questionCount?`<p>${p.questionCount} questions · ${p.recallCount} recall · ${p.applicationCount} application</p>`:''}${message?`<p>${esc(message)}</p>`:''}${p.questionCount&&!p.exactRecallBalance?'<p class="small-note">This selection cannot provide an exact 50/50 recall split at this mark total.</p>':''}`;
 $('#start-practice').disabled=!p.questionCount;
 const missing=new Set(p.blocked.filter(x=>{const q=S.bank.questions.find(q=>q.id===x.id);return S.prefs.lessons.includes(q.primaryLessonId);}).flatMap(x=>x.missingLessonIds));
 $('#missing-lessons').innerHTML=missing.size?`<aside class="prerequisite-note"><p>Some questions need other topics: ${[...new Set([...missing].map(titleFor))].map(esc).join(', ')}.</p>${button('Select these topics too','add-prerequisites','btn secondary')}</aside>`:'';
 if($('#add-prerequisites'))$('#add-prerequisites').onclick=()=>setLessons([...new Set([...S.prefs.lessons,...wavesTopics().filter(t=>t.ids.some(id=>missing.has(id))).flatMap(t=>t.ids)])]);
}
function bindResume(){if($('#resume-session'))$('#resume-session').onclick=()=>showQuestion();if($('#resume-parked'))$('#resume-parked').onclick=resumeParked;}
function showDialog(title,content,onBind,returnFocus=document.activeElement){
 const dialog=$('#app-dialog');S.dialogFocus=returnFocus;
 dialog.innerHTML=`<div class="dialog-header"><h2 id="dialog-heading">${esc(title)}</h2>${button('Close','dialog-close','btn secondary')}</div>${content}`;
 $('#dialog-close').onclick=closeDialog;dialog.oncancel=e=>{e.preventDefault();closeDialog();};
 try{dialog.showModal();}catch{dialog.setAttribute('open','');}
 onBind?.(dialog);$('#dialog-close').focus();
}
function closeDialog(){const d=$('#app-dialog');try{d.close();}catch{d.removeAttribute('open');}if(S.dialogFocus?.isConnected)S.dialogFocus.focus();}
function startPlan(plan,mode){
 if(!plan?.questionCount)return;
 const launch=()=>{if(hasActive()){archive(S.session);S.session.finished=true;}S.parked=null;createSession(plan.questionIds,mode,plan);};
 if(hasActive())showDialog('Start a new session?',`<p>Your submitted attempts and current answers will stay in the previous session’s review.</p><div class="dialog-actions">${button('Start new session','confirm-new')}${button('Keep current session','cancel-new','btn secondary')}</div>`,()=>{$('#confirm-new').onclick=()=>{closeDialog();launch();};$('#cancel-new').onclick=closeDialog;});else launch();
}
function shuffledIds(part,rng){const a=part.options.map(o=>o.id);for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function createSession(ids,mode,plan){
 const questions=ids.map(id=>copy(S.bank.questions.find(q=>q.id===id))),rng=seededRandom(plan?.seed??Date.now());
 const session={schema:1,id:uid(),bankVersion:S.bank.bankVersion,mode,startedAt:new Date().toISOString(),finished:false,index:0,questions,entries:{},actualMarks:questions.reduce((n,q)=>n+q.maxMarks,0),selectedLessons:copy(S.prefs.lessons),seed:plan?.seed??S.seed};
 for(const q of questions){if(S.assetCache[q.asset])q.asset=S.assetCache[q.asset];session.entries[q.id]={responses:{},writtenText:'',mode:'scaffold',orders:Object.fromEntries(q.parts.filter(p=>p.type==='choice').map(p=>[p.id,shuffledIds(p,rng)])),phase:'answering',hintUsed:false,startedAt:new Date().toISOString()};}
 S.session=session;showQuestion();save();
}
function openSingle(id,mode='review'){
 const q=S.bank.questions.find(q=>q.id===id);if(!q)return;
 if(hasActive()&&!S.parked)S.parked=S.session;
 else if(hasActive())archive(S.session);
 createSession([id],mode,{seed:Date.now()>>>0});
}
function resumeParked(){if(!S.parked)return;S.session=S.parked;S.parked=null;showQuestion();save();}
function sessionMenu(){
 const s=sessionStats(S.session);
 return `<details class="session-menu"><summary>Session menu</summary><div class="session-menu-panel"><p class="small">${s.completedMarks}/${s.planned} available marks completed</p>${button('Change topics','menu-topics','btn text-button')}${button('Mistakes','menu-mistakes','btn text-button')}${button('Progress','menu-progress','btn text-button')}${button('Finish session','menu-finish','btn text-button')}<label class="topic"><input type="checkbox" id="session-sound-pref" ${S.prefs.sound?'checked':''}><span>Party-blower sound<span class="topic-code">Perfect sessions only · off by default.</span></span></label></div></details>`;
}
function tableMarkup(t){return `<table class="data-table"><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((c,i)=>i===0?`<th scope="row">${esc(c)}</th>`:`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function renderedParts(q,e){return e.mode==='final-answer'?[q.parts.find(p=>p.id===q.unscaffoldedFinalAnswerRoute.partId)]:q.parts;}
function partMarkup(q,part,e){
 const locked=e.phase!=='answering',pid=esc(part.id),r=e.responses[part.id];
 const partIndex=q.parts.indexOf(part);
 const legend=`<span class="part-label">Q${S.session.index+1}${String.fromCharCode(97+partIndex)}</span>${esc(part.prompt)} <span class="mark-count">(${e.mode==='final-answer'?q.maxMarks:part.marks} ${((e.mode==='final-answer'?q.maxMarks:part.marks)===1)?'mark':'marks'})</span>`;
 if(part.type==='choice'){
  const ids=e.orders[part.id]||part.options.map(o=>o.id);
  return `<fieldset class="answer-part" id="part-${pid}"><legend>${legend}</legend>${ids.map((id,i)=>{const o=part.options.find(o=>o.id===id);return `<label class="answer-choice"><input type="radio" name="${pid}" data-part="${pid}" value="${esc(id)}" ${r===id?'checked':''} ${locked?'disabled':''}><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span class="option-text">${esc(o.text)}</span></label>`;}).join('')}</fieldset>`;
 }
 const value=r&&typeof r==='object'?r.value:r??'',unit=r&&typeof r==='object'?r.unit:part.answer.unit,units=Object.keys(part.answer.allowedUnits);
 return `<fieldset class="answer-part" id="part-${pid}"><legend>${legend}</legend><div class="numeric-row"><input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" id="numeric-${pid}" data-number="${pid}" value="${esc(value)}" aria-label="${esc(part.prompt)}" ${locked?'disabled':''}>${units.length>1?`<label for="unit-${pid}" class="sr-only">Unit for ${esc(part.prompt)}</label><select id="unit-${pid}" data-unit="${pid}" ${locked?'disabled':''}>${units.map(u=>`<option value="${esc(u)}" ${unit===u?'selected':''}>${esc(u||'No unit')}</option>`).join('')}</select>`:`<span>${esc(part.answer.unit)}</span>`}</div></fieldset>`;
}
function completionPreview(q,e){return `${esc(q.answerOpening)} ${q.parts.map((p,i)=>{const o=p.options.find(o=>o.id===e.responses[p.id]);return o?`<span class="filled-sentence">${esc(o.text)}</span>`:`<span class="sentence-gap">[Gap ${i+1}]</span>`;}).join(' ')}`;}
function reportControls(){return `<div class="question-report-footer"><button type="button" class="btn secondary report-toggle" id="report-question" aria-expanded="false" aria-controls="question-report-panel">Report question</button><section id="question-report-panel" aria-label="Report this question" hidden></section></div>`;}
function bindQuestionReport(q,e){
 const trigger=$('#report-question'),panel=$('#question-report-panel');
 const update=()=>{
  const draft=questionReport(q,e,{issue:e.reportIssue||'',bankVersion:S.session.bankVersion,pageUrl:location.href,email:S.reportEmail});
  $('#report-preview').value=draft.text;$('#report-email').href=draft.mailto;
  $('#report-recipient').textContent=draft.recipient?`To: ${draft.recipient}`:'Add your teacher’s email address in the To field before sending.';
  return draft;
 };
 trigger.onclick=()=>{
  const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));
  if(!opening){trigger.focus();return;}
  panel.innerHTML=`<h2>Report ${esc(q.id)}</h2><p id="report-explanation"><strong>Create draft</strong> opens your email app with the question details and your answer already filled in. Check the draft, add a screenshot if useful, then send it yourself. Nothing is sent automatically.</p><p class="small-note">If no email app opens, choose <strong>Copy draft</strong> and paste it into your school email.</p><label for="report-issue">What looks wrong? <span class="small-note">(optional)</span></label><textarea id="report-issue" rows="3" maxlength="600" placeholder="For example: my correct answer was marked wrong.">${esc(e.reportIssue||'')}</textarea><p id="report-recipient" class="small-note"></p><label for="report-preview">Email draft</label><textarea id="report-preview" rows="10" readonly aria-describedby="report-explanation"></textarea><div class="report-actions"><a class="btn" id="report-email">Create draft</a>${button('Copy draft','copy-report','btn secondary')}${button('Close report','close-report','btn text-button')}</div><p id="report-status" role="status"></p>`;
  $('#report-issue').oninput=event=>{e.reportIssue=event.target.value;update();save();};
  $('#report-email').onclick=()=>{update();$('#report-status').textContent='Your email app may open now. Review the draft and send it there. If nothing opens, use Copy draft.';};
  $('#copy-report').onclick=async()=>{
   const draft=update();
   try{await window.navigator.clipboard.writeText(draft.text);if($('#report-status'))$('#report-status').textContent='Draft copied. Paste it into an email to your teacher, check it, then send it.';}
   catch{const preview=$('#report-preview');if(preview){preview.focus();preview.select();$('#report-status').textContent='Copy the selected draft text, then paste it into an email to your teacher.';}}
  };
  $('#close-report').onclick=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();};
  update();$('#report-issue').focus();
 };
 // Keep an open draft up to date when an answer changes, without opening it.
 $('#task').addEventListener('input',()=>{if(!panel.hidden)update();});
 $('#task').addEventListener('change',()=>{if(!panel.hidden)update();});
}
function showQuestion(){
 if(!S.session)return showSetup();
 const q=current(),e=S.session.entries[q.id],stats=sessionStats(S.session);
 renderShell(e.phase==='answering'?'question':'feedback');
 const number=S.session.index+1;
 app().innerHTML=`<div class="question-toolbar"><button type="button" class="progress-trigger" id="question-navigator" aria-label="Open question navigator"><span class="progress-topline"><strong>Question ${number} of ${S.session.questions.length}</strong><span>View questions ▾</span></span><progress class="session-progress" max="${stats.planned}" value="${stats.completedMarks}" aria-label="Available marks completed"></progress><span class="workload-label">${stats.completedMarks}/${stats.planned} marks completed</span></button>${button('Finish session','finish-session','btn finish-session')}</div>
 <p class="question-topic">${esc(titleFor(q.primaryLessonId))}</p><article class="card question-screen"><h1 id="question-heading"><span class="question-number">Q${number}</span><span>${esc(q.prompt)}</span></h1><p class="question-total">${q.maxMarks} ${q.maxMarks===1?'mark':'marks'}${S.session.mode==='review'?' · Question review':''}${S.session.mode==='retry'?' · Mistake review':''}</p>
 <div class="question-context">${q.dataTable?tableMarkup(q.dataTable):''}${q.asset?`<figure class="wave-figure"><img src="${esc(q.asset)}" alt="${esc(q.accessibleDescription)}"><div class="figure-actions">${button('Enlarge diagram','enlarge-diagram','btn text-button')}</div><details class="graph-data"><summary>Diagram description and data</summary><p>${esc(q.accessibleDescription)}</p></details></figure>`:''}</div>
 <div id="task">${q.interaction==='written-self-assessment'?`<label class="writing-label" for="written-response">Your answer</label><textarea class="written-response" id="written-response" maxlength="${q.selfAssessment.maxCharacters}" ${e.phase!=='answering'?'readonly':''}>${esc(e.writtenText)}</textarea>`:`${q.unscaffoldedFinalAnswerRoute?`<fieldset class="answer-part route-toggle"><legend>Answer method</legend><label><input type="radio" name="answer-mode" value="scaffold" ${e.mode==='scaffold'?'checked':''} ${e.phase!=='answering'?'disabled':''}>Use calculation steps</label><label><input type="radio" name="answer-mode" value="final-answer" ${e.mode==='final-answer'?'checked':''} ${e.phase!=='answering'?'disabled':''}>Enter a final answer</label></fieldset>`:''}${q.interaction==='answer-completion'?`<div class="answer-opening"><p class="small-note">Choose a sentence for each part to build your explanation.</p><p class="completed-answer" id="completion-preview">${completionPreview(q,e)}</p></div>`:''}${renderedParts(q,e).map(p=>partMarkup(q,p,e)).join('')}`}</div>
 ${e.phase==='answering'?`<details class="hint-panel" id="hint-panel" ${e.hintUsed?'open':''}><summary>Optional hint</summary><p>${esc(q.hint)}</p></details><div id="submission-warning"></div><div class="answer-actions">${button('Reveal answer','reveal-answer','btn text-button')}${button(q.interaction==='written-self-assessment'?'Show marking points':'Check answer','check-answer')}</div>`:''}
 <section id="feedback" tabindex="-1" aria-label="Answer feedback"></section>${reportControls()}</article>`;
 bindQuestionInputs(q,e);bindPreviewToolbar();bindQuestionReport(q,e);
 if($('#enlarge-diagram'))$('#enlarge-diagram').onclick=()=>showDialog(q.title,`<p class="small-note">Scroll horizontally if needed. ${esc(q.accessibleDescription)}</p><div class="dialog-image-scroll"><img src="${esc(q.asset)}" alt="${esc(q.accessibleDescription)}"></div>`,null,$('#enlarge-diagram'));
 if(e.phase==='answering'){
  $('#check-answer').onclick=()=>submitQuestion();$('#reveal-answer').onclick=revealAnswer;
  $('#hint-panel').addEventListener('toggle',()=>{if($('#hint-panel')?.open){e.hintUsed=true;save();}});
 }else{
  showFeedback(q,e);
 }
 save();focusHeading('#question-heading');
}
function bindQuestionInputs(q,e){
 $$('[data-part]').forEach(input=>input.onchange=()=>{e.responses[input.dataset.part]=input.value;const p=$('#completion-preview');if(p)p.innerHTML=completionPreview(q,e);save();});
 $$('[data-number]').forEach(input=>input.oninput=()=>{const part=q.parts.find(p=>p.id===input.dataset.number);e.responses[part.id]={value:input.value,unit:$(`[data-unit="${part.id}"]`)?.value??part.answer.unit};save();});
 $$('[data-unit]').forEach(input=>input.onchange=()=>{e.responses[input.dataset.unit]={value:$(`[data-number="${input.dataset.unit}"]`)?.value??'',unit:input.value};save();});
 $$('[name="answer-mode"]').forEach(input=>input.onchange=()=>{e.mode=input.value;showQuestion();});
 if($('#written-response'))$('#written-response').oninput=event=>{e.writtenText=event.target.value;save();};
}
function missingParts(q,e){return renderedParts(q,e).filter(p=>{const r=e.responses[p.id];return r===undefined||r===null||r===''||p.type==='numeric'&&String(typeof r==='object'?r.value:r).trim()==='';});}
function submitQuestion(force=false){
 const q=current(),e=S.session.entries[q.id];if(e.phase!=='answering')return;
 if(q.interaction==='written-self-assessment'){
  try{e.selfAttempt=beginSelfAssessment(q,e.writtenText);}catch(err){showValidation(err.message);return;}
  e.submission=attemptEnvelope(q,e,null,false);e.phase='self-assess';showQuestion();$('#feedback').focus();return;
 }
 const missing=missingParts(q,e);
 if(missing.length&&!force){
  $('#submission-warning').innerHTML=`<aside class="submission-warning" role="alert" tabindex="-1"><h2>Some parts are unanswered</h2><ul>${missing.map(p=>`<li>${esc(p.prompt)}</li>`).join('')}</ul><div class="row">${button('Return to answers','return-answers','btn secondary')}${button('Submit with blank parts','submit-blanks')}</div></aside>`;
  $('#return-answers').onclick=()=>{$('#submission-warning').innerHTML='';const field=document.getElementById('part-'+missing[0].id)?.querySelector('input');field?.focus();};$('#submit-blanks').onclick=()=>submitQuestion(true);$('.submission-warning').focus();return;
 }
 e.result=markQuestion(q,e.responses,e.mode);e.phase='feedback';e.submission=attemptEnvelope(q,e,e.result,false);recordSubmission(q,e);
 showQuestion();$('#feedback').focus();announce(`${e.result.score} out of ${q.maxMarks} marks. ${e.result.ecfMarks} error-carried-forward method marks.`);
 if(e.result.score===q.maxMarks&&!e.hintUsed&&S.session.mode!=='review')window.AAQEffects?.question(e.result.score,q.maxMarks);
}
function attemptEnvelope(q,e,result,revealed){return {questionId:q.id,contentVersion:q.contentVersion,requiredLessonIds:q.requiredLessonIds,strand:q.strand,interaction:q.interaction,startedAt:e.startedAt,submittedAt:new Date().toISOString(),responses:copy(e.responses),writtenText:e.writtenText,orders:copy(e.orders),mode:e.mode,result:copy(result),maxMarks:q.maxMarks,hintUsed:e.hintUsed,revealed};}
function recordSubmission(q,e){if(S.session.mode!=='review'&&!e.recorded){addAttempt(S.progress,q,e.submission);e.recorded=true;}save();}
function revealAnswer(){
 const q=current(),e=S.session.entries[q.id];
 if(q.interaction==='written-self-assessment'&&e.writtenText.trim())return submitQuestion();
 e.result={questionId:q.id,maxMarks:q.maxMarks,directMarks:0,ecfMarks:0,selfAssessedMarks:null,score:0,parts:[]};e.phase='feedback';e.submission=attemptEnvelope(q,e,e.result,true);recordSubmission(q,e);showQuestion();$('#feedback').focus();announce('Answer revealed. No marks awarded.');
}
function showValidation(message){
 let el=$('#question-validation');if(!el){el=document.createElement('p');el.id='question-validation';el.className='validation-message';el.setAttribute('role','alert');$('#task').append(el);}el.textContent=message;
 $('#written-response')?.focus();
}
function correctPartText(p){return p.type==='choice'?p.options.find(o=>o.id===p.correctOptionId).text:`${formatNumber(p.answer.value)} ${p.answer.unit}`.trim();}
function showFeedback(q,e){
 const revealed=e.submission?.revealed;
 if(e.phase==='self-assess'){
  $('#feedback').innerHTML=`<div class="feedback-panel"><h2>Check your answer</h2><p>Use these points to mark your writing.</p><ul class="self-marking">${q.selfAssessment.rubric.map(r=>`<li>${esc(r.text)} <strong>(${r.marks} mark)</strong></li>`).join('')}</ul><details class="model-answer"><summary>Example answer</summary><p>${esc(q.modelAnswer)}</p></details><div class="self-score"><label for="self-score">Your self-assessed score <span class="mark-count">(0 to ${q.maxMarks})</span></label><input id="self-score" type="number" inputmode="numeric" min="0" max="${q.maxMarks}" step="1" value="${esc(e.selfScoreDraft??'')}" aria-describedby="self-score-note self-score-error"><p id="self-score-note" class="small-note">Enter a whole number after checking the marking points.</p><p id="self-score-error" class="validation-message" role="alert"></p>${button('Save self-assessment','save-self-score')}</div></div>`;
  $('#self-score').oninput=ev=>{e.selfScoreDraft=ev.target.value;save();};
  $('#save-self-score').onclick=()=>{
   try{e.result=recordSelfScore(q,e.selfAttempt,$('#self-score').value);e.submission.result=copy(e.result);e.phase='feedback';recordSubmission(q,e);showQuestion();$('#feedback').focus();announce(`Self-assessed score saved: ${e.result.selfAssessedMarks} out of ${q.maxMarks}.`);}
   catch(err){$('#self-score-error').textContent=err.message;$('#self-score').setAttribute('aria-invalid','true');$('#self-score').focus();}
  };return;
 }
 const self=q.interaction==='written-self-assessment',r=e.result;
 const headline=revealed?'Answer revealed':self?`${r.selfAssessedMarks}/${q.maxMarks} self-assessed marks`:`${r.score}/${q.maxMarks} marks`;
 const breakdown=revealed?'No marks awarded.':self?'You awarded this score using the marking points.':`${r.directMarks} direct ${r.directMarks===1?'mark':'marks'}${r.ecfMarks?` + ${r.ecfMarks} method ${r.ecfMarks===1?'mark':'marks'} (error carried forward)`:''}${e.hintUsed?' · Hint used':''}`;
 const details=(r.parts||[]).map(result=>{const p=q.parts.find(p=>p.id===result.id),state=result.status==='direct'?'Correct':result.status==='ecf'?'Method mark awarded (error carried forward)':result.status==='unanswered'?'Not answered':result.status==='dependent'?'Linked mark not awarded':'Check this part';return `<div class="part-feedback ${result.status}"><h3>${esc(p.prompt)}</h3><p><strong>${state} · ${result.marks}/${p.marks}</strong></p>${result.status!=='direct'?`<p>${esc(result.feedback)}</p>${p.type==='numeric'?`<p>Correct value: <strong>${esc(correctPartText(p))}</strong></p>`:''}`:`<p>${esc(result.feedback)}</p>`}</div>`;}).join('');
 const detailsMarkup=r.score===q.maxMarks&&details?`<details class="marking-detail"><summary>View marking detail</summary>${details}</details>`:details;
 $('#feedback').innerHTML=`<div class="feedback-panel"><p class="feedback-score">${esc(headline)}</p><p class="feedback-breakdown">${esc(breakdown)}</p>${q.interaction==='answer-completion'?`<h2>Completed answer</h2><p>${esc(q.modelAnswer)}</p>`:''}${detailsMarkup}${!details&&!self&&!revealed?`<p>${esc(r.feedback||'')}</p>`:''}${(revealed&&q.interaction!=='answer-completion')||self?`<h2>${self?'Example answer':'Worked answer'}</h2><p>${esc(q.modelAnswer)}</p>${revealed?`<ul>${q.generalFeedback.map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}`:q.interaction!=='answer-completion'?`<details class="model-answer"><summary>Worked answer</summary><p>${esc(q.modelAnswer)}</p></details>`:''}<div class="next-action">${revealed||!self&&r.score<q.maxMarks?button('Retry Question','retry-question','btn'):''}${button(S.session.index===S.session.questions.length-1?'View summary':'Next question','next-question')}</div></div>`;
 $('#next-question').onclick=nextQuestion;if($('#retry-question'))$('#retry-question').onclick=()=>openSingle(q.id,'retry');
}
function nextQuestion(){if(S.session.index<S.session.questions.length-1){S.session.index++;showQuestion();}else finishSession();save();}
function archive(session){
 const saved=copy(session);saved.finished=true;saved.finishedAt??=new Date().toISOString();
 const existing=S.progress.sessions.findIndex(s=>s.id===saved.id);if(existing>=0)S.progress.sessions[existing]=saved;else S.progress.sessions.push(saved);
 S.progress.sessions=S.progress.sessions.slice(-12);save();
}
function finishSession(){
 if(!S.session)return showSetup();S.session.finished=true;S.session.finishedAt=new Date().toISOString();archive(S.session);showSummary(S.session);
 const stats=sessionStats(S.session);
 if(S.session.mode==='practice'&&stats.completedQuestions===S.session.questions.length&&stats.selfMax===0&&stats.selfPending===0&&!stats.revealed&&stats.direct===stats.autoMax&&stats.ecf===0)window.AAQEffects?.session();
}
function showSummary(session){
 renderShell('summary');S.archiveView=session;const s=sessionStats(session);
 app().innerHTML=`<section class="card summary-page"><h1>Session summary</h1><p>${s.completedMarks}/${s.planned} available marks completed · ${s.completedQuestions}/${session.questions.length} questions</p><div class="summary-score">${s.autoMax?`${s.direct+s.ecf}/${s.autoMax}<span>Automatically marked points · ${s.direct} direct + ${s.ecf} error-carried-forward</span>`:'<span>No automatically marked questions submitted.</span>'}</div>${s.selfMax?`<p><strong>${s.self}/${s.selfMax} self-assessed marks</strong></p>`:''}${s.selfPending?'<p class="notice">One written answer is awaiting your self-assessed score.</p>':''}${s.unsubmitted?`<p>${s.unsubmitted} ${s.unsubmitted===1?'question was':'questions were'} left unsubmitted. Any saved answers are retained below.</p>`:''}${s.revealed?`<p class="small-note">${s.revealed} ${s.revealed===1?'answer was':'answers were'} revealed without marks.</p>`:''}
 <div class="row">${button('Choose topics','summary-topics')}${s.unsubmitted||s.selfPending?button('Continue unfinished questions','continue-session','btn secondary'):''}${S.parked?button('Return to saved practice','resume-parked','btn secondary'):''}</div>
 <h2>Question review</h2>${session.questions.map(q=>{const e=session.entries[q.id];return `<details class="review-details"><summary><span>${esc(q.title)}</span><span>${e.submission?.revealed?'Revealed':e.phase==='self-assess'?'Awaiting score':e.submission?`${e.result?.score??0}/${q.maxMarks}${q.interaction==='written-self-assessment'?' self-assessed':''}`:'Not submitted'}</span></summary><p>${esc(q.prompt)}</p>${q.interaction==='written-self-assessment'&&e.writtenText?`<p class="preserved-writing">${esc(e.writtenText)}</p>`:''}${e.submission?`<p>${esc(q.modelAnswer)}</p>`:'<p>Your draft is retained for continuing the session.</p>'}${button('Review this question','review-'+q.id,'btn secondary')}</details>`;}).join('')}</section>`;
 $('#summary-topics').onclick=showSetup;if($('#resume-parked'))$('#resume-parked').onclick=resumeParked;
 if($('#continue-session'))$('#continue-session').onclick=()=>{S.session=copy(session);S.session.finished=false;S.session.index=S.session.questions.findIndex(q=>!S.session.entries[q.id].submission||S.session.entries[q.id].phase==='self-assess');showQuestion();};
 session.questions.forEach(q=>$('#review-'+q.id).onclick=()=>openSingle(q.id,'review'));save();focusHeading();
}
function showMistakes(){
 renderShell('mistakes');const eligible=eligibility(S.bank,S.prefs.lessons,{allowDrafts:true}).eligible,qs=eligible.filter(needsReview);
 const plan=calculatePlan(true);
 app().innerHTML=`<section class="card progress-page"><h1>Review mistakes</h1><p>${qs.length?`${qs.length} questions to revisit from your selected lessons.`:'No questions to revisit from your selected lessons yet.'}</p>${resumeActions()}${qs.length?`<ul class="recent-mistakes">${qs.map(q=>`<li><div><strong>${esc(q.title)}</strong><span>${esc(titleFor(q.primaryLessonId))}</span></div><button class="btn secondary" data-retry="${q.id}">Review Question</button></li>`).join('')}</ul><p class="small-note">Retries are recorded separately; first-attempt scores stay the same.</p>${plan.questionCount?button(`Practise these mistakes · ${plan.actualMarks} marks`,'start-mistakes'):''}`:''}<p>${button('Choose topics','mistakes-topics','btn text-button')}</p></section>`;
 $$('[data-retry]').forEach(b=>b.onclick=()=>openSingle(b.dataset.retry,'retry'));if($('#start-mistakes'))$('#start-mistakes').onclick=()=>startPlan(plan,'retry');$('#mistakes-topics').onclick=showSetup;bindResume();save();focusHeading();
}
function progressTotals(strand){
 const qs=S.bank.questions.filter(q=>q.strand===strand&&q.interaction!=='written-self-assessment'),records=qs.map(q=>qRecord(q)?.first).filter(a=>a&&!a.revealed);
 return {attempted:records.length,total:qs.length,direct:records.reduce((n,a)=>n+(a.result?.directMarks||0),0),ecf:records.reduce((n,a)=>n+(a.result?.ecfMarks||0),0),max:records.reduce((n,a)=>n+a.maxMarks,0)};
}
function showProgress(){
 renderShell('progress');
 app().innerHTML=`<section class="card progress-page"><h1>Your progress</h1><p>First attempts are kept separately from retries and revealed answers.</p>${resumeActions()}<div class="progress-strands">${['recall','application'].map(strand=>{const t=progressTotals(strand);return `<section><h2>${strand==='recall'?'Recall':'Application'}</h2><p><strong>${t.max?`${t.direct+t.ecf}/${t.max} automatic marks`:'Not yet attempted'}</strong></p><p class="small-note">${t.attempted}/${t.total} questions attempted</p><p class="small-note">${t.direct} direct · ${t.ecf} method marks</p></section>`;}).join('')}</div>
 <h2>By topic</h2><table class="data-table progress-table"><thead><tr><th scope="col">Topic</th><th scope="col">Automatic marks</th><th scope="col">Attempted</th></tr></thead><tbody>${wavesTopics().map(l=>{const qs=S.bank.questions.filter(q=>l.ids.includes(q.primaryLessonId)&&q.interaction!=='written-self-assessment'),as=qs.map(q=>qRecord(q)?.first).filter(a=>a&&!a.revealed);return `<tr><th scope="row">${esc(l.title)}</th><td>${as.reduce((n,a)=>n+(a.result?.score||0),0)}/${as.reduce((n,a)=>n+a.maxMarks,0)}</td><td>${as.length}/${qs.length}</td></tr>`;}).join('')}</tbody></table>
 <details><summary>Written self-assessment</summary>${S.bank.questions.filter(q=>q.interaction==='written-self-assessment').map(q=>{const r=qRecord(q);return `<p>${esc(q.title)}: ${r?.first?.revealed?'answer revealed':r?.first?`${r.first.result?.selfAssessedMarks}/${q.maxMarks} self-assessed`:'not yet self-assessed'}</p>`;}).join('')}</details>
 <details><summary>Question-by-question progress</summary>${S.bank.questions.map(q=>{const r=qRecord(q);return `<p class="small">${esc(q.title)}: ${!r?.first?'not attempted':r.first.revealed?'answer revealed':`${r.first.result?.score??0}/${q.maxMarks} first attempt`}${r?.corrected?' · corrected on retry':''}</p>`;}).join('')}</details>
 ${S.progress.sessions.length?`<h2>Saved session reviews</h2><div class="grid">${S.progress.sessions.slice().reverse().map(s=>`<button class="btn secondary" data-session-id="${s.id}">${new Date(s.startedAt).toLocaleDateString('en-GB')} · ${s.actualMarks} marks · ${s.mode==='practice'?'practice':'question review'}</button>`).join('')}</div>`:''}
 <details><summary>Storage and progress</summary><p class="small">Progress belongs to this browser and device. Clearing site data removes it. Practice still works when saving is blocked.</p>${button('Download progress data','export-backup','btn secondary')}<p>${button('Reset AAQ progress on this device','reset-progress','btn text-button')}</p></details></section>`;
 bindResume();$$('[data-session-id]').forEach(b=>b.onclick=()=>showSummary(S.progress.sessions.find(s=>s.id===b.dataset.sessionId)));
 $('#export-backup').onclick=exportBackup;
 $('#reset-progress').onclick=()=>showDialog('Reset AAQ progress?',`<p>This removes AAQ attempts and saved sessions on this device. Your lesson selections and chemistry progress stay intact.</p><div class="dialog-actions">${button('Reset AAQ progress','confirm-reset')}${button('Keep progress','cancel-reset','btn secondary')}</div>`,()=>{$('#confirm-reset').onclick=()=>{storage.resetProgress();S.progress={schema:1,records:{},sessions:[]};S.session=null;S.parked=null;save();closeDialog();showProgress();};$('#cancel-reset').onclick=closeDialog;});
 save();focusHeading();
}
function exportBackup(){const blob=new Blob([JSON.stringify({version:1,date:new Date().toISOString(),prefs:S.prefs,progress:S.progress,active:{current:S.session,parked:S.parked},originalStoredData:storage.raw()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aaq-physics-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bindSessionMenu(){
 $('#menu-topics').onclick=showSetup;$('#menu-mistakes').onclick=showMistakes;$('#menu-progress').onclick=showProgress;$('#menu-finish').onclick=finishSession;
 $('#session-sound-pref').onchange=e=>{S.prefs.sound=e.target.checked;updateEffects();save();};
 const menu=$('.session-menu');menu.onkeydown=event=>{if(event.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}};
}
const icon={topics:'<path d="M9 3h6M10 3v7l-5 9a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-9V3M8 15h8"/>',mistakes:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',finish:'<path d="M13 5H5v14h8M10 12h11m-4-4 4 4-4 4"/>'};
function mountMobileControls(){
 $('#session-controls').innerHTML=`<nav class="mobile-session-controls" aria-label="Session controls">${[['topics','Change topics'],['mistakes','Mistakes'],['finish','Finish session']].map(([id,label])=>`<button type="button" class="session-control ${id==='finish'?'finish-control':''}" data-mobile="${id}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon[id]}</svg><span>${label}</span></button>`).join('')}</nav>`;
 $$('[data-mobile]').forEach(b=>b.onclick=()=>({topics:showSetup,mistakes:showMistakes,finish:finishSession})[b.dataset.mobile]());measureBars();
}
function measureBars(){
 const bar=$('.mobile-session-controls'),nav=$('.side-nav');
 document.documentElement.style.setProperty('--session-bar-space',bar?`${bar.offsetHeight+14}px`:'0px');
 if(nav)document.documentElement.style.setProperty('--mobile-nav-space',`${nav.offsetHeight+16}px`);
 const vv=window.visualViewport;const inset=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0;
 document.documentElement.style.setProperty('--session-keyboard-inset',`${inset}px`);
}
function updateEffects(){window.AAQEffects?.setPreferences(S.prefs.celebrations,S.prefs.sound);}
async function loadContent(){
 if(window.AAQ_EMBEDDED)return copy(window.AAQ_EMBEDDED);
 await window.RevisionUpdates?.beforeBankLoad();
 const build=window.AAQ_BUILD||{};
 const read=async(file,hash)=>{
  const url=new URL(file,import.meta.url);if(build.id)url.searchParams.set('v',build.id);
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`Could not load ${file} (HTTP ${response.status}).`);
  const text=await response.text();
  if(hash&&window.crypto?.subtle){const digest=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));const actual=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');if(actual!==hash){if(window.RevisionUpdates)return window.RevisionUpdates.blockForMismatch();throw Error('Page and question data are from different releases. Open a fresh copy.');}}
  return JSON.parse(text);
 };
 const [bank,map]=await Promise.all([read('Pilot_Question_Bank.json',build.questionsSha256),read('Physics_Lesson_Map.json',build.mapSha256)]);return {bank,map};
}
function validateBank(bank,map){
 if(!Array.isArray(bank?.questions)||!bank.questions.length||!Array.isArray(map?.lessons))throw Error('The question bank or lesson map is incomplete.');
 const ids=new Set(),lessons=new Set(map.lessons.map(l=>l.id));
 for(const q of bank.questions){if(ids.has(q.id)||!Number.isInteger(q.maxMarks)||!q.parts||!q.requiredLessonIds?.every(id=>lessons.has(id)))throw Error('Question data needs checking: '+q.id);ids.add(q.id);}
}
async function boot(){
 const {bank,map}=await loadContent();validateBank(bank,map);S.bank=bank;S.map=map;
 S.reportEmail=reportRecipient(window.AAQ_REPORT_CONFIG?.email);
 if(!window.AAQ_EMBEDDED&&!S.reportEmail){try{const r=await fetch(new URL('./report-config.json',import.meta.url),{cache:'no-store'});if(r.ok)S.reportEmail=reportRecipient((await r.json()).email);}catch{}}
 const rawPrefs=storage.get(KEYS.prefs,defaults,p=>p?.schema===1&&Array.isArray(p.lessons)&&Array.isArray(p.types));
 S.prefs={...copy(defaults),...rawPrefs,lessons:rawPrefs.lessons.filter(id=>map.lessons.some(l=>l.id===id&&l.topic==='Waves')),types:rawPrefs.types.filter(t=>types.includes(t)),disclosures:rawPrefs.disclosures&&typeof rawPrefs.disclosures==='object'?rawPrefs.disclosures:{}};
 S.progress=storage.get(KEYS.progress,{schema:1,records:{},sessions:[]},p=>p?.schema===1&&p.records&&typeof p.records==='object'&&!Array.isArray(p.records)&&Object.values(p.records).every(r=>r&&typeof r==='object'&&Array.isArray(r.attempts))&&Array.isArray(p.sessions));
 S.progress.sessions=S.progress.sessions.filter(s=>!!s&&validateSession(s));
 const active=storage.get(KEYS.active,{schema:1,current:null,parked:null,view:'setup'},a=>a?.schema===1&&validateSession(a.current)&&validateSession(a.parked));S.session=active.current;S.parked=active.parked;
 updateEffects();
 const assets=[...new Set(bank.questions.map(q=>q.asset).filter(Boolean))];
 await Promise.allSettled(assets.filter(a=>!a.startsWith('data:')).map(async a=>{try{const response=await fetch(new URL(a+(window.AAQ_BUILD?.id?'?v='+encodeURIComponent(window.AAQ_BUILD.id):''),import.meta.url),{cache:'no-store'});if(response.ok)S.assetCache[a]='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(await response.text());}catch{}}));
 $$('.side-link').forEach(b=>b.onclick=()=>{if(b.dataset.nav==='practice')hasActive()?showQuestion():showSetup();else if(b.dataset.nav==='mistakes')showMistakes();else showProgress();});
 const preview=new URLSearchParams(location.search).get('preview');
 if(preview&&bank.questions.some(q=>q.id===preview)&&!(hasActive()&&S.session.questions.length===1&&current().id===preview)){openSingle(preview,'review');return;}
 if(hasActive()&&['question','feedback','self-assess'].includes(active.view))showQuestion();else if(active.view==='progress')showProgress();else if(active.view==='mistakes')showMistakes();else showSetup();
}
window.addEventListener('resize',measureBars);window.visualViewport?.addEventListener('resize',measureBars);window.visualViewport?.addEventListener('scroll',measureBars);
document.addEventListener('visibilitychange',()=>{if(document.hidden){window.AAQEffects?.clear();if(S.bank)save();}});
document.addEventListener('focusin',event=>{if(!event.target.matches?.('input,select,textarea'))return;setTimeout(()=>event.target.isConnected&&event.target.scrollIntoView?.({block:'nearest',behavior:'instant'}),150);});
await boot().catch(error=>{
 renderShell('setup');app().innerHTML=`<section class="card"><h1>The revision tool could not load</h1><p>${esc(error.message)}</p><p>Upload all files from UPLOAD-TO-GITHUB into the repository together, including the JSON files and assets folder.</p>${location.protocol==='file:'?'<p>For a double-click preview, open OPEN-PILOT.html. Use index.html on GitHub Pages.</p>':''}${button('Try loading again','reload-pilot')}</section>`;$('#reload-pilot').onclick=()=>location.reload();
});

function bindPreviewToolbar(){
 $('#question-navigator').onclick=openPreviewNavigator;
 $('#finish-session').onclick=confirmPreviewFinish;
}
function confirmPreviewFinish(){
 const stats=sessionStats(S.session),remaining=S.session.questions.length-stats.completedQuestions;
 showDialog('Finish this session?',`<p>${stats.completedQuestions} of ${S.session.questions.length} questions completed.</p><p>${remaining?`${remaining} ${remaining===1?'question is':'questions are'} unfinished. You can return to saved answers from the session summary.`:'Your answers are ready to review in the session summary.'}</p><div class="dialog-actions">${button('Keep practising','keep-practising','btn secondary')}${button('Finish session','confirm-finish','btn finish-session')}</div>`,()=>{$('#keep-practising').onclick=closeDialog;$('#confirm-finish').onclick=()=>{closeDialog();finishSession();};});
}
function openPreviewNavigator(){
 showDialog('Your questions',`<p class="small-note">Choose a question to return to it. Your answers are saved as you work.</p><div class="navigator-grid">${S.session.questions.map((q,i)=>{
 const e=S.session.entries[q.id],corrected=qRecord(q)?.corrected;
 const state=corrected?'Correct after retry':e.submission?.revealed?'Answer revealed':e.phase==='self-assess'?'Awaiting score':e.result?.score===q.maxMarks?'Correct':e.result?.score>0?'Partly correct':e.submission?'Needs review':Object.keys(e.responses).length||e.writtenText?'In progress':'Not answered';
 return `<button type="button" class="navigator-item ${state.startsWith('Correct')?'is-correct':e.submission?'needs-review':''}" data-jump="${i}" ${i===S.session.index?'aria-current="step"':''}><strong>${i+1}</strong><span>${state}</span></button>`;
 }).join('')}</div><details class="navigator-options"><summary>Session options</summary><div class="navigator-links">${button('Change topics','nav-topics','btn secondary')}${button('Mistakes','nav-mistakes','btn secondary')}${button('Progress','nav-progress','btn secondary')}</div><label class="topic"><input type="checkbox" id="nav-sound" ${S.prefs.sound?'checked':''}>Party-blower sound</label></details>`,()=>{
 $$('[data-jump]').forEach(b=>b.onclick=()=>{save();S.session.index=Number(b.dataset.jump);closeDialog();showQuestion();});
 $('#nav-topics').onclick=()=>{closeDialog();showSetup();};$('#nav-mistakes').onclick=()=>{closeDialog();showMistakes();};$('#nav-progress').onclick=()=>{closeDialog();showProgress();};$('#nav-sound').onchange=e=>{S.prefs.sound=e.target.checked;updateEffects();save();};
 });
}
