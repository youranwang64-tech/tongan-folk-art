import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const mount=document.querySelector('#model');
const loading=document.querySelector('#room-status');
const buttons=[...document.querySelectorAll('[data-camera]')];
async function build(){
 const [layout,bytes,texture]=await Promise.all([
   fetch('./assets/weave-parts.json').then(r=>r.json()),
   fetch('./assets/weave-labels.bin').then(r=>r.arrayBuffer()),
   new THREE.TextureLoader().loadAsync('./assets/painting-texture.png')
 ]);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.setClearColor(0x16181b,0);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 mount.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,6,-6,.05,80);
 camera.position.set(0,0,19);
 const orbit=new OrbitControls(camera,renderer.domElement);
 orbit.target.set(0,0,1.1);
 orbit.enablePan=false;orbit.enableZoom=false;orbit.rotateSpeed=.70;
 orbit.minAzimuthAngle=-.78;orbit.maxAzimuthAngle= .78;orbit.minPolarAngle=1.11;orbit.maxPolarAngle=1.93;
 orbit.update();
 const {width,height,cols,rows,step,parts}=layout;
 const labels=new Uint8Array(bytes);
 const front=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 const cut=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
 const painted=[],paintUV=[],edges=[],edgeColors=[];
 const limits=Array.from({length:parts.length},()=>new Map());
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const k=labels[j*cols+i];if(!k)continue;
   const bounds=limits[k].get(j)||[i,i];bounds[0]=Math.min(bounds[0],i);bounds[1]=Math.max(bounds[1],i);limits[k].set(j,bounds);
 }
 const pigment={cloth:0x547873,figure:0xa44963,vat:0x305b60,rod:0xc47537};
 function layerDepth(part,x,y,j,bounds){
   const d=part.d;
   if(part.type==='figure'||part.type==='vat'){
     const [a,b]=bounds;
     const radial=(x/step-(a+b+1)/2)/Math.max(1,(b-a+1)/2);
     return d+Math.sqrt(Math.max(0,1-radial*radial))*(part.type==='vat'?.27:.16);
   }
   if(part.type==='rod')return d+.018*Math.sin(y*.2);
   return d+.053*Math.sin(x*.039+part.d)+.036*Math.cos(y*.022);
 }
 const indices=[0,1,2,0,2,3];
 function world(x,y,z){return [(x-width/2)/100,(height/2-y)/100,z];}
 function side(a,b,c,d,color){
   const points=[a,b,c,d];
   for(const i of indices){edges.push(...points[i]);edgeColors.push(color.r,color.g,color.b);}
 }
 const hues=parts.map(p=>new THREE.Color(pigment[p.type]||0x24433a));
 const groups=[];
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const k=labels[j*cols+i];if(!k)continue;
   const p=parts[k],bounds=limits[k].get(j);
   const points=[[i*step,j*step],[(i+1)*step,j*step],[(i+1)*step,(j+1)*step],[i*step,(j+1)*step]];
   const corners=points.map(([x,y])=>world(x,y,layerDepth(p,x,y,j,bounds)));
   const back=p.d-(p.type==='vat'?.25:p.type==='figure'?.16:p.type==='rod'?.035:.025);
   for(const n of indices){painted.push(...corners[n]);paintUV.push(points[n][0]/width,1-points[n][1]/height);}
   groups.push(k,k);
   const neighbors=[j>0?labels[(j-1)*cols+i]:0,i<cols-1?labels[j*cols+i+1]:0,j<rows-1?labels[(j+1)*cols+i]:0,i>0?labels[j*cols+i-1]:0];
   for(let n=0;n<4;n++)if(neighbors[n]!==k){
     const a=corners[n],b=corners[(n+1)%4];side(a,b,[b[0],b[1],back],[a[0],a[1],back],hues[k]);
   }
   if(p.type==='figure'||p.type==='vat'){
     const c=corners.map(v=>[v[0],v[1],back]);side(c[3],c[2],c[1],c[0],hues[k]);
   }
 }
 function geometry(vertices,attribute,data,dim,material){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
   g.setAttribute(attribute,new THREE.Float32BufferAttribute(data,dim));g.computeBoundingSphere();
   const m=new THREE.Mesh(g,material);scene.add(m);return m;
 }
 const art=geometry(painted,'uv',paintUV,2,front);
 geometry(edges,'color',edgeColors,3,cut);
 function block(x,y,z,w,h,d,col){
   const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color:col}));
   m.position.set(x,y,z);scene.add(m);
 }
 block(0,0,-.19,8.31,11.46,.32,0x182820);
 // Four mitred rails have real sloping front faces and their own grain from the supplied frame.
 const frameVerts=[],frameUV=[];
 function rail(points){for(const i of indices){const [x,y,z]=points[i];frameVerts.push(...world(x,y,z));frameUV.push(x/width,1-y/height);}}
 const outer=[[8,4],[842,4],[842,1163],[8,1163]],inner=[[28,27],[823,32],[814,1144],[31,1142]];
 for(let n=0;n<4;n++){
   const a=outer[n],b=outer[(n+1)%4],c=inner[(n+1)%4],d=inner[n];
   rail([[...a,-.10],[...b,-.10],[...c,.06],[...d,.06]]);
   rail([[...a,-.37],[...b,-.37],[...b,-.10],[...a,-.10]]);
 }
 geometry(frameVerts,'uv',frameUV,2,front);
 const construction=await fetch('./assets/weave-construction.json').then(r=>r.json());
 const reverse=await new THREE.TextureLoader().loadAsync('./assets/cloth-reverses.webp');
 reverse.colorSpace=THREE.SRGBColorSpace;
 const reversePaint=new THREE.MeshBasicMaterial({map:reverse,side:THREE.DoubleSide});
 const backVerts=[],backUV=[];
 // Full backing cloths bridge holes occluded by figures, other cloths, and poles.
 construction.panels.forEach((quad,id)=>{
   const minX=Math.min(...quad.map(p=>p[0])),maxX=Math.max(...quad.map(p=>p[0]));
   const minY=Math.min(...quad.map(p=>p[1])),maxY=Math.max(...quad.map(p=>p[1]));
   const base=parts[id+1].d;
   function vertex(i,j){
     const u=i/18,v=j/12,k=[(1-u)*(1-v),u*(1-v),u*v,(1-u)*v];
     const x=quad.reduce((s,p,n)=>s+p[0]*k[n],0),y=quad.reduce((s,p,n)=>s+p[1]*k[n],0);
     const label=labels[Math.min(rows-1,Math.floor(y/step))*cols+Math.min(cols-1,Math.floor(x/step))];
     const z=Math.min(base-.13,label?parts[label].d-.16:-.015);
     backVerts.push(...world(x,y,z));backUV.push(((id%8)+(x-minX)/(maxX-minX))/8,1-(Math.floor(id/8)+(y-minY)/(maxY-minY))/5);
   }
   for(let j=0;j<12;j++)for(let i=0;i<18;i++)for(const [a,b] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]])vertex(i+a,j+b);
 });
 geometry(backVerts,'uv',backUV,2,reversePaint);
 scene.add(new THREE.HemisphereLight(0xfff7ed,0xcfccc6,2.1)); const sun=new THREE.DirectionalLight(0xfff3d8,1.2);sun.position.set(-4,6,8);scene.add(sun);
 const bamboo=new THREE.MeshStandardMaterial({color:0xd58b40,roughness:.72});const nodeMaterial=new THREE.MeshStandardMaterial({color:0x94703c,roughness:.91}); const joint=new THREE.CylinderGeometry(.023,.024,.028,12);
 construction.poles.forEach(([x,y,ex,ey])=>{
   const z=.72+(y+ey)/800-.09;
   const start=new THREE.Vector3(...world(x,y,z)),end=new THREE.Vector3(...world(ex,ey,z));
   const axis=end.clone().sub(start);
   const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,axis.length(),10),bamboo);
   stem.position.copy(start).lerp(end,.5);stem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());scene.add(stem);const count=Math.floor(start.distanceTo(end)/.55);for(let n=1;n<=count;n++){const ring=new THREE.Mesh(joint,nodeMaterial);ring.position.copy(start).lerp(end,n/(count+1));ring.quaternion.copy(stem.quaternion);scene.add(ring);}
 });
 // Turn each dye vat on a lathe behind its decorated face.
 const ceramic=new THREE.MeshStandardMaterial({color:0x365d62,roughness:.39});
 construction.vats.forEach((points,i)=>{
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
   const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);
   const centerX=(Math.max(...xs)+Math.min(...xs))/2;
   const radius=width/209,h=height/100;
   const profile=[[.10,0],[.65,.09],[.83,.29],[.92,.75],[1,.89],[.99,.96],[.88,1],[.81,.95],[.79,.75]].map(([r,t])=>new THREE.Vector2(r*radius,t*h));
   const vessel=new THREE.Mesh(new THREE.LatheGeometry(profile,64),ceramic);
   vessel.position.set(...world(centerX,Math.max(...ys),[.97,1.60,1.76,3.08][i]-.92*radius));scene.add(vessel);
 });

 loading.hidden=true;
 let motion=null,job=0;
 function draw(){
   cancelAnimationFrame(job);
   if(motion){
     const t=Math.min(1,(performance.now()-motion.start)/motion.duration),a=t*t*(3-2*t);
     camera.position.lerpVectors(motion.from,motion.to,a);orbit.target.lerpVectors(motion.oldTarget,motion.target,a);
     camera.zoom=THREE.MathUtils.lerp(motion.oldZoom,motion.zoom,a);camera.updateProjectionMatrix();orbit.update();
     if(t>=1)motion=null;
   }
   renderer.render(scene,camera);if(motion)job=requestAnimationFrame(draw);
 }
 const views={room:[[0,0,19],[0,0,1.1],1],side:[[6.5,.65,18],[0,0,1.1],1],table:[[1.2,-.5,17],[-.65,-.35,1.7],1.95]};
 function setView(name){const [pos,tar,zoom]=views[name];motion={start:performance.now(),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:650,from:camera.position.clone(),to:new THREE.Vector3(...pos),oldTarget:orbit.target.clone(),target:new THREE.Vector3(...tar),oldZoom:camera.zoom,zoom};buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===name)));draw();}
 buttons.forEach(b=>b.onclick=()=>setView(b.dataset.camera));
 orbit.addEventListener('start',()=>{motion=null});
 orbit.addEventListener('change',()=>{if(!motion)renderer.render(scene,camera)});
 mount.tabIndex=0;mount.onkeydown=e=>{if(e.key==='Home'){e.preventDefault();setView('room')}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();motion=null;const off=camera.position.clone().sub(orbit.target).applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?-.1:.1);camera.position.copy(orbit.target).add(off);orbit.update()}};
 new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;const frustum=Math.max(12.25,8.95*h/w);camera.top=frustum/2;camera.bottom=-camera.top;camera.right=frustum*w/h/2;camera.left=-camera.right;camera.updateProjectionMatrix();renderer.setSize(w,h);draw()}).observe(mount);
}
build().catch(error=>{loading.textContent='三维画作加载失败，请刷新页面重试。';console.error(error)});

