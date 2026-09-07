import { createState, step, useModule } from './sim.mjs';
import { createRenderer } from './render.mjs';
import { WORLD } from './world.mjs';

const $=s=>document.querySelector(s);
const canvas=$('#game'),renderer=createRenderer(canvas);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modules={magnet:{label:'MAGNET',cost:8,hint:'Pull nearby scrap toward your suit. Use again to throw it.'},grapple:{label:'GRAPPLE',cost:16,hint:'Face a golden anchor overhead and zip toward it. Use again to let go.'},emp:{label:'EMP',cost:32,hint:'Disrupt the drone. Electrify scrap. Then switch modules and try something.'}};
let state=createState(),selected='magnet',started=false,paused=false,winShown=false;
let accumulator=0,last=performance.now(),jumpQueued=false,toastUntil=0,soundOn=false,audioContext=null;
const input={left:false,right:false,jump:false},particles=[];
const manual=$('#manual'),debrief=$('#debrief');
const installNote=document.createElement('p');installNote.className='manual-note';installNote.textContent='On iPhone: open this page in Safari, tap Share → Add to Home Screen, enable Open as Web App if shown, then Add. Launch the new NEON EXO icon. An internet connection is still needed to load the game.';manual.querySelector('.dialog-inner').insertBefore(installNote,manual.querySelector('.close-manual'));
const rng=(()=>{let x=1729;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}})();

function sound(type){
  if(!soundOn)return;
  try{
    audioContext??=new(window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const tone=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
    const notes={magnet:[180,420,.12],throw:[340,80,.14],emp:[90,25,.3],grapple:[300,800,.12],discovery:[600,1100,.25],tag:[130,50,.15],win:[500,1000,.5],spark:[400,180,.12]};
    const [a,b,duration]=notes[type]||[300,400,.07];tone.type=type==='emp'?'sawtooth':'triangle';tone.frequency.setValueAtTime(a,now);tone.frequency.exponentialRampToValueAtTime(b,now+duration);gain.gain.setValueAtTime(.045,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);tone.connect(gain).connect(audioContext.destination);tone.start(now);tone.stop(now+duration+.01);
  }catch{soundOn=false;$('#sound').textContent='SOUND OFF'}
}
function toast(message,seconds=3){$('#toast').textContent=message;toastUntil=performance.now()+seconds*1000;$('#toast').classList.add('visible')}
function selectModule(name){selected=name;for(const el of document.querySelectorAll('[data-module]')){el.classList.toggle('selected',el.dataset.module===name);el.setAttribute('aria-pressed',String(el.dataset.module===name))}$('#use-label').textContent=modules[name].label;$('#use-cost').textContent=`${modules[name].cost} ENERGY`;$('#module-hint').textContent=modules[name].hint;updateHUD()}
function updateHUD(){
  const p=state.player;
  $('#energy').textContent=String(Math.floor(p.energy)).padStart(3,'0');$('#energy-fill').style.width=`${p.energy}%`;$('#energy-fill').style.background=p.energy<modules[selected].cost?'#eb6f91':'#d4f875';
  const cooldown=state.cooldowns?.[selected]||0;
  $('#use-cost').textContent=cooldown>.05?`${cooldown.toFixed(1)}s RECHARGE`:selected==='magnet'&&p.holding?'THROW SCRAP':selected==='grapple'&&p.grapple?'RELEASE LINE':`${modules[selected].cost} ENERGY`;
  $('#zone').textContent=p.x<620?'09 / WEST SCRAPYARD':p.x<1320?'09 / SALVAGE SPINE':p.x<1670?'09 / SECURITY LINE':'09 / CORE STORAGE';
  $('#discovery-count').textContent=`${state.discoveries.length} / 3`;
  for(const el of document.querySelectorAll('[data-discovery]')){const yes=state.discoveries.includes(el.dataset.discovery);el.classList.toggle('found',yes);el.querySelector('i').textContent=yes?'✓':'?'}
  $('#goal-chip span').textContent=state.won?'CORE SECURED ✓':state.gate.open?`GATE OPEN / ${Math.ceil(state.gate.timer)}s`:'CORE SIGNAL →';
}
function consumeEvents(){
  for(const event of state.events.splice(0)){
    const color=['emp','spark'].includes(event.type)?'#69e9d8':event.type==='tag'?'#eb6f91':'#e9cd86';
    if(event.type==='emp')particles.push({x:event.x,y:event.y,life:.5,max:.5,ring:true,radius:170,color});
    if(!reducedMotion){for(let i=0;i<(event.type==='win'?32:7);i++)particles.push({x:event.x,y:event.y,vx:(rng()-.5)*160,vy:(rng()-.8)*160,life:.35+rng()*.4,max:.75,color,size:rng()>.7?3:2})}
    if(event.text)toast(event.text,event.type==='discovery'?4:2.8);
    sound(event.type);
    if(event.type==='win'&&!winShown){winShown=true;window.setTimeout(showWin,650)}
  }
  updateHUD();
}
function activate(){if(!started){startGame();return}if(manual.open||debrief.open)return;useModule(state,selected);consumeEvents()}
function clearInput(){input.left=input.right=input.jump=false;jumpQueued=false;for(const el of document.querySelectorAll('.pressed'))el.classList.remove('pressed')}
function startGame(){started=true;$('#start').classList.add('hidden');document.body.classList.add('playing');canvas.focus({preventScroll:true});toast('Core signal east. The route is up to you.',3.7);last=performance.now();accumulator=0;}
function resetGame(){state=createState();particles.length=0;winShown=false;clearInput();if(debrief.open)debrief.close();started=true;$('#start').classList.add('hidden');selectModule('magnet');toast('Fresh yard. Different bad idea?',3);last=performance.now();accumulator=0;canvas.focus({preventScroll:true})}
function showWin(){if(!state.won||debrief.open)return;clearInput();$('#debrief-stats').textContent=`${state.discoveries.length}/3 discoveries · ${state.stats.throws} throws · ${state.stats.grapples} grapples`;$('#debrief-message').textContent=state.discoveries.length===3?'Every discovery found. You made the suit your own.':state.discoveries.includes('sky-route')?'You took the high road. There are still stranger things to try with the scrap below.':'You found a way through. The catwalks and loose metal still have a few ideas left in them.';debrief.showModal()}
function openHelp(){clearInput();manual.showModal()}
function closeHelp(){manual.close();canvas.focus({preventScroll:true});last=performance.now()}
$('#start').addEventListener('click',startGame);$('#use').addEventListener('click',activate);
$('#help').addEventListener('click',openHelp);manual.querySelector('.close-dialog').addEventListener('click',closeHelp);$('.close-manual').addEventListener('click',closeHelp);
for(const el of debrief.querySelectorAll('.close-dialog,.close-debrief'))el.addEventListener('click',()=>{debrief.close();canvas.focus({preventScroll:true});last=performance.now()});
$('#replay').addEventListener('click',resetGame);$('#restart').addEventListener('click',resetGame);
$('#sound').addEventListener('click',()=>{soundOn=!soundOn;$('#sound').textContent=soundOn?'SOUND ON':'SOUND OFF';$('#sound').setAttribute('aria-pressed',String(soundOn));if(soundOn)sound('discovery')});
for(const el of document.querySelectorAll('[data-module]'))el.addEventListener('click',()=>selectModule(el.dataset.module));
for(const name of ['left','right','jump']){
  const el=$('#'+name);el.addEventListener('pointerdown',event=>{event.preventDefault();if(!started)startGame();input[name]=true;if(name==='jump')jumpQueued=true;el.classList.add('pressed');el.setPointerCapture(event.pointerId)});
  for(const action of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(action,()=>{input[name]=false;el.classList.remove('pressed')});
}
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump'};
document.addEventListener('keydown',event=>{
  if(manual.open||debrief.open)return;
  if(keys[event.code]){event.preventDefault();if(!started)startGame();input[keys[event.code]]=true;if(keys[event.code]==='jump'&&!event.repeat)jumpQueued=true;}
  if(['Digit1','Digit2','Digit3'].includes(event.code)){event.preventDefault();selectModule(['magnet','grapple','emp'][Number(event.code.at(-1))-1])}
  if(['KeyE','Space'].includes(event.code)){event.preventDefault();if(!event.repeat)activate()}
});
document.addEventListener('keyup',event=>{if(keys[event.code]){event.preventDefault();input[keys[event.code]]=false}});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();last=performance.now();accumulator=0});
new ResizeObserver(()=>renderer.resize()).observe(canvas);
function frame(now){
  const elapsed=Math.min(.1,(now-last)/1000);last=now;
  if(started&&!paused&&!manual.open&&!debrief.open&&document.visibilityState==='visible'){
    accumulator+=elapsed;
    while(accumulator>=1/60){step(state,{...input,jump:input.jump||jumpQueued},1/60);jumpQueued=false;accumulator-=1/60;}
    consumeEvents();
  }
  for(let i=particles.length-1;i>=0;i--){const e=particles[i];e.life-=elapsed;if(!e.ring){e.x+=e.vx*elapsed;e.y+=e.vy*elapsed;e.vy+=80*elapsed}if(e.life<=0)particles.splice(i,1)}
  if(now>toastUntil)$('#toast').classList.remove('visible');
  renderer.draw(state,{selected,particles,reducedMotion});requestAnimationFrame(frame);
}
selectModule('magnet');requestAnimationFrame(frame);

// Only the explicit QA URL exposes deterministic controls for browser integration tests.
if(new URLSearchParams(location.search).has('qa'))Object.defineProperty(window,'__EXO',{value:{get state(){return state},get camera(){return renderer.getCamera()},world:WORLD,pause(value=true){paused=value;accumulator=0},tick(n=1,controls={}){for(let i=0;i<n;i++)step(state,{left:false,right:false,jump:false,...controls},1/60);consumeEvents();renderer.draw(state,{selected,particles,reducedMotion})},use(name){selectModule(name);useModule(state,name);consumeEvents()},reset:resetGame,start:startGame}});
