/* Release checks use fresh metadata, never clear browser storage or reload without a click. */
(function(){
 'use strict';
 const build=window.REVISION_BUILD||window.CHEM_BUILD||window.AAQ_BUILD||{},offline=!!window.CHEM_OFFLINE||!!window.AAQ_EMBEDDED||location.protocol==='file:'||!!window.CHEM_PREVIEW_ID;
 let checking=null,lastCheck=0,latest=null,dismissed='',initialGate=false;
 const status=()=>document.getElementById('release-check-status');
 function statusText(text){if(status())status().textContent=text}
 function valid(value){return value&&value.schema===1&&typeof value.id==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(value.id)&&typeof value.label==='string'&&value.label.length<50}
 function freshURL(file){const url=new URL(file,location.href);url.searchParams.set('_check',Date.now()+'-'+Math.random().toString(36).slice(2));return url}
 function latestURL(release){const url=new URL(location.href);url.searchParams.set('app',release?.id||build.id||'latest');url.searchParams.set('_refresh',Date.now());return url.href}
 function removeNotice(){document.getElementById('release-notice')?.remove()}
 function updateNow(release,button,message){
  const event=new Event('revision:before-update',{cancelable:true});
  if(!window.dispatchEvent(event)){message.textContent='Your browser could not save your work. Keep this page open and update after you have finished.';return}
  button.disabled=true;button.textContent='Opening latest version…';location.replace(latestURL(release));
 }
 function showNotice(release,gate=false){
  latest=release;initialGate=initialGate||gate;if(!gate&&dismissed===release.id)return;
  removeNotice();
  const host=document.createElement('section');host.id='release-notice';host.className=gate?'release-gate card':'release-notice';host.setAttribute('role','region');host.setAttribute('aria-labelledby','release-notice-title');
  host.innerHTML='<h2 id="release-notice-title">An update is available</h2><p class="release-description"></p><p>Your saved progress stays in this browser.</p><div class="release-actions"><button type="button" class="btn" id="open-latest-version">Update now</button>'+(!gate?'<button type="button" class="btn secondary" id="dismiss-release">Later</button>':'')+'</div><p class="release-message" role="status"></p>';
  host.querySelector('.release-description').textContent=release.label===build.label?'An updated copy of version '+release.label+' is ready, with the latest questions and fixes.':'You are using version '+(build.label||'unknown')+'. Open version '+release.label+' for the latest questions and fixes.';
  if(gate){const app=document.getElementById('app');if(app){app.replaceChildren(host)}else document.body.append(host)}else document.body.append(host);
  host.querySelector('#open-latest-version').onclick=()=>updateNow(release,host.querySelector('#open-latest-version'),host.querySelector('.release-message'));
  const dismiss=host.querySelector('#dismiss-release');if(dismiss)dismiss.onclick=()=>{dismissed=release.id;removeNotice()};
  statusText('Version '+(build.label||'unknown')+' · update available');
 }
 async function check({force=false,gate=false}={}){
  if(offline){statusText('Offline preview · version '+(build.label||''));return {offline:true}}
  if(checking)return checking;
  if(!force&&Date.now()-lastCheck<30000)return {latest,update:!!latest&&latest.id!==build.id};
  lastCheck=Date.now();checking=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
   try{
    const response=await fetch(freshURL('version.json'),{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Release check unavailable');
    const remote=await response.json();if(!valid(remote))throw Error('Invalid release metadata');latest=remote;
    const update=remote.id!==build.id;
    if(update)showNotice(remote,gate||initialGate);else{if(!initialGate)removeNotice();statusText('Version '+build.label+' · up to date')}
    return {latest:remote,update};
   }catch{statusText('Version '+(build.label||'unknown')+' · update check unavailable');return {unavailable:true}}
   finally{clearTimeout(timer);checking=null}
  })();return checking;
 }
 const initial=check({force:true,gate:true});
 async function beforeBankLoad(){const result=await initial;if(result.update){showNotice(result.latest,true);return new Promise(()=>{})}}
 async function blockForMismatch(){
  const result=await check({force:true,gate:true});const remote=result.latest||{id:build.id||'latest',label:build.label||'latest'};
  showNotice(remote,true);const text=document.querySelector('#release-notice .release-description');if(text)text.textContent='This page and the question files are from different releases. Open a fresh copy before continuing.';
  return new Promise(()=>{});
 }
 document.getElementById('check-for-updates')?.addEventListener('click',()=>{dismissed='';check({force:true,gate:initialGate})});
 if(offline){const button=document.getElementById('check-for-updates');if(button)button.hidden=true}
 window.addEventListener('pageshow',()=>check());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 window.addEventListener('focus',()=>check());window.addEventListener('online',()=>check({force:true}));
 const api={check,beforeBankLoad,blockForMismatch,build,offline};window.RevisionUpdates=api;window.ChemUpdates=api;
 // Check while studying as well as when returning to the tab. Never reload automatically.
 if(!offline){const interval=setInterval(()=>{if(!document.hidden)check()},60000);window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});}
})();
