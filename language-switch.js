(() => {
 const picker = document.querySelector('[data-language]');
 const languages = ['zh-CN','zh-HK','en','ja'];
 const dictionary = window.studioLanguages;
 const originalText = new WeakMap(), originalAttrs = new WeakMap();
 let language = 'zh-CN';
 const url = new URL(location.href);
 try { language = url.searchParams.get('lang') || localStorage.getItem('tongan-language') || language; } catch {}
 if (!languages.includes(language)) language='zh-CN';
 function translate(input) {
  const key=input.trim(), index=languages.indexOf(language)-1;
  if (index<0 || !key) return input;
  if (dictionary[key]) return input.replace(key,dictionary[key][index]);
  if (key === 'Journal · 07') return ['畫冊 · 07','Folio · 07','画集 · 07'][index];
  if (key.startsWith('选择颜色 #')) return dictionary['选择颜色'][index]+key.slice(4);
  const saved=key.match(/^我的兴趣清单（(\d+)）：(.*?) · 仅保存在此浏览器，不构成报名。$/);
  if (saved) return dictionary['我的兴趣清单'][index]+' ('+saved[1]+') · '+saved[2].split('、').map(translate).join(' / ')+' · '+dictionary['仅保存在此浏览器，不构成报名。'][index];
  for (const sep of ['　／　',' / ',' ↗']) if(key.includes(sep)) return key.split(sep).map(translate).join(sep);
  return input;
 }
 function updateText(node){
  const current=node.nodeValue;
  if(!current?.trim()||node.parentElement?.closest('script,style,option,select,textarea,svg'))return;
  let entry=originalText.get(node);
  if(!entry||current!==entry.display)entry={source:current};
  entry.display=translate(entry.source);
  if(current!==entry.display)node.nodeValue=entry.display;
  originalText.set(node,entry);
 }
 const attrs=['alt','aria-label','title'];
 function updateElement(el) {
  if(el.matches('select,option,script,style'))return;
  let entries=originalAttrs.get(el)||{};
  for(const name of attrs){
   if(!el.hasAttribute(name))continue;
   const value=el.getAttribute(name);let entry=entries[name];
   if(!entry||value!==entry.display)entry={source:value};
   entry.display=translate(entry.source);
   if(value!==entry.display)el.setAttribute(name,entry.display);
   entries[name]=entry;
  }
  originalAttrs.set(el,entries);
 }
 function visit(root) {
  if(root.nodeType===3){updateText(root);return;}
  if(root.nodeType!==1)return;
  updateElement(root);
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walk.nextNode())updateText(walk.currentNode);
  root.querySelectorAll('[alt],[aria-label],[title]').forEach(updateElement);
 }
 const observer=new MutationObserver(records=>{
  observer.disconnect();
  for(const record of records){
   if(record.type==='attributes')updateElement(record.target);
   else if(record.type==='characterData')updateText(record.target);
   else for(const node of record.addedNodes)visit(node);
  }
  observe();
 });
 function observe(){ observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attrs}); }
 function apply(){
  observer.disconnect();
  document.documentElement.lang=language;picker.value=language;
  picker.setAttribute('aria-label',{'zh-CN':'语言','zh-HK':'語言',en:'Language',ja:'言語'}[language]);
  visit(document.documentElement);observe();
 }
 picker.addEventListener('change',()=>{
  language=picker.value;
  try{localStorage.setItem('tongan-language',language);}catch{}
  const current=new URL(location.href);current.searchParams.set('lang',language);
  history.replaceState(history.state,'',current);apply();
 });
 apply();
})();
