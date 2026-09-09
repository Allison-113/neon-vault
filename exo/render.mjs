import { WORLD } from './world.mjs';
import { suitFrameRect, suitSheetState, houndFrameRect, houndSheetState } from './sprites.mjs';

const C={sky:'#0b1425',far:'#111e32',back:'#18283d',metal:'#304359',edge:'#586579',cyan:'#69e9d8',gold:'#f7c56f',lime:'#d4f875',pink:'#eb6f91'};
const noise=(n)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
export function createRenderer(canvas){
  const g=canvas.getContext('2d',{alpha:false});
  let width=960,height=440,cx=0,cy=180,first=true;
  const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  const line=(x,y,x2,y2,c,w=1)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(Math.round(x)+.5,Math.round(y)+.5);g.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);g.stroke()};
  const text=(str,x,y,c='#8399af',size=8)=>{g.fillStyle=c;g.font=`${size}px monospace`;g.fillText(str,Math.round(x),Math.round(y))};
  function resize(){const r=canvas.getBoundingClientRect();if(!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<=0||r.height<=0)return;width=r.width<620?480:Math.min(1100,Math.round(r.width));height=Math.max(1,Math.round(width*r.height/r.width));canvas.width=width;canvas.height=height;g.imageSmoothingEnabled=false;first=true;}
  resize();
  function glow(x,y,r,color){const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,color);grad.addColorStop(1,'transparent');g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2)}
  function skyline(t,reduced){
    rect(0,0,width,height,C.sky);
    const gradient=g.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#0b1021');gradient.addColorStop(1,'#213442');g.fillStyle=gradient;g.fillRect(0,0,width,height);
    const moonX=width*.78-cx*.04;glow(moonX,75-cy*.09,150,'#3d747b22');rect(moonX-14,61-cy*.09,28,28,'#53717e');rect(moonX-9,56-cy*.09,18,38,'#53717e');
    for(let layer=0;layer<3;layer++){
      const par=.06+layer*.09,base=height*.92+cy*.05;
      for(let i=-2;i<35;i++){
        const bw=36+Math.floor(noise(i+layer*71)*55),bh=95+noise(i*7+layer*133)*255;
        const x=i*75-cx*par,y=base-bh;
        if(x>width+80||x+bw<0)continue;
        rect(x,y,bw,bh,layer===0?'#102036':layer===1?'#172b40':'#203346');
        rect(x+3,y-6,bw-6,6,layer===2?'#33495a':'#24344a');
        if(i%3===0){line(x+bw*.6,y,x+bw*.6,y-29,'#3e556a');rect(x+bw*.6-1,y-30,3,2,i%2?C.pink:'#61899b')}
        for(let wy=y+12;wy<base-7;wy+=12)for(let wx=x+7;wx<x+bw-5;wx+=10){const on=noise(i*73+wy*7+wx*3+layer)> .57;rect(wx,wy,3,5,on?(layer===2?'#7c96836b':'#62869d40'):'#10223333')}
        if(layer===2&&i%4===0){rect(x+bw-10,y+22,14,54,'#243149');text('09',x+bw-8,y+33,'#76bdcc',6);for(let sy=0;sy<4;sy++)rect(x+bw-7,y+39+sy*8,8,2,'#5c97b6')}
      }
    }
    if(!reduced)for(let i=0;i<4;i++){const x=((t*(10+i*3)+i*223)%(width+100))-50;const y=40+i*36;rect(x,y,10,2,'#7893aa');rect(x-4,y+1,3,1,C.pink);rect(x+10,y,2,1,C.cyan)}
    g.fillStyle='#7aa7b107';for(let y=0;y<height;y+=3)g.fillRect(0,y,width,1);
  }
  function sign(x,y,label,color=C.cyan,w=112){rect(x-3,y-3,w+6,28,'#0c1525');rect(x,y,w,22,'#1c2b3b');line(x,y,x+w,y,color);text(label,x+7,y+15,color,9);glow(x+w/2,y+12,65,color===C.cyan?'#3bdece12':'#ed789215')}
  function scenery(t){
    // Rear industrial wall: ducts, grime, hazard markings and service doors.
    rect(-40,552,2130,32,'#1e2c39');line(0,551,2048,551,'#486071');
    for(let i=0;i<39;i++){const x=i*56;rect(x,496,3,87,'#263949');line(x,508,x+56,544,'#36505e66');line(x,544,x+56,508,'#36505e66');rect(x+1,492,4,4,'#52707b')}
    for(const [x,y,w,h,col] of [[-54,428,200,155,'#283847'],[690,480,145,104,'#293442'],[1620,496,120,88,'#34383f']]){rect(x,y,w,h,col);rect(x,y,w,4,'#59646c');for(let j=7;j<w;j+=12){rect(x+j,y+5,3,h-6,'#1c29358c');rect(x+j+3,y+5,1,h-7,'#637a7933')}text('M / LOGISTICS',x+12,y+23,'#738b91',8);rect(x+12,y+h-19,25,4,'#829b7844');rect(x+w-26,y+14,14,9,'#bd9261')}
    // Service machinery and rooftop conduits.
    rect(150,533,28,51,'#314756');rect(153,537,22,20,'#152c3b');rect(157,542,12,3,C.cyan);rect(153,563,22,14,'#263543');
    for(let x=32;x<2000;x+=183){rect(x,578,45,6,'#17232e');rect(x+4,570,33,8,'#3c4b57');for(let k=0;k<4;k++)rect(x+7+k*7,570,2,5,'#152330')}
    sign(18,456,'SCRAP / 09',C.cyan,105);sign(752,448,'RECLAIM / REUSE',C.gold,115);sign(1260,472,'KEEP OUT',C.pink,88);sign(1780,484,'CORE STORAGE',C.cyan,130);
    // Crane structures carry the grapple anchors.
    for(let i=0;i<WORLD.anchors.length;i++){const a=WORLD.anchors[i];rect(a.x+43,a.y-77,8,584-(a.y-77),'#263648');rect(a.x-42,a.y-78,100,9,'#4d5360');rect(a.x-42,a.y-70,100,3,'#172435');for(let k=0;k<6;k++)line(a.x-39+k*17,a.y-76,a.x-25+k*17,a.y-70,'#b5965566',2);line(a.x,a.y-66,a.x,a.y-8,'#677586');rect(a.x-3,a.y-10,6,9,'#75818c')}
    // Loose debris and wet ground.
    for(let i=0;i<100;i++){const x=noise(i+83)*2048;const y=578+noise(i+12)*5;rect(x,y,3+noise(i)*12,3,'#516170');if(i%5===0)rect(x+2,y-4,5,4,'#344453')}
  }
  function platforms(){
    for(const p of WORLD.platforms){if(p.kind==='ground'){rect(p.x,p.y,p.w,p.h,'#17242e');rect(p.x,p.y,p.w,3,'#64777d');rect(p.x,p.y+3,p.w,4,'#30484f');for(let x=0;x<2048;x+=32){line(x,p.y+9,x+17,p.y+9,'#365261');if(x%96===0){rect(x+5,p.y+16,38,1,'#6ca39b33');rect(x+14,p.y+20,51,1,'#84b6af22')}}}else if(p.kind==='concrete'){rect(p.x,p.y,p.w,p.h,'#41505b');rect(p.x,p.y,p.w,3,'#768381');rect(p.x+5,p.y+7,p.w-10,p.h-12,'#35414f');for(let x=p.x+5;x<p.x+p.w-5;x+=14)line(x,p.y,x+8,p.y+6,'#baa765',3)}else{rect(p.x,p.y,p.w,p.h,'#263844');rect(p.x,p.y,p.w,3,'#8d9a8c');rect(p.x,p.y+4,p.w,4,'#455b61');for(let x=p.x+4;x<p.x+p.w;x+=14)rect(x,p.y+5,7,2,'#84927f');rect(p.x+9,p.y+p.h,5,584-p.y-p.h,'#253441');rect(p.x+p.w-14,p.y+p.h,5,584-p.y-p.h,'#253441');line(p.x+12,p.y+16,p.x+p.w-12,p.y+70,'#2f404e');for(let x=p.x;x<p.x+p.w;x+=48){rect(x,p.y-23,2,23,'#576a6f');line(x,p.y-21,Math.min(p.x+p.w,x+48),p.y-21,'#576a6f')}}}
  }
  function anchors(state,selected,t){
    for(const a of WORLD.anchors){const dist=Math.hypot(a.x-state.player.x,a.y-state.player.y);const can=selected==='grapple'&&dist<400;glow(a.x,a.y,can?30:14,can?'#efbd7344':'#efbd7318');rect(a.x-6,a.y-6,12,12,'#263643');line(a.x-6,a.y-6,a.x+6,a.y-6,C.gold,2);line(a.x-6,a.y+6,a.x+6,a.y+6,C.gold,2);line(a.x-6,a.y-5,a.x-6,a.y+5,C.gold,2);line(a.x+6,a.y-5,a.x+6,a.y+5,C.gold,2);rect(a.x-2,a.y-2,4,4,can?'#ffeac0':'#a48b64');if(can){text('↑',a.x-3,a.y-14,C.gold,10);g.strokeStyle='#efbd7330';g.strokeRect(a.x-11,a.y-11,22,22)}}
  }
  function crate(c,t){rect(c.x,c.y,c.w,c.h,'#172c3a');rect(c.x+1,c.y+1,c.w-2,c.h-2,c.charge>0?'#396875':'#465762');rect(c.x+4,c.y+4,c.w-8,c.h-8,'#293e4c');line(c.x+4,c.y+4,c.x+c.w-5,c.y+c.h-5,'#6d8186',2);line(c.x+c.w-5,c.y+4,c.x+4,c.y+c.h-5,'#6d8186',2);rect(c.x+2,c.y+2,3,3,C.gold);rect(c.x+c.w-5,c.y+c.h-5,3,3,C.gold);if(c.charge>0){glow(c.x+12,c.y+12,35,'#71dfff44');g.strokeStyle=C.cyan;g.lineWidth=1;g.strokeRect(c.x-2,c.y-2,c.w+4,c.h+4);const o=Math.floor(t*12)%4;line(c.x-6,c.y+o*6,c.x-10,c.y+o*6+4,C.cyan);line(c.x+c.w+3,c.y+8,c.x+c.w+8,c.y+4,C.cyan)}}
  function gate(state,t){const a=WORLD.gate;rect(a.x-8,a.y-13,a.w+16,13,'#4e5460');rect(a.x-8,a.y-13,a.w+16,3,'#d69e67');rect(a.x-7,a.y,a.w+14,a.h,'#152735');if(!state.gate.open){rect(a.x,a.y,a.w,a.h,'#543f47');for(let y=a.y+2;y<a.y+a.h;y+=12){rect(a.x+2,y,a.w-4,5,'#77616b');rect(a.x+2,y+5,a.w-4,2,'#242b3b')}rect(a.x+11,a.y+35,6,17,C.pink);glow(a.x+14,a.y+43,50,'#eb6f9133')}else{for(let y=a.y;y<a.y+22;y+=5)rect(a.x,y,a.w,3,'#527879');line(a.x+2,a.y+26,a.x+2,a.y+a.h,'#69e9d855');text('OPEN',a.x-2,a.y-21,C.cyan,8)}const r=WORLD.relay;line(r.x,r.y,a.x+14,a.y+92,'#4c7180',2);rect(r.x-10,r.y-16,20,30,'#243b4b');rect(r.x-7,r.y-13,14,16,'#0d2030');rect(r.x-4,r.y-10,8,10,state.gate.open?C.cyan:C.pink);rect(r.x-6,r.y+7,12,3,C.gold);text('RELAY',r.x-16,r.y-23,'#d6b284',7);if(!state.gate.open)text('NO SIGNAL',a.x-16,a.y-22,'#c6798a',7)}
  /** Draws source rect `r` from `sheetState.img` into the local dest box, or a plain colored
   *  fallback rect if the sheet failed or hasn't loaded yet (or drawImage itself throws) — a
   *  sprite render must never leave the player or hound invisible or throw uncaught. The source
   *  sheets have a near-black cell background behind each character; drawing it with 'lighten'
   *  compositing instead of the default 'source-over' means that background contributes nothing
   *  wherever the scene underneath is already lighter (which it always is here), so the sprite
   *  reads as cut out rather than pasted inside a visible dark tile — no edit to either sheet. */
  function sprite(sheetState,r,dx,dy,dw,dh,fallbackColor){
    if(sheetState.ready&&!sheetState.failed){
      const prevOp=g.globalCompositeOperation;
      try{g.globalCompositeOperation='lighten';g.drawImage(sheetState.img,r.x,r.y,r.w,r.h,dx,dy,dw,dh);return;}
      catch{}
      finally{g.globalCompositeOperation=prevOp;} // must restore even on throw, or every later draw this frame stays in lighten mode
    }
    rect(dx,dy,dw,dh,fallbackColor);
  }
  function hound(d,t,reducedMotion){
    // Feet stay pinned to d.y+d.h always — no floating sine bob, in any motion mode.
    const x=d.x,y=d.y;
    const pose=d.stunned>0?'idle':d.attack>0?'attack':'walk';
    const frame=reducedMotion||pose!=='walk'?0:Math.floor(t*10)%3;
    const r=houndFrameRect(pose,frame);
    const dw=d.w,dh=r.h*(d.w/r.w);
    g.save();if(d.stunned>0)g.globalAlpha=.55;
    g.translate(x+d.w/2,y+d.h);g.scale(-d.direction,1); // Ember's sheet samples face left, unlike the player's right-facing row
    sprite(houndSheetState(),r,-dw/2,-dh,dw,dh,'#7a4030');
    g.restore();g.globalAlpha=1;
    if(d.stunned>0){text('OFFLINE',x-6,y-dh-8,C.cyan,6);if(Math.floor(t*7)%2)line(x+d.w*.6,y-dh-2,x+d.w*.6+4,y-dh-10,C.cyan)}else glow(x+d.w/2,y+d.h*.5,26,'#ec698722')
  }
  function player(p,selected,t,reducedMotion){
    const x=Math.round(p.x),y=Math.round(p.y);if(p.invulnerable>0&&Math.floor(t*14)%2===0)g.globalAlpha=.45;
    if(p.grapple){line(x+9,y+10,p.grapple.x,p.grapple.y,'#c9bb87',1);line(x+9,y+11,p.grapple.x+1,p.grapple.y+1,'#edc46d33',2)}
    glow(x+9,y+12,32,'#a9e99620');
    g.save();g.translate(x+9,y);g.scale(p.facing,1);
    const moving=p.grounded&&Math.abs(p.vx)>8;
    const frame=reducedMotion||!moving?0:Math.floor(t*9)%4;
    const r=suitFrameRect(p.suitId,'right',frame);
    const dw=r.w,dh=r.h,dx=-dw/2-1,dy=30-dh;
    sprite(suitSheetState(),r,dx,dy,dw,dh,'#5c8290');
    if(selected==='magnet'||selected==='emp')rect(9,13,3,3,selected==='magnet'?C.gold:C.cyan);
    if(!p.grounded){rect(-9,22,3,3,'#e6c584');if(Math.floor(t*20)%2)rect(-9,25,2,4,'#6ec8c2')}
    g.restore();g.globalAlpha=1;
    if(p.holding){const cX=p.x+9+p.facing*29;line(p.x+9,p.y+16,cX,p.y+17,'#edc46d88');line(p.x+10,p.y+12,cX,p.y+8,'#edc46d55');}
  }
  function goal(s,t){const a=WORLD.goal;rect(a.x-6,a.y+a.h-8,a.w+12,8,'#435661');rect(a.x,a.y+20,a.w,a.h-26,'#294453');rect(a.x+4,a.y+25,a.w-8,4,'#5f8d91');rect(a.x+6,a.y+32,a.w-12,15,'#142c3b');rect(a.x+9,a.y+35,16,3,s.won?'#648b7d':C.cyan);if(!s.won){const yy=a.y+Math.sin(t*2)*3;glow(a.x+20,yy+12,55,'#b6ee8e44');rect(a.x+10,yy+2,20,19,'#5a8a78');rect(a.x+13,yy-1,14,25,'#93c49a');rect(a.x+16,yy+3,8,17,'#d9ffc0');rect(a.x+19,yy+6,2,11,'#fff6c6');text('PROTOTYPE CORE',a.x-25,a.y-17,'#d4f875',8)}else{text('CORE EXTRACTED',a.x-23,a.y+5,C.cyan,8)}}
  function draw(state,{selected='magnet',particles=[],reducedMotion=false}={}){
    const p=state.player,t=state.time;
    const tx=Math.max(0,Math.min(WORLD.width-width,p.x+9-width*.4+p.facing*25));
    const ty=Math.max(0,Math.min(WORLD.height-height,p.y+15-height*.64));
    cx=first?tx:cx+(tx-cx)*.1;cy=first?ty:cy+(ty-cy)*.12;first=false;cx=Math.max(0,cx);cy=Math.max(0,cy);
    skyline(t,reducedMotion);
    g.save();g.translate(-Math.round(cx),-Math.round(cy));
    scenery(t);platforms();anchors(state,selected,t);gate(state,t);goal(state,t);
    for(const c of state.crates)crate(c,t);
    hound(state.hound,t,reducedMotion);player(p,selected,t,reducedMotion);
    for(const e of particles){const life=e.life/e.max;g.globalAlpha=Math.max(0,life);if(e.ring){g.strokeStyle=e.color;g.lineWidth=2;g.beginPath();g.arc(e.x,e.y,e.radius*(1-life)+8,0,Math.PI*2);g.stroke()}else rect(e.x,e.y,e.size||2,e.size||2,e.color)}g.globalAlpha=1;
    // Foreground moisture and illuminated puddles; no collision hidden in art.
    for(let i=0;i<18;i++){const x=i*117+noise(i)*60;rect(x,589,40+noise(i+6)*55,2,i%3?'#57949b33':'#d4bb8133');rect(x+8,594,22,1,'#6aa5b222')}
    g.restore();
    if(!reducedMotion){g.strokeStyle='#a0cee528';g.lineWidth=1;g.beginPath();for(let i=0;i<65;i++){const x=(noise(i+54)*width+t*28)%width,y=(noise(i+13)*height+t*(140+noise(i)*70))%height;g.moveTo(x,y);g.lineTo(x-3,y+10)}g.stroke()}
    // Tiny camera telemetry belongs to the world view.
    text(`X ${String(Math.round(p.x)).padStart(4,'0')}  /  ${(p.suitId||'').toUpperCase()}`,10,height-10,'#819da66b',6);
  }
  return {draw,resize,getCamera:()=>({x:cx,y:cy,width,height})};
}
