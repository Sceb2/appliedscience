/* Optional visual effects retained from the chemistry UI. */
(function(){
 let celebrationEffects=true,celebrationSound=false,effectTimer=null,effectAnimations=[],partyAudio=null,effectRun=0;
 const pickEffect=ChemExperience.effectPicker();
function trophySVG(){return '<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><path d="M27 20H10v19c0 19 12 31 31 34M93 20h17v19c0 19-12 31-31 34" fill="none" stroke="#a77917" stroke-width="9"/><path d="M25 10h70v35c0 29-15 44-35 44S25 74 25 45Z" fill="#e3b649" stroke="#a77917" stroke-width="3"/><path d="M33 17h12v31c0 13 3 23 10 30-14-7-22-18-22-34Z" fill="#fff0ac"/><path d="M54 88h12v24H54Z" fill="#b6861c"/><path d="M42 109h36l9 16H33Z" fill="#d9ab38" stroke="#a77917" stroke-width="3"/><rect x="25" y="125" width="70" height="10" rx="3" fill="#14563e"/><text x="60" y="61" fill="#172d3a" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="35">1</text></svg>'}

function thumbSVG(){return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M37 43 52 18c4-7 13-4 13 4v18h14c8 0 11 6 9 13L78 80c-1 4-5 6-9 6H39Z" fill="#e3b649" stroke="#14563e" stroke-width="4" stroke-linejoin="round"/><rect x="15" y="43" width="23" height="45" rx="5" fill="#14563e"/><path d="M60 48h16M59 59h15M56 70h15" stroke="#a77917" stroke-width="3" stroke-linecap="round"/></svg>'}

function blowerSVG(){return '<svg viewBox="0 0 180 90" aria-hidden="true" focusable="false"><path d="M12 57 72 33v40Z" fill="#14563e" stroke="#172d3a" stroke-width="3"/><path d="m35 48 12 18M51 41l14 29" stroke="#e3b649" stroke-width="7"/><path class="blower-paper" d="M74 53h71c24 0 25-36 5-36-12 0-17 13-7 17" fill="none" stroke="#d9ab38" stroke-width="12" stroke-linecap="round"/><path d="M8 54h16v9H8Z" fill="#172d3a"/></svg>'}

function stopPartySound(){if(partyAudio){partyAudio.pause();try{partyAudio.currentTime=0}catch{}}}

function playPartySound(){
 if(!celebrationEffects||!celebrationSound||document.hidden)return;
 if(!partyAudio){partyAudio=new Audio(window.AAQ_PARTY_SOUND||'assets/audio/party-blowers.wav?v=20261013-v1.3');partyAudio.preload='auto';partyAudio.volume=.45}
 const run=effectRun;try{partyAudio.currentTime=0;const playing=partyAudio.play();playing?.then(()=>{if(run!==effectRun||!celebrationSound||!celebrationEffects||document.hidden)stopPartySound()}).catch(()=>{})}catch{}
}

function clearEffects(){effectRun++;clearTimeout(effectTimer);effectTimer=null;effectAnimations.forEach(a=>a.cancel());effectAnimations=[];document.querySelectorAll('.confetti-layer,.shooting-star-layer,.celebration-layer').forEach(el=>el.remove());stopPartySound()}

function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}

function effectViewport(classes){
 const layer=document.createElement('div');layer.className='celebration-layer '+classes;layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const vv=window.visualViewport,width=vv?.width||innerWidth,height=vv?.height||innerHeight;
 Object.assign(layer.style,{top:(vv?.offsetTop||0)+'px',left:(vv?.offsetLeft||0)+'px',width:width+'px',height:height+'px'});
 return {layer,width,height};
}

function animateEffect(element,keyframes,options,cssClass){
 if(element.animate){try{const animation=element.animate(keyframes,options);effectAnimations.push(animation);return animation}catch{}}
 if(cssClass)element.classList.add(cssClass);return null;
}

function addConfetti(layer,height,duration){
 const colors=['#14563e','#b6861c','#759b8a','#172d3a'];
 for(let i=0;i<56;i++){
  const bit=document.createElement('span');bit.className='confetti-piece';bit.style.left=(Math.random()*100)+'%';bit.style.background=colors[i%colors.length];layer.append(bit);
  const drift=(Math.random()-.5)*160,distance=height+100,delay=Math.random()*180;
  bit.style.setProperty('--confetti-drift',drift+'px');bit.style.setProperty('--confetti-distance',distance+'px');bit.style.setProperty('--confetti-duration',duration+'ms');bit.style.setProperty('--confetti-delay',delay+'ms');
  animateEffect(bit,[{transform:'translateY(-18px) rotate(0deg)',opacity:1},{transform:`translate(${drift*.8}px,${distance*.8}px) rotate(520deg)`,opacity:1,offset:.7},{transform:`translate(${drift}px,${distance}px) rotate(650deg)`,opacity:0}],{duration,delay,easing:'ease-in',fill:'both'},'confetti-css');
 }
}

function questionConfetti(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer,height}=effectViewport('confetti-layer question-confetti');addConfetti(layer,height,2900);effectTimer=setTimeout(clearEffects,3200);
}

function thumbsUp(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer}=effectViewport('question-success-effect thumbs-up-layer');
 const symbol=document.createElement('div');symbol.className='question-effect-symbol thumbs-up';symbol.innerHTML=thumbSVG();layer.append(symbol);
 // Two finite back-and-forth cycles: upright → 180 degrees → upright.
 animateEffect(symbol,[{transform:'rotate(0deg)'},{transform:'rotate(180deg)',offset:.5},{transform:'rotate(0deg)'}],{duration:1450,iterations:2,easing:'ease-in-out',fill:'both'},'thumbs-up-css');
 animateEffect(layer,[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.75},{opacity:0}],{duration:3300,fill:'both'},'question-effect-fade');effectTimer=setTimeout(clearEffects,3400);
}

function growingStar(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer,width,height}=effectViewport('question-success-effect growing-star-layer');
 const symbol=document.createElement('div');symbol.className='growing-star';symbol.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="m50 4 14 29 32 5-23 23 5 32-28-15-28 15 5-32L4 38l32-5Z" fill="#e3b649" fill-opacity=".14" stroke="#b6861c" stroke-opacity=".65" stroke-width="1.5"/></svg>';layer.append(symbol);
 const scale=Math.ceil(Math.hypot(width,height)/28);symbol.style.setProperty('--star-expand',scale);
 animateEffect(symbol,[{transform:'scale(.35)',opacity:0},{transform:'scale(1)',opacity:1,offset:.15},{transform:`scale(${scale})`,opacity:0}],{duration:3200,easing:'ease-in',fill:'both'},'growing-star-css');effectTimer=setTimeout(clearEffects,3300);
}

function celebrateSession({sound=false}={}){
 if(!celebrationEffects)return;clearEffects();
 if(!reducedMotion()){
  const {layer,height}=effectViewport('confetti-layer perfect-session-effects');addConfetti(layer,height,3900);
  const trophy=document.createElement('div');trophy.className='session-trophy';trophy.innerHTML=trophySVG();layer.append(trophy);
  for(const side of ['left','right']){const blower=document.createElement('div');blower.className='party-blower '+side;blower.innerHTML=blowerSVG();layer.append(blower);const paper=blower.querySelector('.blower-paper');animateEffect(paper,[{transform:'scaleX(.15)'},{transform:'scaleX(1)',offset:.35},{transform:'scaleX(1)',offset:.65},{transform:'scaleX(.15)'}],{duration:1400,iterations:2,easing:'ease-in-out',fill:'both'},'blower-unroll-css')}
  animateEffect(layer,[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.52},{opacity:0}],{duration:4200,easing:'ease-out',fill:'both'},'perfect-effect-fade');
 }
 if(sound)playPartySound();if(!reducedMotion()||(sound&&celebrationSound))effectTimer=setTimeout(clearEffects,4400);
}

function shootingStar(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();
 const {layer,width,height}=effectViewport('shooting-star-layer'),star=document.createElement('div');star.className='shooting-star';star.innerHTML='<span class="shooting-star-trail"></span><span class="shooting-star-head">★</span>';layer.append(star);
 const from=`translate(-90px,${Math.round(height*.18)}px) rotate(15deg)`,to=`translate(${width+90}px,${Math.round(height*.42)}px) rotate(15deg)`;
 star.style.setProperty('--star-from',from);star.style.setProperty('--star-to',to);
 animateEffect(star,[{transform:from,opacity:0},{transform:`translate(0px,${Math.round(height*.21)}px) rotate(15deg)`,opacity:1,offset:.12},{transform:`translate(${Math.round(width*.9)}px,${Math.round(height*.4)}px) rotate(15deg)`,opacity:1,offset:.86},{transform:to,opacity:0}],{duration:3000,easing:'ease-in-out',fill:'both'},'shooting-star-css');effectTimer=setTimeout(clearEffects,3100);
}
 window.AAQEffects={
  setPreferences(effects,sound){celebrationEffects=!!effects;celebrationSound=!!sound;if(!effects)clearEffects();if(!sound)stopPartySound();},
  clear:clearEffects,
  question(score,max){if(score!==max||!max||!celebrationEffects)return;if(max>=3)questionConfetti();else {const name=pickEffect();({"shooting-star":shootingStar,"thumbs-up":thumbsUp,"growing-star":growingStar})[name]();}},
  session(){celebrateSession({sound:true});}
 };
})();
