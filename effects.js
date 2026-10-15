/* Optional celebrations. No dependencies, no scores or student data. */
(function(){
 'use strict';
 const names=['comet','starburst','ribbons','orbit','trophy'];
 const compact=kind=>kind==='comet'||kind==='orbit';
 const colors=['#ffd166','#f6ad24','#45c994','#66d9ed','#f18bb6','#b7a4ff'];
 let enabled=true,sound=false,bag=[],previous='',run=0,frame=null,timer=null,animations=[],partyAudio=null;
 const random=(a,b)=>a+Math.random()*(b-a),choose=a=>a[Math.floor(Math.random()*a.length)];
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 function stopSound(){if(partyAudio){partyAudio.pause();try{partyAudio.currentTime=0;}catch{}}}
 function clear(){
  run++;if(frame!==null)window.cancelAnimationFrame?.(frame);frame=null;clearTimeout(timer);timer=null;
  animations.forEach(a=>{try{a.cancel();}catch{}});animations=[];
  document.querySelectorAll('.aaq-celebration').forEach(el=>el.remove());stopSound();
 }
 function playSound(){
  if(!enabled||!sound||document.hidden)return;
  if(!partyAudio){partyAudio=new window.Audio(window.AAQ_PARTY_SOUND||'assets/audio/party-blowers.wav?v=0.1.2');partyAudio.preload='auto';partyAudio.volume=.45;}
  try{partyAudio.currentTime=0;partyAudio.play()?.catch(()=>{});}catch{}
 }
 function pick(max){
  const choices=max<=2?['comet','orbit']:max<=4?['starburst','ribbons']:['trophy'];
  const available=choices.filter(name=>name!==previous);
  previous=choose(available.length?available:choices);return previous;
 }
 function animate(el,keyframes,options,fallback){
  if(typeof el.animate==='function'){try{const a=el.animate(keyframes,options);a.finished?.catch(()=>{});animations.push(a);return;}catch{}}
  if(fallback)el.classList.add(fallback);
 }
 function starSVG(id){
  return `<svg viewBox="0 0 180 180" aria-hidden="true" focusable="false"><defs><linearGradient id="star-${id}" x1="0" x2=".8" y2="1"><stop stop-color="#fff5be"/><stop offset=".4" stop-color="#ffd16b"/><stop offset=".7" stop-color="#eaa127"/><stop offset="1" stop-color="#b7670c"/></linearGradient></defs><path d="m90 10 23 47 52 8-38 37 9 53-46-25-46 25 9-53L15 65l52-8Z" fill="url(#star-${id})" stroke="#9e5b15" stroke-width="3" stroke-linejoin="round"/><path d="m90 20-5 65-58-17 45-6Z" fill="#fff7cb" opacity=".85"/><path d="m90 85 38 60-1-43 28-29Z" fill="#9e5b15" opacity=".23"/><path d="m90 20 8 48 57 5-52 10-13 42-5-40-58-17 58 8Z" fill="#fff7cb" opacity=".25"/></svg>`;
 }
 function trophySVG(id){
  return `<svg viewBox="0 0 200 220" aria-hidden="true" focusable="false"><defs><linearGradient id="cup-${id}"><stop stop-color="#b77516"/><stop offset=".24" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#ffd269"/><stop offset=".8" stop-color="#e7a12b"/><stop offset="1" stop-color="#a4610b"/></linearGradient></defs><path d="M49 32H19v26c0 30 18 47 48 49M151 32h30v26c0 30-18 47-48 49" fill="none" stroke="#e3af3a" stroke-width="13"/><path d="M49 17h102v54c0 42-23 66-51 66S49 113 49 71Z" fill="url(#cup-${id})" stroke="#a66d15" stroke-width="3"/><path d="M61 27h15v43c0 27 8 44 22 53-24-4-37-26-37-57Z" fill="#fff5c2" opacity=".8"/><path d="M92 136h16v35H92Z" fill="url(#cup-${id})"/><path d="M75 166h50l17 25H58Z" fill="url(#cup-${id})" stroke="#a66d15" stroke-width="2"/><rect x="49" y="191" width="102" height="17" rx="5" fill="#14563e"/><rect x="82" y="195" width="36" height="8" rx="2" fill="#ffd166"/><path d="m100 47 9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3Z" fill="#fff3bb" stroke="#c28b26" stroke-width="2"/><text x="100" y="91" text-anchor="middle" font-family="Georgia,serif" font-size="31" font-weight="bold" fill="#14563e">1</text></svg>`;
 }
 function laurelSVG(){
  const leaves=Array.from({length:7},(_,i)=>`<ellipse cx="${34-i*2}" cy="${166-i*19}" rx="9" ry="18" transform="rotate(${-55+i*4} ${34-i*2} ${166-i*19})"/><ellipse cx="${53-i*4}" cy="${154-i*18}" rx="8" ry="17" transform="rotate(${25+i*5} ${53-i*4} ${154-i*18})"/>`).join('');
  return `<svg viewBox="0 0 100 220" aria-hidden="true" focusable="false"><path d="M74 205C18 169 9 91 33 24" fill="none" stroke="#b7801d" stroke-width="4"/><g fill="#eac260" stroke="#b7801d" stroke-width="1">${leaves}</g></svg>`;
 }
 function blowerSVG(){return '<svg viewBox="0 0 180 90" aria-hidden="true" focusable="false"><path d="M12 57 72 33v40Z" fill="#2baf7f" stroke="#172d3a" stroke-width="3"/><path d="m35 48 12 18M51 41l14 29" stroke="#ffd166" stroke-width="7"/><path class="aaq-blower-paper" d="M74 53h71c24 0 25-36 5-36-12 0-17 13-7 17" fill="none" stroke="#f18bb6" stroke-width="12" stroke-linecap="round"/><path d="M8 54h16v9H8Z" fill="#172d3a"/></svg>';}
 function hero(layer,kind,id){
  const wrap=document.createElement('div');wrap.className='aaq-celebration-hero aaq-'+kind;
  const title={comet:'Brilliant!',starburst:'Star performance!',ribbons:'Nailed it!',orbit:'Superb!',trophy:'Full marks!',session:'Perfect session!'}[kind];
  wrap.innerHTML=`<div class="aaq-hero-glow"></div>${kind==='ribbons'?'<div class="aaq-ribbon-banner">Nailed it!</div>':`<div class="aaq-hero-symbol">${kind==='trophy'||kind==='session'?trophySVG(id):starSVG(id)}</div>`}${kind==='trophy'||kind==='session'?`<div class="aaq-laurel left">${laurelSVG()}</div><div class="aaq-laurel right">${laurelSVG()}</div>`:''}${kind==='ribbons'?'':`<div class="aaq-celebration-caption">${title}</div>`}`;
  layer.append(wrap);
  const delay=compact(kind)?120:120;
  animate(wrap,[{transform:'translate(-50%,-35%) scale(.25) rotate(-8deg)',opacity:0},{transform:'translate(-50%,-56%) scale(1.12) rotate(3deg)',opacity:1,offset:.16},{transform:'translate(-50%,-50%) scale(1) rotate(0)',opacity:1,offset:.28},{transform:'translate(-50%,-54%) scale(1.02) rotate(0)',opacity:1,offset:.75},{transform:'translate(-50%,-65%) scale(.8) rotate(0)',opacity:0}],{duration:compact(kind)?2050:kind==='session'?4700:3300,delay,easing:'cubic-bezier(.2,.6,.3,1)',fill:'both'},'aaq-hero-css');
  wrap.querySelectorAll('.aaq-laurel').forEach((el,i)=>animate(el,[{transform:`rotate(${i?35:-35}deg) scale(.4)`,opacity:0},{transform:'rotate(0) scale(1)',opacity:1}],{duration:1100,delay:300,easing:'ease-out',fill:'both'},'aaq-laurel-css'));
  if(kind==='orbit')for(let i=0;i<2;i++){
   const orbit=document.createElement('div');orbit.className='aaq-orbit-star';orbit.innerHTML=starSVG(id+'-orbit-'+i);layer.append(orbit);
   const frames=[],radius=Math.min(parseFloat(layer.style.width)*.22,140);
   for(let j=0;j<=56;j++){const t=j/56,a=i*Math.PI*2/3+t*Math.PI*2,r=radius*(1-.72*t);frames.push({transform:`translate(${Math.cos(a)*r}px,${Math.sin(a)*r*.5}px) rotate(${t*320}deg) scale(${.8-t*.2})`,opacity:t<.1?t*10:t>.84?(1-t)/.16:1,offset:t});}
   animate(orbit,frames,{duration:2100,delay:i*70,easing:'linear',fill:'both'},'aaq-orbit-css');
  }
  if(kind==='session')for(const side of ['left','right']){
   const blower=document.createElement('div');blower.className='aaq-party-blower '+side;blower.innerHTML=blowerSVG();layer.append(blower);
   animate(blower.querySelector('.aaq-blower-paper'),[{transform:'scaleX(.15)'},{transform:'scaleX(1)',offset:.25},{transform:'scaleX(1)',offset:.7},{transform:'scaleX(.15)'}],{duration:1600,iterations:2,easing:'ease-in-out',fill:'both'},'aaq-blower-css');
  }
 }
 function fallbackConfetti(layer,count){
  for(let i=0;i<count;i++){const bit=document.createElement('span');bit.className='aaq-fallback-confetti';Object.assign(bit.style,{left:random(0,100)+'%',background:colors[i%colors.length],animationDelay:random(0,900)+'ms',animationDuration:random(2300,3500)+'ms'});bit.style.setProperty('--aaq-drift',random(-130,130)+'px');bit.style.setProperty('--aaq-turn',random(-1080,1080)+'deg');layer.append(bit);}
 }
 function scene(layer,w,h,kind,token){
  const canvas=document.createElement('canvas');canvas.className='aaq-celebration-canvas';layer.prepend(canvas);
  const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
  let ctx;try{ctx=canvas.getContext('2d');}catch{}
  if(!ctx||!window.requestAnimationFrame){canvas.remove();fallbackConfetti(layer,compact(kind)?12:w<600?70:110);return;}
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const particles=[],small=w<600,count=compact(kind)?(small?22:30):kind==='session'?(small?145:220):(small?100:160);
  const centre={x:w*.5,y:h*.39};
  function add(type,x,y,vx,vy,start=0,life=3600){particles.push({type,x,y,vx,vy,start,life,g:h*.52,size:random(6,13),length:random(26,55),color:choose(colors),angle:random(0,Math.PI*2),spin:random(-6,6),phase:random(0,Math.PI*2)});}
  function cannons(n,delay=0){for(let i=0;i<n;i++){const side=i%2?1:-1;add(i%8===0?'ribbon':i%13===0?'star':'paper',side===1?w*.94:w*.06,h*.94,-side*random(w*.23,w*.65),-random(h*.9,h*1.38),delay+random(0,460),3800);}}
  function rain(n){for(let i=0;i<n;i++){add(i%10===0?'ribbon':'paper',random(0,w),random(-80,-20),random(-45,45),random(40,130),random(0,900),3900);particles[particles.length-1].g=h*.13;}}
  function burst(n,delay=0){for(let i=0;i<n;i++){const a=Math.PI*2*i/n;add(i%7===0?'ribbon':i%4===0?'star':'paper',centre.x,centre.y,Math.cos(a)*random(w*.18,w*.55),Math.sin(a)*random(h*.16,h*.5)-h*.18,delay+random(0,170),3400);}}
  if(kind==='comet'){rain(count);}
  if(kind==='starburst'){burst(count);burst(Math.round(count*.35),700);}
  if(kind==='ribbons'){cannons(count);rain(Math.round(count*.4));}
  if(kind==='orbit'){rain(count);}
  if(kind==='trophy'){cannons(Math.round(count*.65));rain(Math.round(count*.6));}
  if(kind==='session'){cannons(count);rain(Math.round(count*.65));burst(35,1000);}
  function star(x,y,r,angle,color,alpha){
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();
   for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,l=i%2?r*.45:r;i?ctx.lineTo(Math.cos(a)*l,Math.sin(a)*l):ctx.moveTo(Math.cos(a)*l,Math.sin(a)*l);}
   ctx.closePath();ctx.fill();ctx.restore();
  }
  function cometPosition(t,i){return {x:-90+(w+180)*t,y:h*(.18+i*.12)-Math.sin(t*Math.PI)*h*.15+t*h*.2};}
  function comets(ms){
   if(kind!=='comet')return;
   for(let i=0;i<1;i++){
    const t=(ms-i*320)/1500;if(t<0||t>1.2)continue;
    for(let j=22;j>0;j--){const prev=t-j*.012;if(prev<0||prev>1)continue;const p=cometPosition(prev,i);ctx.globalAlpha=(1-j/24)*.7;ctx.fillStyle=i===1?'#66d9ed':'#ffd166';ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,(1-j/25)*8),0,Math.PI*2);ctx.fill();if(j%3===0)star(p.x+Math.sin(j*5)*15,p.y+Math.cos(j*4)*20,2.5,ms/500,'#fff1b2',.7*(1-j/25));}
    if(t<=1){const p=cometPosition(t,i);star(p.x,p.y,14+i*4,ms/900,'#fff0af',1);star(p.x,p.y,8+i*2,ms/900,'#ffd166',1);}
   }
   ctx.globalAlpha=1;
  }
  let start=null;
  function draw(now){
   if(token!==run||!layer.isConnected)return;
   if(start===null)start=now;const elapsed=now-start;ctx.clearRect(0,0,w,h);
   for(const p of particles){
    const age=elapsed-p.start;if(age<0||age>p.life)continue;
    const t=age/1000,progress=age/p.life,x=p.x+p.vx*t+Math.sin(t*3+p.phase)*16,y=p.y+p.vy*t+p.g*t*t*.5;
    if(x< -90||x>w+90||y>h+100)continue;
    const alpha=Math.min(1,age/100,(1-progress)*4),rotation=p.angle+p.spin*t;
    if(p.type==='star'){star(x,y,p.size,rotation,p.color,alpha);continue;}
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rotation);
    if(p.type==='ribbon'){
     ctx.strokeStyle=p.color;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.beginPath();
     for(let j=0;j<=14;j++){const xx=Math.sin(j*.8+t*5+p.phase)*(7+j*.4),yy=j*p.length/14;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();
    }else{
     ctx.scale(1,Math.cos(p.phase+t*6)*.75+.25);ctx.fillStyle=p.color;
     ctx.fillRect(-p.size/2,-p.size*.7,p.size,p.size*1.4);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(-p.size/2,-p.size*.7,2,p.size*1.4);
    }
    ctx.restore();
   }
   comets(elapsed);
   if(kind==='orbit'||kind==='starburst'||kind==='trophy'||kind==='session')for(let i=0;i<(kind==='orbit'?10:small?28:44);i++){
    const t=elapsed/1000,a=i*2.4+t*(kind==='orbit'?2.3:.5),r=kind==='orbit'?Math.min(w*.22,140)*(1-.45*Math.min(t/3,1)):Math.min(w*.4,310)*(elapsed/3600);
    const alpha=Math.max(0,Math.min(1,t*3,(4-t)*2));star(centre.x+Math.cos(a)*r,centre.y+Math.sin(a)*r*.6,2+i%3,t+i,'#ffe29b',alpha*.85);
   }
   if(elapsed<(compact(kind)?2400:kind==='session'?5100:4400))frame=window.requestAnimationFrame(draw);else frame=null;
  }
  frame=window.requestAnimationFrame(draw);
 }
 function play(kind){
  if(!enabled||document.hidden)return false;
  if(reduced()){
   clear();if(kind==='session'&&sound){playSound();timer=setTimeout(clear,4500);}return false;
  }
  clear();const token=run,vv=window.visualViewport,w=Math.max(1,vv?.width||window.innerWidth||800),h=Math.max(1,vv?.height||window.innerHeight||600);
  const layer=document.createElement('div');layer.className='celebration-layer aaq-celebration aaq-effect-'+kind+(compact(kind)?' aaq-compact':'');layer.dataset.effect=kind;layer.setAttribute('aria-hidden','true');layer.dataset.intensity=compact(kind)?'restrained':'full';
  Object.assign(layer.style,{width:w+'px',height:h+'px',top:(vv?.offsetTop||0)+'px',left:(vv?.offsetLeft||0)+'px'});document.body.append(layer);
  hero(layer,kind,token);scene(layer,w,h,kind,token);
  animate(layer,[{opacity:0},{opacity:1,offset:.035},{opacity:1,offset:.82},{opacity:0}],{duration:compact(kind)?2400:kind==='session'?5200:4500,easing:'linear',fill:'both'},'aaq-layer-css');
  timer=setTimeout(()=>{if(token===run)clear();},compact(kind)?2500:kind==='session'?5300:4600);
  if(kind==='session')playSound();return true;
 }
 window.AAQEffects={
  setPreferences(effects,audio){enabled=!!effects;sound=!!audio;if(!enabled)clear();if(!sound)stopSound();},
  clear,
  question(score,max){if(!Number.isFinite(max)||max<=0||score!==max||!enabled||document.hidden||reduced())return false;return play(pick(max));},
  session(){return play('session');},
  preview(name='random'){return name==='random'?play(pick(2)):names.includes(name)||name==='session'?play(name):false;}
 };
 const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');motion?.addEventListener?.('change',()=>{if(reduced())clear();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 window.addEventListener('pagehide',clear);window.addEventListener('resize',clear);
 window.visualViewport?.addEventListener('resize',clear);
})();
