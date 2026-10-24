import * as THREE from './vendor/three-0.180.0.module.min.js';
const cache=new Map();
function texture(type){if(cache.has(type))return cache.get(type);const n=128,bytes=new Uint8Array(n*n*4);let seed=7193;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){seed=(Math.imul(seed,1664525)+1013904223)|0;const noise=(seed>>>24)/255;const weave=((Math.floor(x/4)+Math.floor(y/4))%2?1:-1)*18;const v=type==='carbon'?128+weave+Math.sin((x+y)*1.3)*12:type==='fabric'?128+Math.sin(x*Math.PI/2)*22+Math.sin(y*Math.PI/2)*17:128+(noise-.5)*(type==='rubber'?90:30);const i=(y*n+x)*4;bytes[i]=bytes[i+1]=bytes[i+2]=v;bytes[i+3]=255;}
 const t=new THREE.DataTexture(bytes,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(type==='carbon'?6:3,type==='carbon'?6:3);t.needsUpdate=true;cache.set(type,t);return t;
}
export function surfaceMaterials(model){const seen=new Set();model.traverse(o=>{for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(seen.has(mat))continue;seen.add(mat);const type=mat.userData.surface||'metal';mat.bumpMap=texture(type);mat.roughnessMap=texture(type);mat.roughness=type==='rubber'?.95:type==='fabric'?.9:Math.max(mat.roughness,.5);mat.bumpScale=type==='rubber'?.012:type==='fabric'?.006:.0018;mat.envMapIntensity=type==='rubber'?.18:.65;mat.needsUpdate=true;}});}
export function studioEnvironment(renderer){const room=new THREE.Scene();room.background=new THREE.Color(0x40454a);
 const panel=(w,h,x,y,z,ry=0,intensity=4)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;room.add(m);};
 panel(5,4,-4,4,2,Math.PI/3,5);panel(2,5,4,3,-1,-Math.PI/3,3);panel(6,2,0,6,-4,0,4);
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromScene(room,.04);generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
