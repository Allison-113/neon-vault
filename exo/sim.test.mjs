import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, useModule, reset } from './sim.mjs';
import { WORLD } from './world.mjs';

const tick = (s,input={},count=1) => { for(let i=0;i<count;i++) step(s,input,1/60); return s; };
const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
function at(s,x,y) { Object.assign(s.player,{x,y,vx:0,vy:0,grounded:false}); return s; }

test('hound patrol stays grounded, turns, attacks, and recovers after EMP', () => {
  const s=createState(), h=s.hound;
  h.x=WORLD.hound.maxX;tick(s);assert.equal(h.direction,-1);
  h.x=WORLD.hound.minX;tick(s);assert.equal(h.direction,1);
  tick(s,{},600);assert.equal(h.y+h.h,584);assert.ok(h.x>=1010 && h.x<=1450);
  at(s,h.x,h.y);tick(s);assert.ok(h.attack>0);assert.equal(s.player.invulnerable,1.5);
  useModule(s,'emp');const x=h.x;tick(s,{},120);assert.equal(h.x,x);assert.equal(h.attack,0);
  at(s,80,540);tick(s,{},300);assert.ok(h.x!==x);assert.equal(h.stunned,0);
});

test('fresh state preserves API and isolates mutable data from WORLD and reset', () => {
  const before = JSON.stringify(WORLD), a = createState(), b = reset();
  assert.deepEqual(a,b);
  a.player.x = 1000; a.crates[0].charge = 3; a.discoveries.push('test');
  assert.equal(b.player.x,WORLD.spawn.x);
  assert.equal(b.crates[0].charge,0);
  assert.deepEqual(b.discoveries,[]);
  assert.equal(JSON.stringify(WORLD),before);
});

test('gravity lands player and crates; movement stops at bounds and concrete walls', () => {
  const s = tick(createState(),{},120);
  assert.equal(s.player.y,554);
  assert.equal(s.player.grounded,true);
  assert.equal(s.crates[0].y,560);
  tick(s,{left:true},120);
  assert.equal(s.player.x,0);
  at(s,500,554);
  tick(s,{right:true},90);
  assert.equal(s.player.x,544-18);
  assert.equal(s.player.vx,0);
  at(s,2030,554);
  tick(s,{right:true},90);
  assert.equal(s.player.x,2030);
});

test('jump uses rising edge and crates make solid steps', () => {
  const s = tick(createState(),{},60);
  tick(s,{jump:true});
  assert.ok(s.player.vy < -300);
  assert.equal(s.player.grounded,false);
  tick(s,{jump:true},90);
  assert.equal(s.player.y,554);
  assert.equal(s.player.grounded,true);
  tick(s,{jump:false}); tick(s,{jump:true});
  assert.ok(s.player.vy < 0);
  at(s,210,490);
  tick(s,{},90);
  assert.equal(s.player.y,530);
  assert.equal(s.player.grounded,true);
});

test('magnet grabs nearest scrap, keeps charge, follows and throws without another energy cost', () => {
  const s = tick(createState(),{},30);
  s.crates[0].charge = 8;
  assert.equal(useModule(s,'magnet'),true);
  assert.equal(s.player.holding,'scrap-a');
  assert.equal(s.player.energy,92);
  assert.equal(s.crates[0].held,true);
  assert.equal(s.crates[0].charge,8);
  assert.equal(useModule(s,'magnet'),false);
  tick(s,{right:true},20);
  assert.equal(s.crates[0].x+s.crates[0].w/2,s.player.x+s.player.w/2+27);
  assert.equal(s.crates[0].y,s.player.y+5);
  s.player.energy = 0;
  assert.equal(useModule(s,'magnet'),true);
  assert.equal(s.player.energy,0);
  assert.equal(s.player.holding,null);
  assert.equal(s.crates[0].held,false);
  assert.equal(s.crates[0].vx,480);
  assert.equal(s.crates[0].vy,-110);
  assert.equal(s.stats.throws,1);
});

test('magnet cannot pick up through gate; held scrap clips and thrown scrap cannot tunnel', () => {
  const s = at(createState(),1520,554), c = s.crates[0];
  Object.assign(c,{x:1588,y:560});
  assert.equal(useModule(s,'magnet'),false);
  Object.assign(c,{x:1510,y:560});
  assert.equal(useModule(s,'magnet'),true);
  tick(s,{right:true},60);
  assert.ok(c.x+c.w <= WORLD.gate.x);
  assert.ok(s.player.x+s.player.w <= WORLD.gate.x);
  assert.equal(useModule(s,'magnet'),true);
  tick(s,{},60);
  assert.ok(c.x+c.w <= WORLD.gate.x);
});

test('EMP charges held and nearby scrap and stuns hound; combinations survive switching', () => {
  const s = at(createState(),1080,550);
  assert.equal(useModule(s,'magnet'),true);
  const id = s.player.holding;
  assert.equal(useModule(s,'emp'),true);
  assert.equal(s.player.holding,id);
  assert.equal(s.crates.find(c=>c.id===id).charge,10);
  assert.equal(s.hound.stunned,6);
  assert.ok(s.discoveries.includes('charged-scrap'));
  assert.equal(s.stats.pulses,1);
  const houndX = s.hound.x;
  tick(s,{},30);
  assert.equal(s.hound.x,houndX);
  assert.ok(s.crates.find(c=>c.id===id).charge < 10);
  assert.equal(useModule(s,'grapple'),true);
  assert.equal(s.player.holding,id);
  tick(s,{},5);
  assert.ok(s.player.grapple);
  assert.equal(s.player.holding,id);
});

test('charged scrap powers relay, consumes charge and expires gate without trapping bodies', () => {
  const s = createState(), c = s.crates[0];
  Object.assign(c,{x:1496,y:540,charge:10});
  tick(s);
  assert.equal(s.gate.open,true);
  assert.equal(s.gate.timer,20);
  assert.equal(c.charge,0);
  assert.ok(s.discoveries.includes('relay-bypass'));
  at(s,1545,554);
  s.gate.timer = 0.01;
  tick(s);
  assert.equal(s.gate.open,false);
  assert.equal(s.gate.timer,0);
  assert.equal(overlaps(s.player,WORLD.gate),false);
  assert.equal(s.discoveries.filter(d=>d==='relay-bypass').length,1);
});

test('charged moving scrap stuns hound for eight seconds and records a spark', () => {
  const s = createState(), c = s.crates[0];
  Object.assign(c,{x:s.hound.x-20,y:s.hound.y,vx:480,vy:0,charge:10});
  tick(s);
  assert.equal(s.hound.stunned,8);
  assert.ok(s.events.some(e=>e.type==='spark' && e.text.includes('hound')));
});

test('grapple range, pull, normal wall collision, timeout and release', () => {
  const s = createState();
  assert.equal(useModule(s,'grapple'),true);
  const startX=s.player.x,startY=s.player.y;
  tick(s,{},12);
  assert.ok(s.player.x > startX && s.player.y < startY);
  assert.equal(s.stats.grapples,1);
  s.player.energy=0;
  assert.equal(useModule(s,'grapple'),true);
  assert.equal(s.player.grapple,null);
  const out = at(createState(),0,50);
  assert.equal(useModule(out,'grapple'),false);
  assert.equal(out.player.energy,100);
  const blocked = at(createState(),1528,510);
  blocked.player.grapple={x:1660,y:490,ttl:1.4};
  tick(blocked,{},100);
  assert.ok(blocked.player.x+18 <= WORLD.gate.x);
  assert.equal(blocked.player.grapple,null);
});

test('sky route and extraction discoveries are unique; win only emits once', () => {
  const s = at(createState(),1600,410);
  tick(s);
  assert.ok(s.discoveries.includes('sky-route'));
  tick(s,{},10);
  assert.equal(s.discoveries.filter(d=>d==='sky-route').length,1);
  at(s,WORLD.goal.x,WORLD.goal.y);
  tick(s,{},60);
  assert.equal(s.won,true);
  assert.equal(s.events.filter(e=>e.type==='win').length,1);
  const x=s.player.x;
  tick(s,{left:true},30);
  assert.ok(s.player.x < x);
});

test('hound tags once per invulnerability window, regenerates battery, never kills', () => {
  const s = at(createState(),WORLD.hound.x,WORLD.hound.y);
  tick(s);
  assert.equal(s.player.energy,85);
  assert.equal(s.player.invulnerable,1.5);
  assert.ok(Math.abs(s.player.vx)===220);
  const tags=s.events.filter(e=>e.type==='tag').length;
  tick(s,{},5);
  assert.equal(s.events.filter(e=>e.type==='tag').length,tags);
  at(s,80,554);
  tick(s,{},600);
  assert.equal(s.player.energy,100);
  assert.equal(s.player.invulnerable,0);
});

test('module failure leaves resources unchanged; cooldowns expire and events stay bounded', () => {
  const s = createState();
  assert.equal(useModule(s,'not-a-module'),false);
  assert.equal(useModule(s,'toString'),false);
  s.player.energy=5;
  assert.equal(useModule(s,'magnet'),false);
  assert.equal(useModule(s,'emp'),false);
  assert.equal(useModule(s,'grapple'),false);
  assert.equal(s.player.energy,5);
  assert.deepEqual(s.cooldowns,{magnet:0,grapple:0,emp:0});
  for(let i=0;i<50;i++) useModule(s,'emp');
  assert.equal(s.events.length,30);
  assert.ok(s.events.every(e=>e.text.length <= 90));
  s.player.energy=100;
  assert.equal(useModule(s,'emp'),true);
  assert.equal(useModule(s,'emp'),false);
  assert.equal(s.stats.pulses,1);
  tick(s,{},151);
  assert.equal(useModule(s,'emp'),true);
  assert.equal(s.discoveries.filter(d=>d==='charged-scrap').length,1);
  tick(s,{},610);
  assert.ok(s.crates.every(c=>c.charge===0));
});

test('dt and input safety, below-world recovery, deterministic supplied ticks and JSON state', () => {
  const s=createState(), before=JSON.stringify(s);
  for(const dt of [-1,0,NaN,Infinity,undefined,null,'1']) step(s,null,dt);
  assert.equal(JSON.stringify(s),before);
  step(s,null,100);
  assert.equal(s.time,0.033);
  const a=createState(), b=createState();
  for(let i=0;i<300;i++) {
    const input={right:i<120,jump:i===45};
    step(a,input,1/60);step(b,input,1/60);
  }
  assert.deepEqual(a,b);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
  at(s,200,WORLD.height+50);
  tick(s);
  assert.equal(s.player.x,WORLD.spawn.x);
  assert.equal(s.player.y,WORLD.spawn.y);
  assert.ok(s.events.some(e=>e.text.includes('Recovery')));
});

test('actual chained anchors carry the suit from spawn over the closed gate to extraction', () => {
  const s=createState();
  for(let i=0;i<1500 && !s.discoveries.includes('sky-route');i++) {
    if(!s.player.grapple && s.cooldowns.grapple===0) useModule(s,'grapple');
    tick(s,{right:true});
  }
  assert.ok(s.discoveries.includes('sky-route'), `Stopped at ${s.player.x},${s.player.y}`);
  assert.equal(s.gate.open,false);
  if(s.player.grapple) useModule(s,'grapple');
  // Drop through the gap between catwalks, then approach the terminal on foot.
  for(let i=0;i<300 && s.player.x<1705;i++) tick(s,{right:true});
  tick(s,{},120);
  for(let i=0;i<400 && !s.won;i++) tick(s,{right:true});
  assert.equal(s.won,true);
  assert.equal(s.gate.open,false);
});

test('actual ground route combines magnet, EMP and throw, then reaches extraction', () => {
  const s=createState();
  for(let i=0;i<1500 && s.player.x<1400;i++) {
    tick(s,{right:true,jump:s.player.grounded && i%45===0});
  }
  tick(s,{},80);
  assert.ok(s.player.x>=1400 && s.player.x<WORLD.gate.x);
  assert.equal(useModule(s,'magnet'),true);
  tick(s,{},20);
  assert.equal(useModule(s,'emp'),true);
  assert.equal(s.gate.open,false);
  assert.equal(useModule(s,'magnet'),true);
  tick(s,{},30);
  assert.equal(s.gate.open,true);
  assert.equal(s.stats.throws,1);
  assert.equal(s.stats.pulses,1);
  for(let i=0;i<600 && !s.won;i++) {
    tick(s,{right:true,jump:s.player.grounded && i%45===0});
  }
  assert.equal(s.won,true);
  assert.deepEqual(s.discoveries,['charged-scrap','relay-bypass']);
  tick(s,{},1250);
  assert.equal(s.gate.open,false);
  assert.equal(s.gate.timer,0);
});
