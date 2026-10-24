(() => {
  'use strict';
  const source='assets/equipment/nrk-user-platform.png';let serial=0;
  // Wheel centers measured on the supplied 800 × 600 image. Normalize each
  // ellipse before rotating its texture so perspective and the chassis stay fixed.
  function graphic(){const id='nrk-wheel-'+(++serial);const wheels=[[176,396,32,44],[329,426,43,55],[506,455,54,64]];
    const layers=wheels.map(([cx,cy,rx,ry])=>{const scale=ry/rx;return '<svg x="'+(cx-rx)+'" y="'+(cy-ry)+'" width="'+(rx*2)+'" height="'+(ry*2)+'" viewBox="0 0 '+(ry*2)+' '+(ry*2)+'" preserveAspectRatio="none" overflow="hidden"><defs><clipPath id="'+id+'-'+cx+'-clip"><circle cx="'+ry+'" cy="'+ry+'" r="'+ry+'"/></clipPath><radialGradient id="'+id+'-'+cx+'-fade"><stop offset="88%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient><mask id="'+id+'-'+cx+'" maskUnits="userSpaceOnUse" x="0" y="0" width="'+(ry*2)+'" height="'+(ry*2)+'"><rect width="'+(ry*2)+'" height="'+(ry*2)+'" fill="url(#'+id+'-'+cx+'-fade)"/></mask></defs><g clip-path="url(#'+id+'-'+cx+'-clip)" mask="url(#'+id+'-'+cx+')"><g class="nrk-wheel-turn" style="transform-origin:'+ry+'px '+ry+'px"><image preserveAspectRatio="none" href="'+source+'" x="'+(-(cx-rx)*scale)+'" y="'+(-(cy-ry))+'" width="'+(800*scale)+'" height="600"/></g></g></svg>';}).join('');
    // Feathered wheel edges keep the original tire silhouette intact.
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="НРК з анімованими колесами"><image href="'+source+'" width="800" height="600"/>'+layers+'</svg>';}
  function upgrade(root){root.querySelectorAll('img[src="'+source+'"]').forEach(img=>{const box=document.createElement('div');box.className=img.classList.contains('equipment-illustration')?'equipment-illustration nrk-motion':'nrk-motion';box.innerHTML=graphic();img.replaceWith(box);});}
  upgrade(document);
  const observer=new MutationObserver(()=>upgrade(document));
  for(const id of ['equipmentSummary','overviewEquipmentSummary']){const root=document.getElementById(id);if(root)observer.observe(root,{childList:true});}
})();
