/* Presentation-only encouragement. No changes to marks or progress records. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ChemExperience=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const messages={
  correct:['Spot on!','Nicely done!','You’ve got it!','Great work!','That’s correct!','A strong answer!'],
  partial:['Almost there!','One detail to fix','Build on that','You have part of it!','Keep going!','A useful first step'],
  incorrect:['Keep trying!','Let’s work through it','Focus on the key change','Try a different approach','A chance to learn','You can build from here'],
  retry:['You fixed it!','Good correction!','You’ve used the feedback!','That change worked!','Progress made!','Now you’ve got it!'],
  perfect:['Every mark earned!','A perfect session!','Outstanding work!','Full marks!','You nailed the whole set!','What a finish!']
 };
 function messagePicker(rng=Math.random){const bags={},last={};return category=>{const source=messages[category]||messages.incorrect;if(!bags[category]?.length){const bag=[...source];for(let i=bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}if(bag[bag.length-1]===last[category])[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];bags[category]=bag}return last[category]=bags[category].pop()}}
 function perfectSession(session,bank){return !!session.finished&&session.mode!=='preview'&&session.ids.length>0&&session.ids.every(id=>{const q=bank.questions.find(q=>q.id===id),a=session.attempts[id];return !!q&&!!a?.first&&!a.revealed&&a.result?.complete===true&&a.result.score===q.maxMark&&a.result.max===q.maxMark})}
 function category(result,previous){return result.score===result.max?(previous&&(previous.revealed||previous.first?.score<previous.first?.max||previous.correctAfterRetry)?'retry':'correct'):result.score>0?'partial':'incorrect'}
 function fullMarkSubmission(result,mode,{submitted=false,revealed=false}={}){return submitted&&!revealed&&mode!=='challenge'&&result.max>0&&result.complete===true&&result.score===result.max}
 function questionCelebration(result,mode,options){return fullMarkSubmission(result,mode,options)?result.max>=3?'confetti':'varied':null}
 function effectPicker(rng=Math.random){let bag=[],last;return ()=>{if(!bag.length){bag=['shooting-star','thumbs-up','growing-star'];for(let i=bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}if(bag[bag.length-1]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]]}return last=bag.pop()}}
 return {messages,messagePicker,perfectSession,category,fullMarkSubmission,questionCelebration,effectPicker};
});
