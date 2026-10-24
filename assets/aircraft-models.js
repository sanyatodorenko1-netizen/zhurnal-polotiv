import * as THREE from './vendor/three-0.180.0.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
export function buildAircraft(kind){
 const vampire=kind==='vampire';const model=new THREE.Group();model.name=vampire?'Vampire six-rotor visual model':'Heavy Shot four-rotor visual model';
 const dark=new THREE.MeshStandardMaterial({color:0x20262a,metalness:.5,roughness:.42});
 const silver=new THREE.MeshStandardMaterial({color:0x777e83,metalness:.75,roughness:.35});
 const accent=new THREE.MeshStandardMaterial({color:vampire?0xb73636:0x343b3e,metalness:.4,roughness:.45});
 const carbon=new THREE.MeshStandardMaterial({color:0x15191c,metalness:.15,roughness:.65});
 const lens=new THREE.MeshStandardMaterial({color:0x122e34,metalness:.55,roughness:.13});
 carbon.userData.surface='carbon';
 const rotors=[];
 function mesh(g,m,x=0,y=0,z=0,parent=model){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(w,h,d,x,y,z,mat=dark,parent=model){return mesh((Math.min(w,h,d)>.04?new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.22):new THREE.BoxGeometry(w,h,d)),mat,x,y,z,parent);}
 function rod(a,b,r,mat=dark){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const o=mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),12),mat);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(new THREE.Vector3(...a)).normalize());return o;}
 const bodyY=1.22;
 box(vampire?.72:1.04,.22,vampire?1.15:.88,0,bodyY,0,accent);
 box(vampire?.6:.94,.06,vampire?1.02:.78,0,bodyY+.15,0,carbon);
 for(const x of [-1,1])for(const z of [-1,1])mesh(new THREE.CylinderGeometry(.025,.025,.018,8),silver,x*(vampire?.25:.42),bodyY+.19,z*(vampire?.43:.33));
 if(vampire){
  for(const z of [-.42,.42])rod([-.36,bodyY+.08,z],[.36,bodyY+.08,z],.022,silver);
  box(.24,.2,.27,0,bodyY-.18,.47,dark);
  const eye=mesh(new THREE.SphereGeometry(.105,16,12),lens,0,bodyY-.2,.59);eye.scale.z=.5;
 }else{
  for(const x of [-.33,0,.33])rod([x,bodyY+.15,-.25],[x,bodyY+.95,-.25],.015,carbon);
  box(.75,.045,.58,0,bodyY-.15,0,silver);
  for(const x of [-.35,.35])rod([x,bodyY-.23,-.35],[x,bodyY-.23,.35],.025,silver);
 }
 // Layered shell seam, battery retention, heatsink and inspection fasteners.
 box(vampire?.74:1.06,.025,vampire?1.17:.9,0,bodyY-.015,0,carbon);
 for(const z of [-.28,.28]){box(vampire?.57:.9,.014,.05,0,bodyY+.19,z,dark);}
 for(let i=0;i<9;i++)box(.018,.045,.28,-.18+i*.045,bodyY+.2,-.1,silver);
 for(const x of [-1,1])for(const z of [-1,1]){const washer=mesh(new THREE.TorusGeometry(.034,.008,6,16),dark,x*(vampire?.25:.42),bodyY+.19,z*(vampire?.43:.33));washer.rotation.x=Math.PI/2;}
 const positions=vampire?Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return [Math.sin(a)*1.6,Math.cos(a)*1.6];}):[[-1.5,-1.15],[1.5,-1.15],[-1.5,1.15],[1.5,1.15]];
 positions.forEach(([x,z],i)=>{
  const y=bodyY+.02;
  rod([x*.17,y,z*.17],[x,y,z],vampire?.042:.06,vampire?accent:silver);
  rod([x*.4,y-.06,z*.4],[x*.9,y-.06,z*.9],.018,carbon);
  mesh(new THREE.CylinderGeometry(.12,.11,.18,20),dark,x,y+.06,z);
  mesh(new THREE.CylinderGeometry(.08,.08,.055,16),silver,x,y+.17,z);
  // Motor cooling ribs and arm clamps, visual detail only.
  for(let rib=0;rib<4;rib++)mesh(new THREE.CylinderGeometry(.125,.125,.009,28),silver,x,y+.005+rib*.035,z);
  for(const fraction of [.3,.72]){const band=mesh(new THREE.SphereGeometry(.065,12,8),dark,x*fraction,y,z*fraction);band.scale.set(1,.55,1);}
  const wire=new THREE.CatmullRomCurve3([new THREE.Vector3(x*.18,y+.045,z*.18),new THREE.Vector3(x*.55,y+.07,z*.55),new THREE.Vector3(x*.96,y+.06,z*.96)]);mesh(new THREE.TubeGeometry(wire,16,.009,6,false),carbon);
  const rotor=new THREE.Group();rotor.name='rotor-'+i;rotor.position.set(x,y+.21,z);rotor.userData.direction=vampire?(i%2?-1:1):((i===0||i===3)?1:-1);model.add(rotor);rotors.push(rotor);
  // Two broad tapered blades, genuinely separate from the fixed motor and arm.
  const shape=new THREE.Shape();shape.moveTo(.04,-.025);shape.lineTo(.24,-.09);shape.lineTo(.64,-.075);shape.quadraticCurveTo(.74,-.035,.69,.025);shape.lineTo(.2,.055);shape.closePath();
  const bladeGeo=new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.003});bladeGeo.rotateX(-Math.PI/2);
  mesh(bladeGeo,vampire?accent:carbon,0,0,0,rotor);const blade2=mesh(bladeGeo,vampire?accent:carbon,0,0,0,rotor);blade2.rotation.y=Math.PI;
  mesh(new THREE.CylinderGeometry(.07,.07,.045,24),dark,0,.03,0,rotor);
  mesh(new THREE.CylinderGeometry(.024,.024,.025,6),silver,0,.065,0,rotor);
 });
 // Landing gear remains fixed while propellers rotate around their motor axes.
 if(vampire){for(const x of [-.47,.47]){rod([x*.6,bodyY-.1,-.33],[x,.28,-.48],.028,dark);rod([x*.6,bodyY-.1,.33],[x,.28,.48],.028,dark);rod([x,.25,-.72],[x,.25,.72],.035,accent);}}
 else{for(const x of [-.75,.75])for(const z of [-.55,.55]){rod([x*.7,bodyY-.1,z*.75],[x,.17,z],.027,silver);rod([x,.17,z-.14],[x,.17,z+.14],.035,carbon);}}
 model.userData={description:'Original stylized visual approximation based on existing reference photos, not engineering specifications.',rotorCount:rotors.length};
 return {model,rotors};
}
