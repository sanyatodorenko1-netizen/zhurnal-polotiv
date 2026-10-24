(() => {
  'use strict';
  const root=document.querySelector('.equipment-showcase');if(!root)return;
  const slides=[...root.querySelectorAll('.equipment-slide')],buttons=[...root.querySelectorAll('[data-showcase-index]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,timer;
  function select(next){index=next;slides.forEach((slide,i)=>{slide.hidden=i!==index;});buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}
  function schedule(){clearInterval(timer);timer=setInterval(()=>{if(document.hidden||reduced.matches||document.documentElement.classList.contains('motion-paused')||!root.getClientRects().length)return;select((index+1)%slides.length);},5000);}
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{select(i);schedule();}));
  schedule();
})();
