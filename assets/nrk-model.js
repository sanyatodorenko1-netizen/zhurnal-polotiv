import * as THREE from './vendor/three-0.180.0.module.min.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
export function buildNRK(){
 const model=new THREE.Group();model.name='NRK six-wheel utility platform';
 const rubber=new THREE.MeshStandardMaterial({color:0x17191b,roughness:.92});
 const treadMat=new THREE.MeshStandardMaterial({color:0x242729,roughness:.88});
 const metal=new THREE.MeshStandardMaterial({color:0x252a2d,metalness:.28,roughness:.52});
 const edge=new THREE.MeshStandardMaterial({color:0x343c40,metalness:.42,roughness:.48});
 const silver=new THREE.MeshStandardMaterial({color:0x858c90,metalness:.72,roughness:.38});
 const olive=new THREE.MeshStandardMaterial({color:0x586047,roughness:.95});
 const black=new THREE.MeshStandardMaterial({color:0x101315,roughness:.6});
 rubber.userData.surface='rubber';treadMat.userData.surface='rubber';olive.userData.surface='fabric';
 const wheels=[];
 function mesh(geo,mat,parent=model,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(x,y,z,w,h,d,mat=metal,parent=model){return mesh((Math.min(w,h,d)>.05?new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.18):new THREE.BoxGeometry(w,h,d)),mat,parent,x,y,z);}
 function tube(points,r=.035,mat=edge){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),mat);}
 box(0,.99,0,3.1,.2,1.65);box(0,.79,0,2.7,.28,1.25,black);
 box(0,1.11,0,3.26,.07,1.75,edge);box(0,1.16,0,3.08,.05,1.53,metal);
 for(const z of [-.82,.82]){box(0,1.02,z,3.1,.16,.055);for(let x=-1.3;x<=1.31;x+=.33){const bolt=mesh(new THREE.CylinderGeometry(.027,.027,.012,8),silver,model,x,1.045,z*1.045);bolt.rotation.x=Math.PI/2;}}
 for(const x of [-1.56,1.56]){box(x,.85,0,.08,.26,1.6);tube([[x,1.02,-.8],[x*1.09,.86,-.8],[x*1.1,.58,-.55],[x*1.1,.53,.55],[x*1.09,.86,.8],[x,1.02,.8]],.055);}
 // Cargo stretcher and straps, based on the supplied image silhouette.
 box(0,1.235,0,2.52,.1,1.14,olive);
 const fabricGeo=new THREE.PlaneGeometry(2.49,1.11,40,20);fabricGeo.rotateX(-Math.PI/2);
 const positions=fabricGeo.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,.008*Math.sin(x*27+z*5)*Math.sin(z*12)+.004*Math.cos(x*45));}fabricGeo.computeVertexNormals();mesh(fabricGeo,olive,model,0,1.288,0);
 const stitchGeo=new THREE.BoxGeometry(.018,.006,.006),stitches=new THREE.InstancedMesh(stitchGeo,black,160),stitchDummy=new THREE.Object3D();
 for(let i=0;i<160;i++){stitchDummy.position.set(-1.2+(i%80)*.03,1.302,i<80?-.52:.52);stitchDummy.updateMatrix();stitches.setMatrixAt(i,stitchDummy.matrix);}model.add(stitches);
 for(const z of [-.6,.6])tube([[-1.48,1.24,z],[1.48,1.24,z]],.035,olive);
 for(const x of [-.93,.1,.94]){box(x,1.305,0,.07,.025,1.17,black);box(x,1.325,.48,.1,.045,.11,edge);}
 // Rear sensor/roll frame: two upright hoops with crossbars.
 for(const z of [-.59,.59])tube([[-1.12,1.13,z],[-1.2,2.22,z],[-1.05,2.65,z],[-.84,2.75,z],[-.25,2.75,z],[.02,2.5,z],[.16,1.13,z]],.036);
 for(const x of [-.84,-.3])tube([[x,2.75,-.59],[x,2.75,.59]],.032);
 box(-.55,2.83,0,.43,.065,.39,black);box(-.5,2.68,0,.16,.16,.17,metal);
 const camera=mesh(new THREE.SphereGeometry(.09,16,10),black,model,-.4,2.58,0);camera.scale.set(.7,1,1);
 for(const z of [-.67,.67])tube([[-.72,2.76,z],[-.72,3.05,z]],.009,silver);
 // Fasteners, separate deck panels, loom conduit and grille slats.
 for(const z of [-.72,.72])for(const x of [-1.38,-.7,0,.7,1.38]){const fastener=mesh(new THREE.CylinderGeometry(.018,.018,.025,6),silver,model,x,1.2,z);}
 for(const x of [-1.57,1.57])for(let z=-.55;z<=.56;z+=.14)box(x,.88,z,.025,.1,.045,black);
 for(const z of [-.64,.64])tube([[-1.2,.72,z],[-.8,.69,z],[.7,.7,z],[1.2,.8,z]],.018,black);
 // Axles are fixed. Each complete wheel is a separate group rotating about Z.
 const tireGeo=new THREE.TorusGeometry(.395,.145,20,64);
 const sideGeo=new THREE.CylinderGeometry(.47,.47,.28,40);sideGeo.rotateX(Math.PI/2);
 const rimGeo=new THREE.CylinderGeometry(.31,.31,.31,32);rimGeo.rotateX(Math.PI/2);
 const hubGeo=new THREE.CylinderGeometry(.105,.105,.36,16);hubGeo.rotateX(Math.PI/2);
 const treadGeo=new RoundedBoxGeometry(.15,.075,.18,1,.014);
 const boltGeo=new THREE.CylinderGeometry(.018,.018,.028,6);boltGeo.rotateX(Math.PI/2);
 const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 for(const x of [-1.05,0,1.05]){
  const axle=mesh(new THREE.CylinderGeometry(.065,.065,2.1,12),edge,model,x,.55,0);axle.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
   const w=new THREE.Group();w.name='wheel-'+x+'-'+side;w.position.set(x,.55,side*.94);model.add(w);wheels.push(w);
   mesh(sideGeo,rubber,w);mesh(tireGeo,rubber,w);mesh(rimGeo,black,w);mesh(hubGeo,edge,w);
   for(const z of [-.165,.165]){
    const ring=mesh(new THREE.TorusGeometry(.32,.023,8,32),edge,w,0,0,z);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const spoke=box(Math.cos(a)*.19,Math.sin(a)*.19,z,.24,.035,.024,metal,w);spoke.rotation.z=a;}
   }
   const treads=new THREE.InstancedMesh(treadGeo,treadMat,56);treads.castShadow=true;treads.receiveShadow=true;
   for(let i=0;i<28;i++)for(let row=0;row<2;row++){const a=i*Math.PI*2/28+(row?.045:0);dummy.position.set(Math.cos(a)*.526,Math.sin(a)*.526,row?.105:-.105);dummy.rotation.set(0,row?.35:-.35,a-Math.PI/2);dummy.updateMatrix();treads.setMatrixAt(i*2+row,dummy.matrix);}w.add(treads);
   for(const z of [-.173,.173]){const groove=mesh(new THREE.TorusGeometry(.431,.006,6,64),treadMat,w,0,0,z);const ring=mesh(new THREE.TorusGeometry(.365,.004,6,64),edge,w,0,0,z);}
   const bolts=new THREE.InstancedMesh(boltGeo,silver,16);
   for(let i=0;i<16;i++){const a=(i%8)*Math.PI/4;dummy.position.set(Math.cos(a)*.265,Math.sin(a)*.265,i<8?-.18:.18);dummy.rotation.set(0,0,0);dummy.updateMatrix();bolts.setMatrixAt(i,dummy.matrix);}w.add(bolts);
  }
 }
 model.userData={description:'Original stylized 3D model made from supplied reference; not an engineering replica.',wheelRadius:.55};
 return {model,wheels};
}
