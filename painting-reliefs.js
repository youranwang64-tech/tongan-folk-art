import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';

const panel=document.getElementById('original-paint');
const mount=document.getElementById('relief-model');
const original=document.getElementById('model');
const picks=[...panel.querySelectorAll('[data-artwork]')];
const viewButtons=[...panel.querySelectorAll('[data-relief-view]')];
const turn=new THREE.Vector3();
let selected='cloth', sequence=0, renderer,scene,camera,controls,sculpture,frame=0;
const viewpoints={front:[0,0,11],side:[5.3,.45,10],detail:[1.7,1.1,10]};
function paint(){if(renderer&&mount.clientWidth)renderer.render(scene,camera);}
function size(){
 if(!renderer||!mount.clientWidth||!mount.clientHeight)return;
 const aspect=mount.clientWidth/mount.clientHeight;
 const ratio=sculpture?.userData.ratio||1;
 const span=Math.max(6.55,6.55*ratio/aspect);
 camera.left=-span*aspect/2;camera.right=-camera.left;camera.top=span/2;camera.bottom=-camera.top;
 camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight,false);paint();
}
function setView(which,animated=true){
 if(!renderer)return;
 cancelAnimationFrame(frame);
 const start=camera.position.clone(),goal=new THREE.Vector3(...viewpoints[which]);
 const prior=controls.target.clone(),aim=new THREE.Vector3(0,which==='detail'?-.22:0,.32);
 const old=camera.zoom, zoom=which==='detail'?1.65:1;
 const began=performance.now();
 function sweep(now){
  const t=animated&&!matchMedia('(prefers-reduced-motion: reduce)').matches?Math.min(1,(now-began)/450):1, k=t*t*(3-2*t);
  camera.position.lerpVectors(start,goal,k);controls.target.lerpVectors(prior,aim,k);
  camera.zoom=THREE.MathUtils.lerp(old,zoom,k);camera.updateProjectionMatrix();controls.update();paint();
  if(t<1)frame=requestAnimationFrame(sweep);
 }
 sweep(began);viewButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reliefView===which)));
}
function createRenderer(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setClearColor(0xffffff);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));mount.prepend(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-4,4,3,-3,.05,60);
 camera.position.set(0,0,11);controls=new OrbitControls(camera,renderer.domElement);
 controls.enableZoom=false;controls.enablePan=false;controls.minAzimuthAngle=-.78;controls.maxAzimuthAngle=.78;
 controls.minPolarAngle=1.13;controls.maxPolarAngle=1.96;controls.rotateSpeed=.7;
 controls.addEventListener('change',paint);controls.addEventListener('start',()=>cancelAnimationFrame(frame));
 scene.add(new THREE.HemisphereLight(0xffffff,0xf5eee3,2.5));
 const light=new THREE.DirectionalLight(0xffffff,.82);light.position.set(-3,5,7);scene.add(light);
 new ResizeObserver(size).observe(mount);
}
function clearMesh(){
 if(!sculpture)return;
 scene.remove(sculpture);sculpture.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});sculpture=null;
}
async function show(id){
 selected=id;const request=++sequence;cancelAnimationFrame(frame);
 const isCloth=id==='cloth';
 original.hidden=!isCloth;mount.hidden=isCloth;
 panel.querySelector('.weave-views').hidden=!isCloth;panel.querySelector('.relief-views').hidden=isCloth;
 picks.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.artwork===id)));
 if(isCloth){if(panel.open)await import('./weave.js?v=gallery2');return;}
 const pick=picks.find(b=>b.dataset.artwork===id);
 const src='assets/'+pick.dataset.file;
 const fallback=mount.querySelector('img');fallback.src=src;fallback.alt=pick.textContent;fallback.hidden=false;
 try{
  if(!renderer)createRenderer();
  renderer.domElement.hidden=true;
  const [texture,depth]=await Promise.all([new THREE.TextureLoader().loadAsync(src),new THREE.ImageLoader().loadAsync('assets/depth-'+id+'.png')]);
  if(request!==sequence){texture.dispose();return;}
  const pixels=document.createElement('canvas');pixels.width=depth.width;pixels.height=depth.height;
  const ctx=pixels.getContext('2d');ctx.drawImage(depth,0,0);const values=ctx.getImageData(0,0,depth.width,depth.height).data;
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const ratio=depth.width/depth.height;
  const width=6*ratio,height=6,columns=Math.min(380,depth.width-1),rows=Math.round(columns/ratio);
  const g=new THREE.PlaneGeometry(width,height,columns,rows);
  const points=g.attributes.position;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
   const pixel=Math.round(j/rows*(depth.height-1))*depth.width+Math.round(i/columns*(depth.width-1));
   points.setZ(j*(columns+1)+i,values[pixel*4]/255*.98);
  }
  g.computeVertexNormals();clearMesh();sculpture=new THREE.Group();sculpture.userData.ratio=ratio;
  sculpture.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:texture,roughness:.97,side:THREE.DoubleSide})));
  // Close the pigment surface at its perimeter so the angled views reveal a solid paper edge.
  const perimeter=[];
  for(let x=0;x<=columns;x++)perimeter.push(x);
  for(let y=1;y<=rows;y++)perimeter.push(y*(columns+1)+columns);
  for(let x=columns-1;x>=0;x--)perimeter.push(rows*(columns+1)+x);
  for(let y=rows-1;y>0;y--)perimeter.push(y*(columns+1));
  const wall=[];perimeter.forEach((a,i)=>{const b=perimeter[(i+1)%perimeter.length];const topA=[points.getX(a),points.getY(a),points.getZ(a)],topB=[points.getX(b),points.getY(b),points.getZ(b)];const baseA=[topA[0],topA[1],-.035],baseB=[topB[0],topB[1],-.035];wall.push(...topA,...topB,...baseB,...topA,...baseB,...baseA);});
  const border=new THREE.BufferGeometry();border.setAttribute('position',new THREE.Float32BufferAttribute(wall,3));border.computeVertexNormals();
  sculpture.add(new THREE.Mesh(border,new THREE.MeshStandardMaterial({color:0xc4b29a,side:THREE.DoubleSide})));
  scene.add(sculpture);fallback.hidden=true;renderer.domElement.hidden=false;size();setView('front',false);
 }catch(error){if(request===sequence){fallback.hidden=false;if(renderer)renderer.domElement.hidden=true;}console.error(error);}
}
viewButtons.forEach(b=>b.onclick=()=>setView(b.dataset.reliefView));
picks.forEach(b=>b.onclick=()=>show(b.dataset.artwork));
mount.addEventListener('keydown',e=>{if(!controls)return;if(e.key==='Home'){e.preventDefault();setView('front');}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cancelAnimationFrame(frame);turn.copy(camera.position).sub(controls.target);turn.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-.12:.12);camera.position.copy(controls.target).add(turn);controls.update();paint();}});
panel.addEventListener('toggle',()=>{if(panel.open){if(selected==='cloth')show(selected);else size();}else cancelAnimationFrame(frame);});
document.addEventListener('view-relief',event=>{panel.open=true;show(event.detail);panel.scrollIntoView({block:'start'});});

