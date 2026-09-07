export const WORLD = {
  width: 2048, height: 640,
  spawn: {x:80,y:540},
  platforms: [
    {x:0,y:584,w:2048,h:56,kind:'ground'},
    {x:312,y:492,w:208,h:16,kind:'catwalk'},
    {x:648,y:412,w:232,h:16,kind:'catwalk'},
    {x:1024,y:400,w:208,h:16,kind:'catwalk'},
    {x:1376,y:376,w:320,h:16,kind:'catwalk'},
    {x:1776,y:452,w:160,h:16,kind:'catwalk'},
    {x:544,y:552,w:64,h:32,kind:'concrete'},
    {x:944,y:552,w:48,h:32,kind:'concrete'}
  ],
  anchors: [{x:392,y:402},{x:728,y:304},{x:1088,y:292},{x:1456,y:266},{x:1824,y:342}],
  crates: [{id:'scrap-a',x:208,y:560},{id:'scrap-b',x:608,y:560},{id:'scrap-c',x:1120,y:560},{id:'scrap-d',x:1344,y:560}],
  gate: {x:1552,y:448,w:28,h:136},
  relay: {x:1508,y:552},
  drone: {x:1060,y:536,minX:820,maxX:1450,speed:64},
  goal: {x:1888,y:528,w:40,h:56}
};
