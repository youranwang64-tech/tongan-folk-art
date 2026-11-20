import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const host=document.querySelector('#court-viewport'),picture=host.querySelector('img');
const stops=[[[5,4.8,1.05],.59],[[5.3,3.75,1.25],1.08],[[8.45,2.9,1.48],2.25],[[4.4,1.28,1.12],2.72],[[6.2,4.75,1.25],3.22]];
const vec=([x,y,z])=>new T.Vector3(x,z,-y);
let renderer,camera,orbit,scene,job,selected=0,ready=false;
const surroundings=new T.Group();
const paths=[[6,-14,20],[12,-15,12],[14,-6,5],[3,12,4],[2,-13,4]].map(n=>vec(n).normalize());const direction=paths[0];
const foreground=new T.Plane();
const people=[];
const viewDepth=[11,6.3,3.6,1.9,1.85];
let cutDepth=viewDepth[0];
function paint(){
 if(!renderer||!orbit)return;
 foreground.normal.copy(orbit.target).sub(camera.position).normalize();
 foreground.constant=cutDepth-foreground.normal.dot(orbit.target);
 for(const person of people){const bounds=person.geometry.boundingSphere;person.visible=foreground.distanceToPoint(bounds.center)>=bounds.radius;}
 renderer.render(scene,camera);
}
function aim(i,animate=true){
 selected=i;

 if(!ready){picture.style.transformOrigin=['50% 50%','50% 50%','75% 60%','38% 52%','58% 42%'][i];picture.style.transform='scale('+[1,1,1.55,1.5,1.65][i]+')';return;}
 
 cancelAnimationFrame(job);
 const a=orbit.target.clone(),b=vec(stops[i][0]),from=camera.position.clone(),to=b.clone().addScaledVector(paths[i],320);
 const previousDepth=cutDepth,zoom=camera.zoom,start=performance.now(),duration=animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches?700:0;
 function frame(now){const t=duration?Math.min(1,(now-start)/duration):1,k=t*t*(3-2*t);cutDepth=previousDepth+(viewDepth[i]-previousDepth)*k;orbit.target.lerpVectors(a,b,k);camera.position.copy(from.clone().sub(a).normalize().lerp(paths[i],k).normalize().multiplyScalar(320).add(orbit.target));camera.zoom=zoom+(stops[i][1]-zoom)*k;camera.updateProjectionMatrix();orbit.update();paint();if(t<1)job=requestAnimationFrame(frame);}
 frame(start);
}
function activate(){if(ready){picture.hidden=true;host.classList.add('live');}}
const sections=[...document.querySelectorAll('.tour-stop')];
function moveTo(i){host.dataset.visited='1';activate();aim(i);}
let pending=false;
function scrollStop(){pending=false;const cursor=innerHeight*(innerWidth<=780?.78:.50);let i=0;sections.forEach((section,j)=>{if(section.getBoundingClientRect().top<=cursor)i=j;});if(i!==selected)moveTo(i);}
window.addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(scrollStop);}},{passive:true});
window.addEventListener('resize',scrollStop);
host.addEventListener('pointerdown',()=>{host.dataset.visited='1';activate();});
host.addEventListener('keydown',e=>{if(!ready)return; if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();activate();if(e.key==='Home'){aim(0);return;}cancelAnimationFrame(job);const off=camera.position.clone().sub(orbit.target).applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft'?-.13:.13);camera.position.copy(orbit.target).add(off);orbit.update();paint();}});
async function build(){
 const response=await fetch('assets/courtyard-mesh.json');if(!response.ok)throw Error(response.status);
 const data=await response.json();renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xffffff);renderer.clippingPlanes=[foreground];
 scene=new T.Scene();scene.add(surroundings);camera=new T.OrthographicCamera(-8,8,6,-6,.1,1000);
 camera.position.copy(vec(stops[0][0])).addScaledVector(direction,320);
 host.prepend(renderer.domElement);orbit=new OrbitControls(camera,renderer.domElement);orbit.enablePan=false;orbit.enableZoom=false;orbit.minPolarAngle=.18;orbit.maxPolarAngle=1.44;orbit.addEventListener('change',paint);orbit.addEventListener('start',()=>cancelAnimationFrame(job));
 const load=new T.TextureLoader(),maps=new Map(),mats=new Map(),lines=new Map();
 function material(ob){
  const id=ob.label||ob.m;if(mats.has(id))return mats.get(id);
  let map=null;
  if(ob.label){
   if(id.startsWith('print/'))map=load.load('assets/court-'+id.split('/').slice(1).join('-')+'.webp',paint);
   else{const c=document.createElement('canvas');c.width=768;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,768,160);ctx.fillStyle='#286995';ctx.font='bold 98px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(({'赶集':'作品选读','晒谷':'蓝版试印','鱼汛':'画面细读'})[id]||id,384,119,720);map=new T.CanvasTexture(c);}
   map.colorSpace=T.SRGBColorSpace;
  }
  const mat=new T.MeshBasicMaterial({color:ob.m==='Canvas'?0x416281:ob.m==='People'?0x799dbd:0xffffff,map,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});mats.set(id,mat);return mat;
 }
 for(const ob of data){
  if(ob.m==='ContextLine'||ob.m==='GroundLine')continue;const pos=ob.v.map(vec),g=new T.BufferGeometry();g.setFromPoints(pos);
  const tris=[],edges=new Set(),coords=[];
  function edge(a,b){const key=a<b?a+','+b:b+','+a;if(edges.has(key))return;edges.add(key);coords.push(pos[a],pos[b]);}
  for(const face of ob.f){for(let i=1;i+1<face.length;i++)tris.push(face[0],face[i],face[i+1]);if(!ob.border&&ob.m!=='People')for(let i=0;i<face.length;i++)edge(face[i],face[(i+1)%face.length]);}
  for(const line of ob.l||[])for(let j=1;j<line.length;j++)edge(line[j-1],line[j]);
  if(tris.length){g.setIndex(tris);if(ob.label)g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));const mesh=new T.Mesh(g,material(ob));scene.add(mesh);if(ob.m==="People"){g.computeBoundingSphere();people.push(mesh);}}
  if(coords.length){const faint=['ContextLine','GroundLine'].includes(ob.m),color=faint?0xc7deea:0x6d8da2;if(!lines.has(color))lines.set(color,new T.LineBasicMaterial({color}));scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(coords),lines.get(color)));}
 }
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const span=Math.max(8.7,14.2*h/w);camera.top=span/2;camera.bottom=-span/2;camera.right=span*w/h/2;camera.left=-camera.right;camera.updateProjectionMatrix();renderer.setSize(w,h,false);paint();}
 
 // Source model units are aligned with the long gallery. The fair occupies the open
 // space in front of the middle entrance; nearby building surfaces stay in place.
 const siteData=await fetch('assets/site-surround.json').then(response=>response.json());
 const batches=[[],[]];const strokes=[[],[]];
 for(const [type,vertices,faces] of siteData){
  const points=vertices.map(([x,y,z])=>vec([x-13.5,y+7.64,z-.02]));
  const local=new T.BufferGeometry().setFromPoints(points);
  const ix=[];for(const f of faces)for(let j=1;j<f.length-1;j++){ix.push(f[0],f[j],f[j+1]);for(const k of [f[0],f[j],f[j+1]]){const p=points[k];batches[type].push(p.x,p.y,p.z);}}
  local.setIndex(ix);const edges=new T.EdgesGeometry(local,28);const arr=edges.attributes.position.array;for(const val of arr)strokes[type].push(val);edges.dispose();local.dispose();
 }
 for(let type=0;type<2;type++){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(batches[type],3));
  const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color:type?0xfdfefe:0xffffff,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));surroundings.add(mesh);
  const wire=new T.BufferGeometry();wire.setAttribute('position',new T.Float32BufferAttribute(strokes[type],3));surroundings.add(new T.LineSegments(wire,new T.LineBasicMaterial({color:type?0xc2cfd8:0xe1e8ec})));
 }
 new ResizeObserver(resize).observe(host);ready=true;resize();aim(selected,false);activate();scrollStop();
}
build().catch(()=>{picture.hidden=false;host.classList.remove('live');});
