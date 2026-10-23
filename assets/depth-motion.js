(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
  let card=null,frame=0,x=0,y=0,paused=false;
  try{paused=localStorage.getItem('journal-motion-paused')==='true';}catch(_){}
  const toggle=document.createElement('button');toggle.type='button';toggle.className='motion-toggle';
  function state(){document.documentElement.classList.toggle('motion-paused',paused||document.hidden);toggle.textContent=paused?'▶ Анімація':'Ⅱ Анімація';toggle.setAttribute('aria-label',paused?'Увімкнути анімацію':'Призупинити анімацію');toggle.setAttribute('aria-pressed',String(paused));}
  toggle.addEventListener('click',()=>{paused=!paused;clear();state();try{localStorage.setItem('journal-motion-paused',String(paused));}catch(_){}});document.body.append(toggle);state();
  function clear(){if(frame)cancelAnimationFrame(frame);frame=0;if(card){card.style.removeProperty('--depth-x');card.style.removeProperty('--depth-y');card=null;}}
  document.addEventListener('pointermove',event=>{
    if(paused||reduced.matches||!fine.matches)return;
    const next=event.target.closest?.('.stat');if(!next){clear();return;}
    if(next!==card){clear();card=next;}
    const box=card.getBoundingClientRect();x=(event.clientY-box.top)/box.height;y=(event.clientX-box.left)/box.width;
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;if(!card)return;card.style.setProperty('--depth-x',((.5-x)*5).toFixed(2)+'deg');card.style.setProperty('--depth-y',((y-.5)*6).toFixed(2)+'deg');});
  },{passive:true});
  document.addEventListener('pointerout',event=>{if(card&&!card.contains(event.relatedTarget))clear();},{passive:true});
  reduced.addEventListener('change',clear);fine.addEventListener('change',clear);
  function reveal(view){if(paused||reduced.matches||view.hidden)return;view.classList.remove('motion-enter');requestAnimationFrame(()=>{if(!view.hidden)view.classList.add('motion-enter');});}
  const views=[...document.querySelectorAll('.page-view')];
  const observer=new MutationObserver(entries=>{for(const entry of entries)if(!entry.target.hidden)reveal(entry.target);});
  views.forEach(view=>observer.observe(view,{attributes:true,attributeFilter:['hidden']}));
  document.querySelectorAll('.welcome-card,.welcome-copy').forEach(reveal);
  document.addEventListener('visibilitychange',()=>{state();if(document.hidden)clear();});
})();
