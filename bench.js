const bench=document.getElementById('concept');
const scenes=[...bench.querySelectorAll('.bench-scene')];
const stops=[...bench.querySelectorAll('[data-stop]')];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const chapters=[
 ['画家　×　设计师','给荔枝画','上一层红。','画家带来采果的故事，设计师沿着树冠、果筐和人物读画。试着让颜色从左到右经过画纸，看同一抹红如何串起这三个动作。','↔　拖动画上的分界线，显出套色'],
 ['设计师　×　手艺人','一张采果图，','折成三扇屏。','在老城的共享工作台上，设计师安排三扇的分界，手艺人试做木框、支脚和铰链。试着合拢两翼，找一个既能站稳、又能看清人物的角度。','↔　拖动折角，检验三扇之间的构图'],
 ['共享小店　×　线上预订','做好的一件，','怎样出门？','样件先在工坊小店和市集亮相，顾客可以当面试开合。网上展示作品、接受预订，再按需求做一小批。换一条路径，看看同一件桌屏如何交到顾客手里。','↓　选择交付方式，查看样件流转单'],
 ['顾客　×　共享工作台','把看画的人，','请回画桌。','一次成交覆盖材料、制作者报酬和工坊佣金。工位费、设备使用费一起支持租金与维护。顾客也能提出修改意见，画家和设计师据此再做一张试样。','↓　替下一版选构图，观察留样变化']
];
let current=-1, frame=0;
function display(index){
 if(index===current)return;
 current=index;
 const [role,line,accent,body,hint]=chapters[index];
 document.getElementById('bench-role').textContent=role;
 const title=document.getElementById('bench-title'),em=document.createElement('em');
 em.textContent=accent;title.replaceChildren(line,document.createElement('br'),em);
 document.getElementById('bench-body').textContent=body;
 document.getElementById('bench-hint').textContent=hint;
 scenes.forEach((scene,i)=>{scene.hidden=i!==index;scene.classList.toggle('arriving',i===index);});
 stops.forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
 
 if(index===1)window.dispatchEvent(new Event('show-sample'));
}
function travel(){return bench.offsetHeight-bench.firstElementChild.offsetHeight;}
function follow(){
 frame=0;
 const distance=travel();if(distance<1)return;
 const t=Math.max(0,Math.min(1,-bench.getBoundingClientRect().top/distance));
 display(Math.min(3,Math.floor(t*4)));
 if(!reducedMotion.matches && current===0 && !touched)setInk(Math.round(44+t*180));
}
function schedule(){if(!frame)frame=requestAnimationFrame(follow);}
stops.forEach((button,i)=>button.onclick=()=>{
 if(travel()<1){display(i);return;}
 window.scrollTo({top:window.scrollY+bench.getBoundingClientRect().top+travel()*(i+.24)/4,behavior:'instant'});
 display(i);
});
const field=bench.querySelector('.print-field'),slider=field.querySelector('input');
let touched=false;
function setInk(value){slider.value=value;field.style.setProperty('--ink-pos',value+'%');}
slider.addEventListener('input',()=>{touched=true;setInk(slider.value);});
const channels=[...bench.querySelectorAll('[data-channel]')];
function dispatch(index){
 channels.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
 document.getElementById('delivery').textContent=index?'共享网店登记 · 打包寄送':'老城工坊验样 · 到店自取';
 document.getElementById('channel-stamp').textContent=index?'寄送样':'店取样';
}
channels.forEach((b,i)=>b.onclick=()=>dispatch(i));
const revisions=[...bench.querySelectorAll('[data-revise]')];
function revise(index){
 revisions.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
 scenes[3].classList.toggle('revised',!!index);
 document.getElementById('proof-ver').textContent=index?'第二版 · 局部':'第一版 · 全景';
 document.getElementById('proof-label').textContent=index?'把采果人的动作带到前景':'保留树上、树下与果筐的关系';
}
revisions.forEach((b,i)=>b.onclick=()=>revise(i));
display(0);dispatch(0);revise(0);follow();
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);

