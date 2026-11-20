for(const print of document.querySelectorAll('.rub-print')){
 const dot=print.querySelector('b');
 function point(e){const rect=print.getBoundingClientRect();print.style.setProperty('--x',(e.clientX-rect.left)+'px');print.style.setProperty('--y',(e.clientY-rect.top)+'px');}
 print.addEventListener('pointerenter',e=>{point(e);print.classList.add('explore');});
 print.addEventListener('pointermove',point);
 print.addEventListener('pointerleave',()=>print.classList.remove('explore'));
 print.onclick=()=>{const open=print.getAttribute('aria-pressed')!=='true';print.setAttribute('aria-pressed',String(open));dot.textContent=open?'−':'＋';};
}


const guidePlate=document.querySelector('.guide-plate');
if(guidePlate){
 const art=new Image();
 art.onload=()=>{
  const canvas=document.createElement('canvas');canvas.width=art.naturalWidth;canvas.height=art.naturalHeight;
  const ctx=canvas.getContext('2d');ctx.drawImage(art,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  const source=pixels.data.slice(), w=canvas.width;
  function tone(i){return (source[i]*.28+source[i+1]*.52+source[i+2]*.20)/255;}
  let seed=31;for(let y=0;y<canvas.height;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,t=tone(i),edge=t-tone(x>1&&y>1?i-4*w-4:i);
   seed=(Math.imul(1664525,seed)+1013904223)>>>0;const fibre=seed/4294967296-.5;
   const hatch=Math.sin((x*.82+y*.33)*2.6)*.035;
   const value=Math.max(0,Math.min(1,.09+t*.86+edge*.75+fibre*.13+hatch));
   for(let k=0;k<3;k++){const ink=[42,67,91][k];pixels.data[i+k]=ink+(247-ink)*value;}
  }ctx.putImageData(pixels,0,0);guidePlate.prepend(canvas);
 };
 art.src='assets/journal-sea.webp';
 guidePlate.addEventListener('pointermove',e=>{const box=guidePlate.getBoundingClientRect();guidePlate.style.setProperty('--x',(e.clientX-box.left)+'px');guidePlate.style.setProperty('--y',(e.clientY-box.top)+'px');});
 guidePlate.onclick=()=>guidePlate.setAttribute('aria-pressed',String(guidePlate.getAttribute('aria-pressed')!=='true'));
}
