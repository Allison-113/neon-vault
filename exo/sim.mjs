import { WORLD } from './world.mjs';

const COST = {magnet:8, grapple:16, emp:32};
const COOLDOWN = {magnet:0.3, grapple:0.5, emp:2.5};
const center = b => ({x:b.x + b.w / 2, y:b.y + b.h / 2});
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const overlap = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const decay = (n, dt) => Math.max(0, n-dt);

export function createState() {
  return {
    time:0,
    player:{...WORLD.spawn, vx:0, vy:0, w:18, h:30, facing:1, grounded:false,
      energy:100, holding:null, grapple:null, invulnerable:0, suitId:'infernex'},
    crates:WORLD.crates.map(c => ({...c, w:24, h:24, vx:0, vy:0, charge:0, held:false})),
    hound:{x:WORLD.hound.x, y:WORLD.hound.y, w:46, h:30, stunned:0, direction:1, attack:0},
    gate:{open:false, timer:0}, discoveries:[], events:[], won:false,
    stats:{throws:0, pulses:0, grapples:0}, cooldowns:{magnet:0, grapple:0, emp:0},
    _jumpHeld:false,
  };
}
export const reset = createState;

function event(s, type, x, y, text) {
  s.events.push({type, x, y, text:text.slice(0,90)});
  if (s.events.length > 30) s.events.splice(0, s.events.length - 30);
}
function discover(s, id, at, text) {
  if (s.discoveries.includes(id)) return;
  s.discoveries.push(id);
  event(s, 'discovery', at.x, at.y, text);
}
function geometry(s) {
  return s.gate.open ? WORLD.platforms : [...WORLD.platforms, WORLD.gate];
}

// Sweep each axis to the first blocking face. This also handles a gadget pull
// longer than one ordinary frame without crossing a thin wall or platform.
function move(body, dx, dy, solids) {
  let x = clamp(body.x + dx, 0, WORLD.width-body.w);
  for (const wall of solids) {
    if (body.y+body.h <= wall.y || body.y >= wall.y+wall.h) continue;
    if (dx > 0 && body.x+body.w <= wall.x+1e-7 && x+body.w > wall.x) x = Math.min(x, wall.x-body.w);
    if (dx < 0 && body.x >= wall.x+wall.w-1e-7 && x < wall.x+wall.w) x = Math.max(x, wall.x+wall.w);
  }
  if (Math.abs(x-(body.x+dx)) > 1e-7) body.vx = 0;
  body.x = x;
  let y = Math.max(0, body.y+dy);
  let grounded = false;
  for (const wall of solids) {
    if (body.x+body.w <= wall.x || body.x >= wall.x+wall.w) continue;
    if (dy > 0 && body.y+body.h <= wall.y+1e-7 && y+body.h >= wall.y) {
      y = Math.min(y, wall.y-body.h);
      grounded = true;
    }
    if (dy < 0 && body.y >= wall.y+wall.h-1e-7 && y < wall.y+wall.h) y = Math.max(y, wall.y+wall.h);
  }
  if (Math.abs(y-(body.y+dy)) > 1e-7 || grounded) body.vy = 0;
  body.y = y;
  return grounded;
}

function clearLine(a, b, solids) {
  // Segment/slab intersection: no magnetic pickup through a closed gate.
  for (const box of solids) {
    let lo = 0, hi = 1;
    for (const [axis, size] of [['x','w'], ['y','h']]) {
      const delta = b[axis]-a[axis];
      if (Math.abs(delta) < 1e-8) {
        if (a[axis] <= box[axis] || a[axis] >= box[axis]+box[size]) { lo = 2; break; }
      } else {
        const first = (box[axis]-a[axis])/delta;
        const last = (box[axis]+box[size]-a[axis])/delta;
        lo = Math.max(lo, Math.min(first,last));
        hi = Math.min(hi, Math.max(first,last));
      }
    }
    if (lo < hi && hi > 0 && lo < 1) return false;
  }
  return true;
}

function drop(s, crate) {
  crate.held = false;
  s.player.holding = null;
}
function followHeld(s) {
  const p = s.player, crate = s.crates.find(c => c.id === p.holding);
  if (!crate) { p.holding = null; return; }
  const target = {x:p.x+p.w/2+p.facing*27-crate.w/2, y:p.y+5};
  move(crate, target.x-crate.x, target.y-crate.y,
    [...geometry(s), ...s.crates.filter(c => c !== crate && !c.held)]);
  crate.vx = 0; crate.vy = 0;
  if (distance(center(p), center(crate)) > 80) {
    drop(s, crate);
    event(s, 'magnet', crate.x, crate.y, 'Scrap caught on the structure. Magnet released.');
  }
}

export function useModule(s, module) {
  if (!Object.hasOwn(COST, module)) return false;
  const p = s.player, pc = center(p);
  // Releasing a cable is always possible, even while its launch cools down.
  if (module === 'grapple' && p.grapple) {
    p.grapple = null;
    event(s, 'grapple', pc.x, pc.y, 'Grapple released.');
    return true;
  }
  if (s.cooldowns[module] > 0) return false;
  const cost = module === 'magnet' && p.holding ? 0 : COST[module];
  if (p.energy < cost) {
    event(s, 'spark', pc.x, pc.y, 'Battery low. Give the suit a moment to recharge.');
    return false;
  }
  let target;
  if (module === 'magnet') {
    target = s.crates.find(c => c.id === p.holding);
    if (!target) {
      target = s.crates.filter(c => !c.held && distance(pc,center(c)) <= 150 && clearLine(pc,center(c),geometry(s)))
        .sort((a,b) => distance(pc,center(a))-distance(pc,center(b)))[0];
      if (!target) {
        event(s, 'magnet', pc.x, pc.y, 'No reachable loose metal. Move closer to some scrap.');
        return false;
      }
    }
  }
  if (module === 'grapple') {
    const anchors = WORLD.anchors.filter(a => a.y < pc.y && distance(pc,a) > 24 && distance(pc,a) <= 400);
    const forward = anchors.filter(a => (a.x-pc.x)*p.facing > 24);
    target = (forward.length ? forward : anchors).sort((a,b) => distance(pc,a)-distance(pc,b))[0];
    if (!target) {
      event(s, 'grapple', pc.x, pc.y, 'No overhead anchor in reach.');
      return false;
    }
  }
  p.energy -= cost;
  s.cooldowns[module] = COOLDOWN[module];
  if (module === 'magnet') {
    if (p.holding) {
      followHeld(s);
      drop(s, target);
      target.vx = p.facing*480; target.vy = -110;
      s.stats.throws++;
      event(s, 'throw', target.x, target.y, 'Scrap launched.');
    } else {
      target.held = true; p.holding = target.id;
      followHeld(s);
      event(s, 'magnet', target.x, target.y, 'Magnet locked. Swap modules to try a combination.');
    }
  } else if (module === 'emp') {
    s.stats.pulses++;
    if (distance(pc,center(s.hound)) <= 170) s.hound.stunned = Math.max(s.hound.stunned,6);
    for (const c of s.crates) {
      if (c.id === p.holding || distance(pc,center(c)) <= 170) {
        c.charge = 10;
        discover(s, 'charged-scrap', center(c), 'Conductive scrap: the EMP charged loose metal.');
      }
    }
    event(s, 'emp', pc.x, pc.y, 'EMP pulse: metal conducts; powered machinery goes quiet.');
  } else {
    p.grapple = {x:target.x, y:target.y, ttl:1.4};
    s.stats.grapples++;
    event(s, 'grapple', target.x, target.y, 'Grapple attached. Use again to release.');
  }
  return true;
}

function closeGate(s) {
  // Timer expiry must never leave a body embedded in a newly solid gate.
  s.gate.open = false;
  for (const body of [s.player, ...s.crates]) {
    if (!overlap(body, WORLD.gate)) continue;
    body.x = center(body).x < WORLD.gate.x+WORLD.gate.w/2
      ? WORLD.gate.x-body.w : WORLD.gate.x+WORLD.gate.w;
    body.vx = 0;
  }
}

export function step(s, input = {}, dt = 0) {
  dt = Number.isFinite(dt) ? clamp(dt,0,0.033) : 0;
  if (!dt) return s;
  input = input || {};
  const p = s.player, d = s.hound;
  s.time += dt;
  p.energy = Math.min(100,p.energy+12*dt);
  p.invulnerable = decay(p.invulnerable,dt);
  for (const key of Object.keys(COOLDOWN)) s.cooldowns[key] = decay(s.cooldowns[key],dt);
  if (s.gate.open) {
    s.gate.timer = decay(s.gate.timer,dt);
    if (!s.gate.timer) closeGate(s);
  }
  const solids = geometry(s);
  for (const c of s.crates) {
    c.charge = decay(c.charge,dt);
    if (c.held) continue;
    c.vy = Math.min(450,c.vy+850*dt);
    const grounded = move(c,c.vx*dt,c.vy*dt,[...solids,...s.crates.filter(other => other !== c && !other.held)]);
    c.vx *= Math.exp(-(grounded ? 5 : 0.35)*dt);
    c.y = Math.min(c.y,WORLD.height-c.h);
  }

  const direction = Number(input.right === true)-Number(input.left === true);
  if (direction) p.facing = direction;
  const jumping = input.jump === true;
  if (jumping && !s._jumpHeld && p.grounded && !p.grapple) {
    p.vy = -320;
    p.grounded = false;
  }
  s._jumpHeld = jumping;
  if (p.grapple) {
    const pc = center(p), cable = p.grapple, length = distance(pc,cable);
    cable.ttl = decay(cable.ttl,dt);
    if (length <= 24 || !cable.ttl) p.grapple = null;
    else {
      const speed = Math.min(300,Math.max(0,length-20)/dt);
      p.vx = (cable.x-pc.x)/length*speed;
      p.vy = (cable.y-pc.y)/length*speed;
    }
  }
  if (!p.grapple) {
    if (direction) p.vx += clamp(direction*150-p.vx,-1100*dt,1100*dt);
    else p.vx *= Math.exp(-12*dt);
    p.vy = Math.min(450,p.vy+850*dt);
  }
  p.grounded = move(p,p.vx*dt,p.vy*dt,[...solids,...s.crates.filter(c => !c.held)]);
  if (p.y > WORLD.height) {
    p.x = WORLD.spawn.x; p.y = WORLD.spawn.y; p.vx = 0; p.vy = 0; p.grapple = null;
    if (p.holding) drop(s,s.crates.find(c => c.id === p.holding));
    event(s, 'tag', p.x,p.y,'Recovery tether returned the suit to the entry platform.');
  }
  if (p.holding) followHeld(s);

  const wasStunned = d.stunned > 0;
  d.attack = decay(d.attack,dt);
  d.stunned = decay(d.stunned,dt);
  if (!wasStunned) {
    d.x += d.direction*WORLD.hound.speed*dt;
    if (d.x >= WORLD.hound.maxX) { d.x = WORLD.hound.maxX; d.direction = -1; }
    if (d.x <= WORLD.hound.minX) { d.x = WORLD.hound.minX; d.direction = 1; }
  }
  for (const c of s.crates) {
    if (c.charge > 0 && distance(center(c),WORLD.relay) <= 54) {
      c.charge = 0;
      s.gate.open = true; s.gate.timer = 20;
      event(s, 'spark', WORLD.relay.x,WORLD.relay.y,'Relay powered. Gate open for twenty seconds.');
      discover(s,'relay-bypass',WORLD.relay,'Relay bypass: charged scrap powers the gate.');
    }
    const touching = !c.held && overlap(c,d);
    if (touching && !c._houndContact && c.charge > 0 && Math.hypot(c.vx,c.vy) > 40) {
      d.stunned = Math.max(d.stunned,8);
      event(s,'spark',c.x,c.y,'Charged scrap shorted the patrol hound.');
    }
    c._houndContact = touching;
  }
  if (!d.stunned && !p.invulnerable && overlap(p,d)) {
    d.attack = 0.45;
    p.energy = Math.max(0,p.energy-15);
    p.invulnerable = 1.5;
    p.vx = center(p).x < center(d).x ? -220 : 220;
    p.vy = -100;
    event(s,'tag',p.x,p.y,'Hound tag. Suit integrity protected; battery drained.');
  }
  const pc = center(p);
  if (pc.x > WORLD.gate.x+WORLD.gate.w && p.y+p.h < WORLD.gate.y+10) {
    discover(s,'sky-route',pc,'Sky route: you crossed above the locked gate.');
  }
  if (!s.won && overlap(p,WORLD.goal)) {
    s.won = true;
    event(s,'win',WORLD.goal.x,WORLD.goal.y,'Prototype core recovered. The scrapyard is still yours to explore.');
  }
  return s;
}
