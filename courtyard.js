import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';

const host = document.querySelector('#court-viewport');
const poster = host.querySelector('img');
const sections = [...document.querySelectorAll('.tour-stop')];
const toWorld = ([x,y,z]) => new T.Vector3(x,z,-y);
const stops = [
  {target:[6.15,4.8,1.45], from:[10,-14,11], span:16.9, poster:[50,50,1]},
  {target:[6.0,3.75,1.42], from:[5,-13,10], span:13.8, poster:[50,53,1.12]},
  {target:[10.4,2.9,1.8], from:[9,-6,4], span:7.1, poster:[70,61,1.6]},
  {target:[5.7,.7,1.42], from:[.9,-13,2.0], span:5.7, poster:[51,66,1.55], depth:4},
  {target:[4.72,4.38,1.03], from:[-7,-6,7], span:3.55, poster:[46,43,1.65], depth:1.9},
];
for(const stop of stops){
  stop.target=toWorld(stop.target);
  stop.from=toWorld(stop.from).normalize();
}

const camera = new T.OrthographicCamera(-1,1,1,-1,.1,250);
const scene = new T.Scene();
let renderer, orbit, selection = 0, shotSize = stops[0].span, shotDepth = 50, animation, scrollFrame;
const cameraDistance=55;
const verticalAxis = new T.Vector3(0,1,0);

function paint(){
  if(!renderer || !host.clientWidth || !host.clientHeight)return;
  const ratio=host.clientWidth/host.clientHeight;
  const span=shotSize/Math.min(ratio,1.35);
  camera.left=-span*ratio/2;
  camera.right=span*ratio/2;
  camera.top=span/2;
  camera.bottom=-span/2;
  camera.near=cameraDistance-shotDepth;
  camera.updateProjectionMatrix();
  renderer.render(scene,camera);
}

function aim(index, animate=true){
  selection=index;
  const stop=stops[index];
  const [x,y,scale]=stop.poster;
  poster.style.transformOrigin=x+'% '+y+'%';
  poster.style.transform='scale('+scale+')';
  if(!orbit)return;
  cancelAnimationFrame(animation);

  const start=performance.now();
  const duration=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?810:0;
  const from=orbit.target.clone();
  const direction=camera.position.clone().sub(from).normalize();
  const a=new T.Spherical().setFromVector3(direction);
  const b=new T.Spherical().setFromVector3(stop.from);
  const turn=Math.atan2(Math.sin(b.theta-a.theta),Math.cos(b.theta-a.theta));
  const offset=new T.Vector3();
  const fromSize=shotSize, fromDepth=shotDepth;
  function frame(now){
    const t=duration?Math.min(1,(now-start)/duration):1;
    const k=t*t*(3-2*t);
    shotSize=T.MathUtils.lerp(fromSize,stop.span,k);
    shotDepth=T.MathUtils.lerp(fromDepth,stop.depth??50,k);
    orbit.target.lerpVectors(from,stop.target,k);
    offset.setFromSphericalCoords(cameraDistance,T.MathUtils.lerp(a.phi,b.phi,k),a.theta+turn*k);
    camera.position.copy(orbit.target).add(offset);
    orbit.update();
    paint();
    if(t<1)animation=requestAnimationFrame(frame);
  }
  frame(start);
}

function syncSection(){
  scrollFrame=null;
  const marker=innerHeight*(innerWidth<=780?.77:.50);
  let current=0;
  sections.forEach((section,index)=>{if(section.getBoundingClientRect().top<=marker)current=index;});
  if(current!==selection)aim(current);
}
window.addEventListener('scroll',()=>{
  if(scrollFrame==null)scrollFrame=requestAnimationFrame(syncSection);
},{passive:true});
window.addEventListener('resize',syncSection);

host.addEventListener('keydown',event=>{
  if(!orbit||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
  event.preventDefault();
  if(event.key==='Home'){aim(selection);return;}
  cancelAnimationFrame(animation);
  const offset=camera.position.clone().sub(orbit.target);
  offset.applyAxisAngle(verticalAxis,event.key==='ArrowLeft'?-.13:.13);
  camera.position.copy(orbit.target).add(offset);
  orbit.update();
  paint();
});

async function build(){
  const base='assets/bell-tower/';
  const response=await fetch(base+'model.json?v=courtyard-story4');
  if(!response.ok)throw Error('Courtyard model: '+response.status);
  const {materials,batches}=await response.json();
  renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0xffffff);
  const loader=new T.TextureLoader();
  const edgeInk=new T.LineBasicMaterial({color:0x5a8bac,transparent:true,opacity:.59});
  const backdropInk=new T.LineBasicMaterial({color:0xa7c7d9,transparent:true,opacity:.70});
  const palette=new Map();
  await Promise.all(Object.entries(materials).map(async ([key,style])=>{
    const map=style.map?await loader.loadAsync(base+style.map):null;
    if(map){
      map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    }
    const color=map?new T.Color(0xffffff):new T.Color().setRGB(...style.color,T.SRGBColorSpace);
    if(key==='ContextLine')color.setHex(0xfafcfd);
    palette.set(key,new T.MeshBasicMaterial({
      map,color,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,
    }));
  }));
  for(const batch of batches){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(batch.p,3));
    geometry.setIndex(batch.i);
    if(batch.uv.length)geometry.setAttribute('uv',new T.Float32BufferAttribute(batch.uv,2));
    scene.add(new T.Mesh(geometry,palette.get(batch.material)));
    if(batch.uv.length||batch.name.includes('Visitors'))continue;
    const backdrop=batch.name.startsWith('01_');
    scene.add(new T.LineSegments(new T.EdgesGeometry(geometry,28),backdrop?backdropInk:edgeInk));
  }
  camera.position.copy(stops[0].target).addScaledVector(stops[0].from,cameraDistance);
  host.prepend(renderer.domElement);
  orbit=new OrbitControls(camera,renderer.domElement);
  orbit.enablePan=false;
  orbit.enableZoom=false;
  orbit.minPolarAngle=.18;
  orbit.maxPolarAngle=1.53;
  orbit.target.copy(stops[0].target);
  orbit.addEventListener('change',paint);
  orbit.addEventListener('start',()=>cancelAnimationFrame(animation));
  function resize(){
    if(!host.clientWidth||!host.clientHeight)return;
    renderer.setSize(host.clientWidth,host.clientHeight,false);
    paint();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  syncSection();
  aim(selection,false);
  poster.hidden=true;
  host.classList.add('live');
}
build().catch(error=>{
  console.warn('Courtyard preview:',error);
  renderer?.domElement.remove();
  renderer?.dispose();
  renderer=null;
  orbit=null;
  poster.hidden=false;
});
