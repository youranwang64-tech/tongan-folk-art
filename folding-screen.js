import * as THREE from 'three';
const host=document.getElementById('screen-model');
const plate=document.getElementById('product-plate');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderScreen, initialize;
const control=document.createElement('label');
control.className='fold-control';control.textContent='试一试折角　';
const range=document.createElement('input');
range.type='range';range.min='8';range.max='82';range.value='32';range.setAttribute('aria-label','桌屏折角');
control.append(range);plate.append(control);
function makeScreen(){
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,70);
  const tex=new THREE.TextureLoader().load('assets/journal-lychee.webp',()=>draw());
  tex.colorSpace=THREE.SRGBColorSpace;
  const wood=new THREE.MeshToonMaterial({color:0x845536});
  const brass=new THREE.MeshToonMaterial({color:0xeab565});
  const paper=new THREE.MeshToonMaterial({color:0xf6e4c6});
  scene.add(new THREE.HemisphereLight(0xfff5df,0xc7b7ae,2.1));
  const sun=new THREE.DirectionalLight(0xffeacb,2.1);sun.position.set(-4,6,8);scene.add(sun);
  const stand=new THREE.Group();scene.add(stand);
  function block(group,w,h,d,x,y,z,mat){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  const width=1.44,height=2.72,panels=[];
  for(let i=0;i<3;i++){
    const pivot=new THREE.Group();stand.add(pivot);
    const panel=new THREE.Group();pivot.add(panel);
    panel.position.x=i===0?-width/2:i===2?width/2:0;
    pivot.position.x=(i-1)*width/2;
    block(panel,width,height,.095,0,0,0,wood);
    const art=new THREE.PlaneGeometry(width-.13,height-.16);
    const uv=art.attributes.uv;
    for(let n=0;n<uv.count;n++) uv.setX(n,(i+uv.getX(n))/3);
    const face=new THREE.Mesh(art,new THREE.MeshBasicMaterial({map:tex}));face.position.z=.052;panel.add(face);
    block(panel,width-.12,.035,.034,0,-height/2+.07,.052,paper);
    for(const x of [-width/2+.10,width/2-.10])block(panel,.11,.13,.11,x,-height/2-.04,0,wood);
    if(i!==1)for(const y of [-.87,.87]){
      const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.19,12),brass);
      hinge.position.set(0,y,.055);pivot.add(hinge);
    }
    panels.push(pivot);
  }
  let job=0,opening=0;
  function draw(){
    if(plate.hidden || !host.clientWidth)return;
    const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;
    camera.position.set(1.4,1.25,Math.max(6.8,8.65/camera.aspect));camera.lookAt(0,-.03,0);camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
    const angle=THREE.MathUtils.degToRad(Number(range.value));
    let fold=angle;
    if(opening){const t=Math.min(1,(performance.now()-opening)/1450);fold=angle+(1.40-angle)*(1-t)**3;if(t<1){cancelAnimationFrame(job);job=requestAnimationFrame(draw);}else opening=0;}
    panels[0].rotation.y=fold;panels[2].rotation.y=-fold*.84;
    renderer.render(scene,camera);
  }
  renderScreen=()=>{opening=reduced.matches?0:performance.now();draw();};
  range.addEventListener('input',()=>{opening=0;draw();});
  new ResizeObserver(draw).observe(host);
  renderScreen();
}
function show(){
  if(initialize){renderScreen?.();return;}
  initialize=true;
  try{makeScreen();}catch{const img=new Image();img.src='assets/journal-lychee.webp';img.alt='荔枝桌屏的原画';img.style.width='85%';host.replaceChildren(img);control.hidden=true;}
}
window.addEventListener('show-sample',show);
if(!plate.hidden)show();

