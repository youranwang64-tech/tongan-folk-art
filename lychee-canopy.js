(() => {
  const print = document.querySelector('#print-lychee .rub-print');
  const canvas = print?.querySelector('.lychee-canopy');
  const ctx = canvas?.getContext('2d');
  if (!ctx || typeof Path2D !== 'function') return;

  const width = 745, height = 553;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Seeded variation keeps the same composition when the page rotates or resizes.
  let seed = 32719;
  function random(low, high) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return low + (high - low) * seed / 4294967296;
  }

  // Small print blocks are inked once, then reused at different angles and scales.
  function block(x, y, w, h, ink) {
    const paper = document.createElement('canvas');
    const scale = 3;
    paper.width = w * scale;
    paper.height = h * scale;
    const pen = paper.getContext('2d');
    pen.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
    pen.lineCap = 'round';
    ink(pen);
    return { paper, x, y, w, h };
  }
  const palettes = [
    ['#476449','#778761','#adb494'], ['#647557','#98a480','#c4c9a0'],
    ['#566f60','#8a9e89','#b8c3a7'], ['#3b5d58','#708f80','#9fb5a0'],
    ['#284c46','#5d7b62','#a4b28a'], ['#355649','#78885e','#b1b485'],
    ['#23473f','#516e54','#9baa83'], ['#466146','#89946c','#bdc09a']
  ];
  const leafBlocks = palettes.map(([shade, light, vein], i) => block(-2,-29,108,58,p => {
    const lift = [-7, 2, -13, -2][i % 4];
    const blade = new Path2D();
    blade.moveTo(0,0);
    blade.bezierCurveTo(17,-13, 44,-26, 70,-16);
    blade.bezierCurveTo(82,-13, 92,lift-1, 103,lift-2);
    blade.bezierCurveTo(87,lift+8, 65,18, 42,16);
    blade.bezierCurveTo(20,15, 8,6, 0,0);
    blade.closePath();
    p.fillStyle = shade;
    p.fill(blade);
    p.clip(blade);
    const fold = p.createLinearGradient(24,-23,48,10);
    fold.addColorStop(0,light); fold.addColorStop(.54,light); fold.addColorStop(1,shade);
    p.fillStyle = fold;
    p.beginPath();
    p.moveTo(-2,-32); p.lineTo(106,-32); p.lineTo(104,lift-2);
    p.bezierCurveTo(65,3, 31,-3, -2,0);
    p.fill();
    p.strokeStyle = vein;
    p.globalAlpha = .62;
    p.lineWidth = .55;
    for (let x = 10; x <= 83; x += random(6,10)) {
      const y = x / 99 * lift * (x / 99);
      p.beginPath(); p.moveTo(x, y-1);
      p.quadraticCurveTo(x+8,y-6, x+random(13,20),y-random(13,21));
      p.moveTo(x+2,y+1);
      p.quadraticCurveTo(x+11,y+9, x+random(15,23),y+random(13,20)); p.stroke();
    }
    p.globalAlpha = .76; p.lineWidth = .85;
    p.beginPath(); p.moveTo(1,0); p.bezierCurveTo(34,-3,64,3,102,lift-2); p.stroke();
    p.globalAlpha = .16;
    for (let n = 0; n < 115; n++) {
      p.fillStyle = n % 3 ? vein : shade;
      p.fillRect(random(5,97),random(-21,19),random(.15,1.1),random(.2,.7));
    }
  }));

  const fruitBlocks = [
    ['#662e33','#ac4a48','#dd9375'], ['#883537','#c35c4f','#f1ae87'],
    ['#542d34','#963f48','#cd8270'], ['#753438','#b85050','#e69c7c']
  ].map(([shadow, skin, glint]) => block(-21,-21,42,44,p => {
    const outline = new Path2D();
    for (let i = 0; i <= 54; i++) {
      const a = i * Math.PI * 2 / 54, r = random(17.4,18.45);
      const x = Math.cos(a)*r*(1-.075*Math.sin(a)), y = Math.sin(a)*r*1.06;
      if (i === 0) outline.moveTo(x,y); else outline.lineTo(x,y);
    }
    outline.closePath();
    const tone = p.createLinearGradient(-11,-14,11,17);
    tone.addColorStop(0,skin); tone.addColorStop(.47,skin); tone.addColorStop(1,shadow);
    p.fillStyle = tone; p.fill(outline); p.clip(outline);
    for (let row=-6; row<=6; row++) {
      for (let col=-6; col<=6; col++) {
        const x=col*3.7+(row%2)*1.7+random(-.85,.85), y=row*3.7+random(-.8,.8);
        const size=random(1.2,2.25);
        p.fillStyle=shadow; p.globalAlpha=random(.3,.62);
        p.beginPath(); p.moveTo(x-size,y+.3); p.lineTo(x-.2,y-size);
        p.lineTo(x+size,y-.2); p.lineTo(x+.35,y+size*.65); p.fill();
        p.strokeStyle=glint; p.lineWidth=random(.36,.7); p.globalAlpha=random(.48,.9);
        p.beginPath(); p.moveTo(x-size,y+.15); p.lineTo(x-.2,y-size); p.lineTo(x+.55,y-size*.72); p.stroke();
      }
    }
  }));

  const pieces = [];
  function addSprite(sprite,x,y,angle,sx,sy,depth,center=0) {
    pieces.push({
      sprite,x,y,angle,sx,sy,depth,
      cx:x+Math.cos(angle)*center*sx, cy:y+Math.sin(angle)*center*sx,
      reach:center ? Math.min(60,28*sx) : 16*sx,
      turn:random(-.42,.42), progress:0
    });
  }
  function addStem(x,y,ex,ey,thickness,depth) {
    const d = Math.hypot(ex-x,ey-y);
    pieces.push({x,y,angle:Math.atan2(ey-y,ex-x),length:d,thickness,depth,
      cx:(x+ex)/2,cy:(y+ey)/2,reach:d*.43,turn:0,progress:0});
  }

  // Off-frame starting points and crossing arcs give the canopy a continuous crown.
  // Each group describes its root, bend, tip, leaflet pairs, size, then depth.
  const sprigs = [
    [-90,65,170,-67,447,36,6,85,0], [264,-65,495,62,751,21,6,89,0],
    [-75,194,162,99,394,169,6,91,0], [809,82,657,188,470,202,5,86,0],
    [-64,318,133,241,358,326,6,98,0], [764,266,582,258,425,383,6,90,0],
    [-42,492,173,394,398,497,6,98,0], [833,411,669,474,421,541,6,89,0],
    [156,601,284,507,510,555,5,87,0],
    [-97,89,102,22,323,101,5,140,1], [236,-69,433,47,605,177,5,129,1],
    [806,-47,742,122,576,242,6,117,1], [-62,284,80,171,276,183,5,121,1],
    [826,192,639,259,451,333,5,131,1], [-81,421,131,276,318,344,5,143,1],
    [41,612,155,474,382,432,5,127,1], [816,534,621,445,446,458,5,119,1],
    [-97,-59,121,57,314,239,6,185,2], [406,-91,575,12,718,104,4,149,2],
    [843,119,722,237,547,318,5,157,2], [-88,557,79,422,229,342,5,174,2],
    [763,638,591,503,366,428,5,155,2],
    [313,-58,428,84,485,227,5,118,0], [193,50,355,152,518,292,6,104,0],
    [815,372,633,291,445,408,5,135,0]
  ];
  function along(s,t) {
    const u=1-t;
    return {
      x:u*u*s[0]+2*u*t*s[2]+t*t*s[4], y:u*u*s[1]+2*u*t*s[3]+t*t*s[5],
      angle:Math.atan2(u*(s[3]-s[1])+t*(s[5]-s[3]),u*(s[2]-s[0])+t*(s[4]-s[2]))
    };
  }
  const leafSets=[[0,1,2],[2,3,5,7],[3,4,5,6,7]];
  for (const [index,s] of sprigs.entries()) {
    const pairs=s[6], base=s[7], depth=s[8], order=depth*3+index*.014;
    let prev=along(s,0);
    for(let i=1;i<=pairs*2;i++) {
      const pos=along(s,i/(pairs*2));
      addStem(prev.x,prev.y,pos.x,pos.y,(1-i/(pairs*2)*.7)*(1.8+depth),order);
      prev=pos;
    }
    const shades=leafSets[depth];
    for(let n=0;n<=pairs;n++) {
      for(const side of (n===pairs ? [0] : [-1,1])) {
        const t=Math.min(1,(n+random(.04,.46))/pairs);
        const pos=along(s,t);
        const len=base*(1-.41*t)*random(.78,1.24);
        const spread=side*random(.39,1.14)*(1-.22*t);
        const sprite=leafBlocks[shades[Math.floor(random(0,shades.length))]];
        addSprite(sprite,pos.x,pos.y,pos.angle+spread,len/100,
          len/100*random(.73,1.31)*(side===-1?-1:1),order+.15+random(0,.32),47);
      }
    }
  }
  // Bunches are suspended at actual forks. Some sit behind the nearer leaflets.
  const bunches = [
    [0,.72,.64,7,1], [2,.64,.58,6,1], [4,.79,.59,7,1], [5,.55,.78,7,1],
    [9,.65,.98,10,2], [10,.74,.82,7,2], [11,.56,1.06,10,2],
    [14,.60,1.08,11,2], [16,.70,.95,8,2], [17,.71,1.48,15,3],
    [19,.73,1.24,12,3], [20,.54,1.13,10,3], [21,.67,1.38,14,3]
  ];
  for(const [index,t,size,count,plane] of bunches) {
    const root=along(sprigs[index],t);
    const order=sprigs[index][8]*3+.28+random(-.1,.15);
    const lean=random(-.30,.30), tail=(count*.21+1.1)*19*size;
    const endX=root.x+tail*lean, endY=root.y+tail;
    addStem(root.x,root.y,endX,endY,1.8*size,order);
    for(let n=0;n<count;n++) {
      const h=(n+.65)/count;
      const a=n*2.39996;
      const r=Math.sin(Math.PI*h)**.65*(count>10?33:24)*size;
      const x=root.x+(endX-root.x)*h+Math.cos(a)*r, y=root.y+tail*h;
      const fruitSize=size*random(.70,1.05)*(1-.10*h);
      addStem(root.x+(endX-root.x)*h*.75,root.y+tail*h*.75,x,y,1.05*size,order+.01);
      addSprite(fruitBlocks[Math.floor(random(0,fruitBlocks.length))],x,y,random(-.7,.7),
        fruitSize,fruitSize*random(.9,1.12),order+.05+(Math.sin(a)*.5+.5)*.22+plane*.012);
    }
  }
  pieces.sort((a,b)=>a.depth-b.depth);

  // In the small gaps between the leaflets we see the shaded interior of the tree.
  // Keep it on its own surface so brushing reveals the painting there as well.
  const shade=document.createElement('canvas');
  shade.width=width; shade.height=height;
  const shadeInk=shade.getContext('2d');
  function resetShade() {
    shadeInk.clearRect(0,0,width,height);
    const wash=shadeInk.createLinearGradient(0,height*.85,width,height*.29);
    wash.addColorStop(0,'rgba(36,57,46,.98)');
    wash.addColorStop(.58,'rgba(69,83,62,.91)');
    wash.addColorStop(1,'rgba(47,68,56,.97)');
    shadeInk.fillStyle=wash;
    shadeInk.fillRect(0,0,width,height);
  }
  const brush=document.createElement('canvas');
  brush.width=brush.height=170;
  const brushInk=brush.getContext('2d');
  const softEdge=brushInk.createRadialGradient(85,85,32,85,85,84);
  softEdge.addColorStop(0,'#000'); softEdge.addColorStop(.62,'rgba(0,0,0,.87)');
  softEdge.addColorStop(1,'rgba(0,0,0,0)');
  brushInk.fillStyle=softEdge; brushInk.fillRect(0,0,170,170);
  let lastDab;
  function partShade(x,y) {
    if (lastDab && Math.hypot(x-lastDab.x,y-lastDab.y)<6) return;
    const from=lastDab||{x,y};
    const steps=Math.max(1,Math.ceil(Math.hypot(x-from.x,y-from.y)/12));
    shadeInk.globalCompositeOperation='destination-out';
    for (let i=1;i<=steps;i++) {
      shadeInk.drawImage(brush,from.x+(x-from.x)*i/steps-85,from.y+(y-from.y)*i/steps-85);
    }
    shadeInk.globalCompositeOperation='source-over';
    lastDab={x,y};
  }
  resetShade();
  let frame=0, previous;
  let drawingWidth=0, drawingHeight=0;
  function draw() {
    if (!drawingWidth) return;
    ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(shade,0,0);
    for(const p of pieces) {
      if(p.progress>=1) continue;
      const ease=p.progress*(2-p.progress);
      ctx.save();
      ctx.globalAlpha=1-p.progress;
      ctx.translate(p.x+(p.dx||0)*ease,p.y+(p.dy||0)*ease);
      ctx.rotate(p.angle+p.turn*ease);
      if(p.sprite) {
        ctx.scale(p.sx,p.sy);
        const b=p.sprite;
        ctx.drawImage(b.paper,b.x,b.y,b.w,b.h);
      } else {
        ctx.strokeStyle=p.depth<3?'#657252':'#495b40';
        ctx.lineWidth=p.thickness;
        ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(p.length,0); ctx.stroke();
      }
      ctx.restore();
    }
  }
  const moving=new Set();
  function animate(time) {
    frame=0;
    for(const p of moving) {
      p.progress=reducedMotion.matches ? 1 : Math.max(0,Math.min(1,(time-p.start)/p.duration));
      if(p.progress>=1) moving.delete(p);
    }
    draw();
    if(moving.size) frame=requestAnimationFrame(animate);
  }
  function sweep(event) {
    if(event.pointerType==='touch' || print.getAttribute('aria-pressed')==='true') return;
    const box=canvas.getBoundingClientRect();
    if(!box.width) return;
    const x=(event.clientX-box.left)/box.width*width, y=(event.clientY-box.top)/box.height*height;
    if(x<0||y<0||x>width||y>height){previous=lastDab=undefined;return;}
    partShade(x,y);
    const start=previous||{x,y};
    const vx=x-start.x, vy=y-start.y, distance=vx*vx+vy*vy;
    previous={x,y};
    const now=performance.now();
    for(const p of pieces) {
      if(p.progress===1||moving.has(p)) continue;
      const t=distance ? Math.max(0,Math.min(1,((p.cx-start.x)*vx+(p.cy-start.y)*vy)/distance)) : 0;
      const dx=p.cx-start.x-vx*t, dy=p.cy-start.y-vy*t, proximity=Math.hypot(dx,dy);
      if(proximity>p.reach+24) continue;
      const shift=(12+p.depth*2)/(proximity||1);
      p.dx=dx*shift; p.dy=dy*shift-7;
      p.start=now+Math.max(0,6-p.depth)*12;
      p.duration=290+p.depth*13;
      moving.add(p);
    }
    if(!frame) frame=requestAnimationFrame(animate);
  }
  function resize() {
    drawingWidth=Math.min(print.clientWidth,print.clientHeight*width/height);
    if(!drawingWidth) return;
    drawingHeight=drawingWidth*height/width;
    canvas.style.width=drawingWidth+'px'; canvas.style.height=drawingHeight+'px';
    const dpr=Math.min(devicePixelRatio,2);
    canvas.width=Math.round(drawingWidth*dpr); canvas.height=Math.round(drawingHeight*dpr);
    draw();
    print.classList.add('canopy-ready');
  }
  resize();
  new ResizeObserver(resize).observe(print);
  print.addEventListener('pointermove',sweep);
  print.addEventListener('pointerleave',()=>{previous=lastDab=undefined;});
  new MutationObserver(()=>{
    if(print.getAttribute('aria-pressed')==='true') return;
    cancelAnimationFrame(frame); frame=0;
    moving.clear(); previous=lastDab=undefined;
    resetShade();
    for(const p of pieces) p.progress=0;
    draw();
  }).observe(print,{attributes:true,attributeFilter:['aria-pressed']});
})();
