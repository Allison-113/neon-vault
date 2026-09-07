import { createGame, choose, getEnding } from './engine.mjs';
import { CREW, SCENES } from './scenario.mjs';

const root = document.querySelector('#app');
const SAVE_KEY = 'neon-vault-run-v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scrollBehavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
let state = createGame();
let selected = CREW[0].id;
let showingResult = false;
let rolling = false;
let modal = null;
let savedNotice = false;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved?.version === 1 && Number.isInteger(saved.state?.sceneIndex) && saved.state.sceneIndex >= 0 && saved.state.sceneIndex <= SCENES.length && Array.isArray(saved.state.history) && Number.isFinite(saved.state.integrity) && ['playing','done'].includes(saved.state.phase)) {
    state = saved.state;
    showingResult = Boolean(saved.showingResult && state.lastRoll);
    selected = CREW.some(c => c.id === saved.selected) ? saved.selected : selected;
    savedNotice = state.history.length > 0;
  }
} catch { /* Private browsing and unavailable storage still allow play. */ }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({version:1, state, selected, showingResult})); } catch {}
}

const icons = {
  force: '<path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z"/>',
  hack: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
  charm: '<path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z"/><path d="M7 10h8m-8 4h5"/>'
};
const icon = stat => `<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[stat] || icons.hack}</svg>`;

function tower(sceneIndex) {
  const current = Math.min(sceneIndex, 5);
  return `<svg class="tower-svg" viewBox="0 0 360 520" role="img" aria-label="Corporate tower, floor ${current + 1} of six">
  <defs><linearGradient id="tower-face" x2="1" y2="1"><stop stop-color="#18373b"/><stop offset="1" stop-color="#07121c"/></linearGradient><linearGradient id="tower-side"><stop stop-color="#07151d"/><stop offset="1" stop-color="#142733"/></linearGradient><radialGradient id="aura"><stop stop-color="#4bf6cc" stop-opacity=".13"/><stop offset="1" stop-color="#4bf6cc" stop-opacity="0"/></radialGradient><pattern id="rain" width="31" height="65" patternUnits="userSpaceOnUse"><path d="M24 0 17 18" stroke="#91dcd9" stroke-opacity=".1"/></pattern></defs>
  <rect width="360" height="520" fill="url(#rain)"/><ellipse cx="180" cy="255" rx="178" ry="238" fill="url(#aura)"/>
  <g fill="#101d29" stroke="#243644" stroke-width=".5"><path d="M0 425V295h39v130m-18-130v-28m18 158V348h27v77M294 425V320h31v105m0 0V271h35v154"/><path d="M51 425V370h36v55m177 0V363h27v62"/></g>
  <path d="M56 453 184 510 321 452 195 399Z" fill="#091820" stroke="#29484d"/>
  <path d="M180 65 275 110V433l-95 45Z" fill="url(#tower-side)" stroke="#33505a"/>
  <path d="M86 110 180 65v413l-94-45Z" fill="url(#tower-face)" stroke="#446567"/>
  <path d="m86 110 94 45 95-45-95-45Z" fill="#193b40" stroke="#527570"/>
  <path d="M180 65V28m-13 44V47m26 25V47" stroke="#83c4b5"/><circle cx="180" cy="26" r="3" fill="#d7ff70" class="tower-beacon"/>
  ${SCENES.map((s, i) => {
    const y = 394 - i * 48;
    const active = i === current;
    const cleared = i < sceneIndex;
    const color = active ? '#d7ff70' : cleared ? '#48e9d0' : '#355961';
    return `<g class="floor-node ${active ? 'active' : ''} ${cleared ? 'cleared' : ''}"><path d="m88 ${y} 92 44 93-44v25l-93 44-92-44Z" fill="${color}" fill-opacity="${active ? '.14' : '.03'}"/><path d="m88 ${y+24} 92 44 93-44" fill="none" stroke="${color}" stroke-opacity="${active ? '.9' : '.3'}"/>${Array.from({length:5}, (_,j) => `<path d="m${98+j*15} ${y+9+j*7.2} 7 3.4v9l-7-3.4Z" fill="${color}" opacity="${active || cleared ? '.85' : '.25'}"/><path d="m${193+j*15} ${y+45-j*7.2} 7-3.4v9l-7 3.4Z" fill="${color}" opacity="${active ? '.65' : '.2'}"/>`).join('')}<path d="M281 ${y+13}h21" stroke="${color}" stroke-opacity=".5"/><text x="310" y="${y+17}" fill="${color}" font-size="11" font-family="monospace">0${i+1}</text>${active ? `<circle cx="282" cy="${y+13}" r="3" fill="${color}"/>` : ''}</g>`;
  }).join('')}
  <path d="M180 155v323" stroke="#5c8d89" stroke-opacity=".45"/><text x="30" y="490" fill="#597b81" font-family="monospace" font-size="8" letter-spacing="2">MERIDIAN / RESTRICTED AIRSPACE</text>
  </svg>`;
}

function render() {
  const sceneIndex = showingResult ? Math.max(0, state.sceneIndex - 1) : state.sceneIndex;
  const scene = SCENES[Math.min(sceneIndex, SCENES.length - 1)];
  const ending = !showingResult && getEnding(state);
  const crew = CREW.find(c => c.id === selected);
  root.innerHTML = `<div class="app-shell">
    <header class="topbar"><a class="brand" href="./" aria-label="Neon Vault home"><span class="brand-mark">N<span>V</span></span><span>NEON VAULT<small>A HEIST IN SIX FLOORS</small></span></a><button class="secondary-button help-button" data-action="help" aria-label="How to play">?</button></header>
    <div class="mission-strip"><span><i class="signal-dot"></i> OPERATION / GLASS GHOST</span><span class="status-pill">${ending ? 'RUN COMPLETE' : 'LIVE FEED'}</span></div>
    <main class="mission-layout">
      <aside class="tower-panel"><div class="tower-heading"><span class="eyebrow">THE MERIDIAN</span><span class="tower-coordinate">35.69° N / 139.70° E</span></div>${tower(sceneIndex)}<div class="tower-caption"><span>VERTICAL INFILTRATION</span><strong>${String(Math.min(sceneIndex + 1,6)).padStart(2,'0')}<em> / 06</em></strong></div></aside>
      <section class="mission-panel" aria-label="Current mission">
        <div class="resource-strip"><div class="resource"><span>CREW INTEGRITY</span><strong class="integrity-pips" aria-label="${state.integrity} of 6 integrity">${Array.from({length:6},(_,i)=>`<i class="${i<state.integrity?'filled':''}"></i>`).join('')}</strong></div><div class="resource"><span>TRACE HEAT</span><strong class="heat-value ${state.heat>=8?'hot':''}">${String(state.heat).padStart(2,'0')}<small> / ${state.heat >= 8 ? 'HIGH' : state.heat >=4 ? 'RISING' : 'LOW'}</small></strong></div><div class="resource"><span>CHECKS WON</span><strong>${state.score}<small> / ${state.history.length}</small></strong></div></div>
        <nav class="floor-progress" aria-label="Mission progress">${SCENES.map((s,i)=>`<span class="${i<state.sceneIndex?'cleared':''} ${i===sceneIndex?'active':''}" aria-label="Floor ${i+1}${i<state.sceneIndex?' cleared':i===sceneIndex?' current':''}">${String(i+1).padStart(2,'0')}</span>`).join('')}</nav>
        ${savedNotice ? '<p class="saved-notice">Your crew is right where you left them. Run restored.</p>' : ''}
        ${ending ? endingView(ending) : `<div class="scene-heading"><p class="eyebrow">FLOOR ${String(sceneIndex+1).padStart(2,'0')} <span>/ ${esc(scene.kicker)}</span></p><h1 class="scene-title">${esc(scene.title)}</h1><p class="scene-description">${esc(scene.description)}</p></div>
        ${showingResult || rolling ? resultView() : `<div class="section-label"><span>01 / CHOOSE YOUR SPECIALIST</span><span>+${crew.bonus} ${esc(crew.stat.toUpperCase())}</span></div><div class="crew-list">${CREW.map(c=>`<button class="crew-card ${c.id===selected?'selected':''}" data-crew="${esc(c.id)}" aria-pressed="${c.id===selected}" title="${esc(c.tagline)}">${icon(c.stat)}<span><strong>${esc(c.name)}</strong><small>${esc(c.role)}</small></span><span class="crew-bonus">+${c.bonus}</span></button>`).join('')}</div><p class="crew-tagline">“${esc(crew.tagline)}”</p><div class="section-label"><span>02 / MAKE YOUR MOVE</span><span>ROLL D20</span></div><div class="choices">${scene.choices.map(c=>`<button class="choice-card" data-choice="${esc(c.id)}"><span class="choice-icon">${icon(c.stat)}</span><span class="choice-copy"><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small><span class="choice-stat">${esc(c.stat.toUpperCase())} ${crew.stat===c.stat?`<b>+${crew.bonus} SPECIALIST</b>`:'+0'}</span></span><span class="choice-dc"><small>BEAT</small><strong>${c.dc}</strong><span aria-hidden="true">↗</span></span></button>`).join('')}</div>`}`}
      </section>
    </main>
    <section class="journal"><details ${ending?'open':''}><summary><span>TRANSMISSION LOG</span><span>${String(state.history.length).padStart(2,'0')} ENTRIES <b>+</b></span></summary><div class="journal-content">${state.history.length ? [...state.history].reverse().map(h=>`<article class="journal-entry ${h.success?'success':'failure'}"><span class="journal-floor">F${h.floor}</span><div><strong>${esc(h.crewName)} / ${esc(h.choiceLabel)}</strong><p>${esc(h.text)}</p></div><span class="journal-roll">${h.roll}<small>${h.success?'PASS':'FAIL'}</small></span></article>`).join('') : '<p class="empty-log">Encrypted channel open. Your first move writes the story.</p>'}</div></details></section>
    <footer class="game-footer"><span>ONE CREW. SIX FLOORS. NO CLEAN HANDS.</span><button class="text-button" data-action="restart" ${rolling?'disabled':''}>New run ↺</button></footer>
    ${modal ? modalView() : ''}
  </div>`;
  root.querySelectorAll('[data-crew]').forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.crew; savedNotice=false;save();render();root.querySelector(`[data-crew="${selected}"]`)?.focus({preventScroll:true});}));
  root.querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>makeChoice(btn.dataset.choice)));
  root.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.action)));
}

function resultView() {
  if (rolling) return '<div class="roll-panel rolling" aria-live="polite" aria-busy="true"><span class="eyebrow">FATE IS IN MOTION</span><div class="dice"><span id="rolling-number">20</span></div><p>Negotiating with probability…</p></div>';
  const r = state.lastRoll;
  return `<div class="roll-panel ${r.success?'success':'failure'}" aria-live="polite"><span class="eyebrow">${r.critical==='success'?'NATURAL 20 / CRITICAL':r.critical==='failure'?'NATURAL 1 / CRITICAL':r.success?'ACCESS GRANTED':'COMPLICATION'}</span><div class="roll-equation"><div class="dice">${r.roll}</div><span>+ ${r.bonus}<small>SPECIALIST</small></span><span>= <b>${r.total}</b><small>TARGET ${r.dc}</small></span></div><h2 class="outcome">${r.success?'You pull it off.':'The tower bites back.'}</h2><p class="result-story">${esc(r.text)}</p><div class="result-cost">${r.success?'+1 check won': '−1 crew integrity'} <span>·</span> ${r.critical==='success'?'Trace contained':r.success?'+1 trace heat':'+2 trace heat'}</div><button class="primary-button" data-action="continue">${getEnding(state)?'See your ending':'Ascend to floor '+String(state.sceneIndex+1).padStart(2,'0')} <span>→</span></button></div>`;
}

function endingView(e) {
  return `<div class="ending-card"><p class="eyebrow">DEBRIEF / ${esc(e.grade)}</p><div class="ending-symbol" aria-hidden="true">${state.integrity<=0?'⌁':'✧'}</div><h1 class="scene-title">${esc(e.title)}</h1>${e.text.split(/\n\n/).map(p=>`<p class="scene-description">${esc(p)}</p>`).join('')}<div class="ending-stats"><span><b>${state.score}</b> checks won</span><span><b>${state.integrity}</b> integrity left</span><span><b>${state.heat}</b> trace heat</span></div><p class="replay-note">Different specialists. Different risks. Another way through.</p><button class="primary-button" data-action="new">Run it again <span>↺</span></button></div>`;
}

function modalView() {
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="secondary-button modal-close" data-action="close" aria-label="Close dialog">×</button>${modal==='help'?`<p class="eyebrow">FIELD MANUAL / 001</p><h2 id="modal-title">Your next bad idea.</h2><p>Lead a crew through six floors of the Meridian. Pick a specialist, then tap a move to roll a twenty-sided die.</p><p><strong>Match skills.</strong> Your specialist adds their bonus to moves of the same type. Meet or beat the target to succeed.</p><p><strong>Own the consequences.</strong> A failed check costs one integrity. Every move increases trace heat; it records how loud your run becomes. Four successful checks earn the clean ending.</p><p><strong>Fate gets a vote.</strong> A natural 20 always succeeds and leaves no trace. A natural 1 always fails. Zero integrity ends the run.</p><p>Your run saves automatically on this device. No account, no purchases, no waiting.</p><button class="primary-button" data-action="close">Got it. Let's break in. →</button>`:`<p class="eyebrow">ABORT CURRENT OPERATION</p><h2 id="modal-title">Start a fresh run?</h2><p>Your current crew progress will be replaced.</p><button class="primary-button" data-action="new">Start new run ↺</button><button class="secondary-button" data-action="close">Keep playing</button>`}</section></div>`;
}

async function makeChoice(id) {
  if (rolling || showingResult || getEnding(state)) return;
  savedNotice=false;
  rolling=true;
  render();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer = reduced ? null : setInterval(()=>{const die=document.querySelector('#rolling-number');if(die)die.textContent=String(1+Math.floor(Math.random()*20));},65);
  await new Promise(resolve=>setTimeout(resolve,reduced?50:720));
  if(timer)clearInterval(timer);
  try { state=choose(state,id,selected);showingResult=true; } finally {rolling=false;}
  save();render();
  root.querySelector('[data-action="continue"]')?.focus({preventScroll:true});
  root.querySelector('.roll-panel')?.scrollIntoView({block:'center',behavior:scrollBehavior()});
}

function action(name) {
  if(name==='help'||name==='restart') {modal=name==='help'?'help':'restart';render();root.querySelector('.modal button')?.focus();return;}
  if(name==='close') {modal=null;render();root.querySelector('.help-button')?.focus({preventScroll:true});return;}
  if(name==='new') {state=createGame();showingResult=false;savedNotice=false;modal=null;save();render();window.scrollTo({top:0,behavior:scrollBehavior()});return;}
  if(name==='continue') {showingResult=false;save();render();root.querySelector('.scene-title')?.setAttribute('tabindex','-1');root.querySelector('.scene-title')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:scrollBehavior()});}
}

document.addEventListener('keydown',event=>{
  if(!modal)return;
  if(event.key==='Escape')action('close');
  if(event.key==='Tab') {
    const buttons=[...root.querySelectorAll('.modal button')];
    const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
render();
