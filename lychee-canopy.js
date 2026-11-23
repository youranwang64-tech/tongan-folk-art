(() => {
  const print = document.querySelector('#print-lychee .rub-print');
  const canvas = print?.querySelector('.lychee-canopy');
  const context = canvas?.getContext('2d');
  if (!context || typeof Path2D !== 'function') return;

  const artWidth = 745;
  const artHeight = 553;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const leafShape = new Path2D('M0 0 C22 -18 62 -27 100 -7 C84 1 65 18 36 15 C21 13 8 6 0 0 Z');
  const fruitShape = new Path2D('M-1 -14 C8 -16 15 -9 15 1 C15 10 8 16 -1 16 C-10 15 -16 7 -15 -1 C-14 -9 -9 -14 -1 -14 Z');
  const stems = [
    new Path2D('M-25 0 Q91 17 167 66 Q248 107 327 167'),
    new Path2D('M765 -9 Q680 15 629 61 Q561 103 494 142'),
    new Path2D('M-23 539 Q67 513 123 465 Q195 430 274 365'),
    new Path2D('M763 552 Q687 521 644 476 Q599 440 539 409'),
  ];
  const colours = [
    ['#365446', '#779078', '#4c6e58', '#c8d0aa'],
    ['#364c4b', '#829694', '#4b6962', '#cbd7c3'],
    ['#455746', '#98a58a', '#61795d', '#e0ddba'],
    ['#485945', '#879173', '#5d755a', '#d6d7b5'],
  ];
  // Origins sit on the stems so the blade angles read in pairs.
  const leafLayout = [
    [24,13,73,153],[54,25,10,127],[70,31,78,116],[114,47,-24,134],
    [129,55,62,141],[159,64,-17,113],[185,77,61,120],[206,91,-8,130],
    [230,104,75,95],[254,120,10,124],[285,140,50,104],[314,157,26,93],
    [727,4,112,145],[698,19,162,130],[676,30,104,145],[651,45,178,120],
    [634,57,112,119],[617,68,175,112],[584,87,115,102],[564,99,168,121],
    [537,116,124,90],[505,135,152,84],
    [27,522,265,132],[51,509,344,146],[86,490,255,116],[107,475,327,150],
    [139,455,266,121],[164,440,332,137],[183,431,266,105],[205,414,321,108],
    [230,398,269,103],[254,379,317,98],
    [714,532,210,133],[699,523,277,120],[681,506,212,131],[661,491,271,117],
    [639,473,215,121],[618,457,274,106],[590,437,199,120],[560,419,233,86],
  ];
  const leaves = leafLayout.map(([x, y, degrees, length], index) => ({
    x, y, angle: degrees * Math.PI / 180, size: length / 100,
    shape: leafShape, colour: colours[index % colours.length], index,
    centerX: 49, reach: 31 * length / 100,
  }));
  const clusters = [
    {x:176, y:85, stemX:155, stemY:63, size:.79},
    {x:657, y:94, stemX:642, stemY:52, size:.90},
    {x:106, y:456, stemX:146, stemY:453, size:.84},
    {x:654, y:483, stemX:635, stemY:471, size:.74},
  ];
  const fruitLayout = [[2,10,1],[-13,15,.95],[17,24,1],[-4,30,1.03],[-17,36,.88],[11,42,.92],[-4,50,.86]];
  const fruit = clusters.flatMap(({x,y,size},i) =>
    fruitLayout.map(([dx,dy,scale],j) => ({
      x:x+dx*size,y:y+dy*size,angle:(j%3-1)*.25,size:size*scale,
      shape:fruitShape,index:i*8+j,centerX:0,reach:16*size,
    }))
  );
  const pieces = [...leaves,...fruit];
  for (const piece of pieces) {
    piece.cx = piece.x + Math.cos(piece.angle) * piece.centerX * piece.size;
    piece.cy = piece.y + Math.sin(piece.angle) * piece.centerX * piece.size;
    piece.progress = 0;
  }

  const relief = new Image();
  let animation = 0;
  const keep = new Set();
  let previous;
  const isOpen = () => print.getAttribute('aria-pressed') === 'true';

  function place(piece, move = false) {
    const eased = move ? Math.sin(piece.progress * Math.PI / 2) : 0;
    context.translate(piece.x + (piece.shiftX || 0)*eased, piece.y + (piece.shiftY || 0)*eased);
    context.rotate(piece.angle + (piece.index % 2 ? .48 : -.37)*eased);
    context.scale(piece.size, piece.size);
  }

  function paintLeaf(leaf) {
    const [ink, light, shade, vein] = leaf.colour;
    const wash = context.createLinearGradient(9, -20, 41, 17);
    wash.addColorStop(0, ink);
    wash.addColorStop(.45, light);
    wash.addColorStop(.53, shade);
    wash.addColorStop(1, ink);
    context.fillStyle = wash;
    context.fill(leafShape);
    context.strokeStyle = '#364d4299';
    context.lineWidth = .85;
    context.stroke(leafShape);

    context.save();
    context.clip(leafShape);
    context.strokeStyle = vein;
    context.globalAlpha *= .54;
    context.lineWidth = .8;
    context.beginPath();
    context.moveTo(2, 0);
    context.quadraticCurveTo(53, -2, 97, -7);
    for (let x = 16; x < 83; x += 9) {
      context.moveTo(x,-x*.06);
      context.quadraticCurveTo(x+13, -9, x+23,-24);
      context.moveTo(x,-x*.06);
      context.quadraticCurveTo(x+11,9,x+23,17);
    }
    context.stroke();
    context.restore();
  }

  function paintFruit(piece) {
    const wash = context.createRadialGradient(-5,-6,1,2,3,17);
    wash.addColorStop(0, piece.index % 3 ? '#c88472' : '#d9967e');
    wash.addColorStop(.55, '#a55c51');
    wash.addColorStop(1, '#633b35');
    context.fillStyle = wash;
    context.fill(fruitShape);
    context.strokeStyle = '#68433a99';
    context.lineWidth = .8;
    context.stroke(fruitShape);

    context.save();
    context.clip(fruitShape);
    context.strokeStyle = '#f3bc9e8c';
    context.lineWidth = .65;
    context.beginPath();
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const x=col*5+(row%2)*2.5, y=row*5;
        context.moveTo(x-1.9,y+1.5);
        context.lineTo(x,y-1.2);
        context.lineTo(x+2.1,y+.95);
      }
    }
    context.stroke();
    context.restore();
  }

  function draw() {
    context.setTransform(canvas.width/artWidth,0,0,canvas.height/artHeight,0,0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0,0,artWidth,artHeight);
    context.drawImage(relief,0,0,artWidth,artHeight);

    // Each uncovered patch inherits its own leaf or fruit silhouette.
    context.globalCompositeOperation = 'destination-out';
    for (const piece of keep) {
      context.save();
      context.globalAlpha = Math.min(1,piece.progress*1.6);
      context.fillStyle = '#000';
      place(piece);
      context.fill(piece.shape);
      context.restore();
    }

    context.globalCompositeOperation = 'source-over';
    context.lineCap = 'round';
    context.strokeStyle = '#505c49cd';
    context.lineWidth = 3.2;
    for (const stem of stems) context.stroke(stem);
    context.lineWidth = 1.15;
    for (const cluster of clusters) {
      context.beginPath();
      context.moveTo(cluster.stemX,cluster.stemY);
      context.quadraticCurveTo(cluster.x,cluster.y,cluster.x,cluster.y+40*cluster.size);
      context.stroke();
    }

    for (const piece of pieces) {
      if (piece.progress === 1) continue;
      context.save();
      context.globalAlpha = 1-piece.progress;
      place(piece,true);
      if (piece.colour) paintLeaf(piece);
      else paintFruit(piece);
      context.restore();
    }
  }

  function tick(now) {
    animation = 0;
    let active = false;
    for (const piece of keep) {
      piece.progress = motion.matches ? 1 : Math.min(1,(now-piece.started)/395);
      if (piece.progress < 1) active = true;
    }
    draw();
    if (active) animation = requestAnimationFrame(tick);
  }

  function sweep(event) {
    if (event.pointerType === 'touch' || isOpen() || !print.classList.contains('canopy-ready')) return;
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX-box.left)/box.width*artWidth;
    const y = (event.clientY-box.top)/box.height*artHeight;
    if (x<0 || y<0 || x>artWidth || y>artHeight) { previous = undefined; return; }
    const start = previous || {x,y};
    const vx=x-start.x, vy=y-start.y;
    const length = vx*vx+vy*vy;
    previous = {x,y};
    for (const piece of pieces) {
      if (keep.has(piece)) continue;
      const t = length ? Math.max(0,Math.min(1,((piece.cx-start.x)*vx+(piece.cy-start.y)*vy)/length)) : 0;
      const dx=piece.cx-start.x-vx*t, dy=piece.cy-start.y-vy*t;
      if (Math.hypot(dx,dy)>piece.reach+24) continue;
      const n=Math.hypot(dx,dy) || 1;
      piece.shiftX=dx/n*17;
      piece.shiftY=dy/n*17-6;
      piece.started=performance.now();
      keep.add(piece);
    }
    if (keep.size && !animation && [...keep].some(piece=>piece.progress<1)) animation=requestAnimationFrame(tick);
  }

  function resize() {
    const width = Math.min(print.clientWidth,print.clientHeight*artWidth/artHeight);
    if (width<=0 || !relief.naturalWidth) return;
    const height = width*artHeight/artWidth;
    canvas.style.width = width+'px';
    canvas.style.height = height+'px';
    const density = Math.min(devicePixelRatio,2);
    canvas.width = Math.round(width*density);
    canvas.height = Math.round(height*density);
    draw();
    print.classList.add('canopy-ready');
  }

  relief.onload = () => {
    resize();
    new ResizeObserver(resize).observe(print);
  };
  relief.src = 'assets/relief-lychee.webp';
  print.addEventListener('pointermove',sweep);
  print.addEventListener('pointerleave',() => { previous = undefined; });
  new MutationObserver(() => {
    if (isOpen()) return;
    keep.clear();
    previous = undefined;
    for (const piece of pieces) piece.progress = 0;
    if (print.classList.contains('canopy-ready')) draw();
  }).observe(print,{attributes:true,attributeFilter:['aria-pressed']});
})();
