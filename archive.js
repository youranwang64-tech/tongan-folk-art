const works='https://xm.wenming.cn/jdxw/202002/t20200227_6316107.htm';
const artist='https://www2.xinhuanet.com/shuhua/20240710/9da94b053e914bcc8d46c2a043bf3096/c.html';
const records=[
 ['作品','陈巡 · 2020','抗疫情，送温暖','work-chen-xun.jpg','在同安区文化馆组织的主题创作中，陈巡把社区中送去关怀的行动带进画面。','厦门文化馆 / 厦门文明网',works],
 ['作品','何文亮 · 2020','坚定信心 科学防治','work-he-wenliang.jpg','与陈巡的作品同属这组同安农民画。两位作者用各自的画面语言，记录社区共同经历的时刻。','厦门文化馆 / 厦门文明网',works],
 ['实践','画家工作现场 · 2024','陈建纯的画桌','real-tongan-1.jpg','从踩车戽水到采茶摘果，陈建纯把熟悉的农事动作带进画面。EM 的街巷观察课也从记录一个日常动作开始。','新华社 / 同安区融媒体中心',artist],
 ['作品','作品陈列 · 2024','展墙上的乡土生活','real-tongan-0.jpg','这两幅画出现在陈建纯创作专题的影像中。可以近看水边与田间的人物，以及画家如何用色块安排空间。','新华社 / 同安区融媒体中心',artist],
 ['实践','同安区文化馆 · 2026','展览也是一间课堂','real-education.jpg','同安非遗薪火传承教育示范基地成果展展出了儿童创作的农民画彩扇，并设置互动创作区。EM 借鉴了观展与动手共用一个空间的做法。','厦门日报 / 厦门网','https://news.xmnn.cn/xmxw/202601/t20260126_390647.html']
];
records.push(
 ['作品','陈巡','大岞渔女','journal-sea.webp','从前景船头的身影看起，再顺着桨、船身和波浪看向远处。画家用几道相似的弧线，把分散的船连在同一片海里。','查看原图','assets/journal-sea.webp'],
 ['作品','','船上的喜事','journal-wedding.webp','先找船上的礼物，再看岸边密密站着的人。读这幅画时，试着沿着相迎的人群，为这场婚礼排出到来、相会与庆祝的顺序。','查看原图','assets/journal-wedding.webp'],
 ['作品','杨奕护','荔枝红了甜在心里','journal-lychee.webp','树冠、果筐和人群之间反复出现荔枝红。把三处各遮住一处，再看看眼睛会怎样跟着采摘、装筐与搬运走。这是首页折屏试样的图像来源。','查看原图','assets/journal-lychee.webp'],
 ['作品','','两岸的渔船','journal-boats.webp','在彼此交错的船、鱼与水纹之间找一条观看路线。把一段画面单独裁出来之后，再对照整幅图，看相邻的船怎样接续这个故事。','查看原图','assets/journal-boats.webp']
);
const wall=document.querySelector('#archive-wall');
const dialog=document.querySelector('#photo-view');
dialog.classList.add('gallery-dialog');
function showDetail(record){
 const [kind,credit,title,file,story,source,link]=record;
 dialog.innerHTML='<button id="photo-close">关闭 ×</button><div class="detail-grid"><img><div><small></small><h3></h3><p></p><a target="_blank" rel="noopener"></a></div></div>';
 const image=dialog.querySelector('img');image.src='assets/'+file;image.alt=title;
 dialog.querySelector('small').textContent=[kind,credit].filter(Boolean).join('　／　');
 dialog.querySelector('h3').textContent=title;
 dialog.querySelector('p').textContent=story;
 const anchor=dialog.querySelector('a');
 if(link){anchor.href=link;anchor.textContent=source+' ↗'}else anchor.remove();
 const artwork=document.querySelector('.art-picker [data-file="'+file+'"]');
 if(artwork){
  const view=document.createElement('button');view.className='show-relief';view.textContent='观看立体画';
  view.onclick=()=>{dialog.close();document.dispatchEvent(new CustomEvent('view-relief',{detail:artwork.dataset.artwork}));};
  dialog.querySelector('.detail-grid>div').append(view);
 }
 dialog.querySelector('#photo-close').onclick=()=>dialog.close();dialog.showModal();
}
function drawWall(kind){
 wall.replaceChildren();
 for(const record of records.filter(r=>kind==='全部'||r[0]===kind)){
  const b=document.createElement('button');b.className='archive-item';
  const img=document.createElement('img');img.src='assets/'+record[3];img.alt=record[2];img.loading='lazy';
  const small=document.createElement('small');small.textContent=record[1];
  const title=document.createElement('strong');title.textContent=record[2];
  b.append(img,title);b.onclick=()=>showDetail(record);wall.append(b);
 }
}
drawWall('全部');
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('[data-kind]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));drawWall(b.dataset.kind);
});

