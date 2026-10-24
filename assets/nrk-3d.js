import * as THREE from './vendor/three-0.180.0.module.min.js';
import {buildNRK} from './nrk-model.js';
const host=document.querySelector('.equipment-slide[data-equipment="nrk"] .equipment-stage');
if(host){
 const fallback=host.querySelector('img');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}catch(_){host.dataset.modelState='fallback';}
 if(renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x16251e);
  scene.fog=new THREE.Fog(0x16251e,12,24);
  const camera=new THREE.PerspectiveCamera(36,1,.1,60);let yaw=.72,pitch=.35,zoom=1;
  const target=new THREE.Vector3(0,1.3,0);
  function cameraPosition(){const r=7.5*zoom;camera.position.set(Math.cos(yaw)*r,1.3+Math.sin(pitch)*r,Math.sin(yaw)*r);camera.lookAt(target);}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
  const {model,wheels}=buildNRK();scene.add(model);
  scene.add(new THREE.HemisphereLight(0xe9f5ff,0x53584a,2.7));
  const light=new THREE.DirectionalLight(0xfff5e3,4.5);light.position.set(3,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-4,right:4,top:4,bottom:-4});light.shadow.bias=-.001;scene.add(light);
  const rim=new THREE.DirectionalLight(0x9be9c7,2);rim.position.set(-4,3,-4);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x293c31,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D-модель НРК: шість коліс із протектором');canvas.setAttribute('role','img');canvas.tabIndex=0;host.append(canvas);if(fallback)fallback.hidden=true;
  host.classList.add('nrk-3d-stage');host.dataset.modelState='ready';host.title='Перетягніть, щоб оглянути модель';
  const hint=document.createElement('span');hint.className='nrk-3d-hint';hint.textContent='3D · перетягніть для огляду';host.append(hint);
  const label=host.closest('figure').querySelector('figcaption span');if(label)label.textContent='Об’ємна модель · 6 × 6';
  let dragging=false,lastX=0,lastY=0,dirty=true,angle=0,last=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;host.dataset.interacting='true';lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.009;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-lastY)*.007,.12,.9);lastX=e.clientX;lastY=e.clientY;dirty=true;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{dragging=false;host.dataset.interacting='false';});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){yaw=.72;pitch=.35;}else if(e.key==='ArrowLeft')yaw-=.15;else if(e.key==='ArrowRight')yaw+=.15;else pitch=THREE.MathUtils.clamp(pitch+(e.key==='ArrowUp'?.1:-.1),.12,.9);dirty=true;});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const resize=new ResizeObserver(()=>{if(host.clientWidth&&host.clientHeight){renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();dirty=true;}});resize.observe(host);
  renderer.setAnimationLoop(time=>{
   const dt=last?Math.min((time-last)/1000,.05):0;last=time;
   if(document.hidden||!host.getClientRects().length)return;
   const paused=reduced.matches||document.documentElement.classList.contains('motion-paused');
   if(!paused){angle-=dt*.7/.55;for(const wheel of wheels)wheel.rotation.z=angle;dirty=true;}
   if(dirty){cameraPosition();renderer.render(scene,camera);dirty=false;host.dataset.wheelAngle=angle.toFixed(4);}
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);canvas.hidden=true;hint.hidden=true;if(fallback)fallback.hidden=false;host.dataset.modelState='fallback';});
 }
}
