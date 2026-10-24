// Synthetic records only. All remote scripts and services are intercepted.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const fixture=`
window.inventoryFixture=[{id:'v',platform_kind:'Вампір',board_number:'V-AVAILABLE',status:'warehouse'},{id:'n',platform_kind:'НРК',board_number:'N-REGISTERED',status:'vp'},{id:'h',platform_kind:'HEAVY SHOT',board_number:'H-REGISTERED',status:'repair'},{id:'lost',platform_kind:'Вампір',board_number:'V-LOST',status:'lost'}];
window.inventoryError=false;window.fixtureWrites=[];let auth;
window.supabase={createClient:()=>({auth:{onAuthStateChange:f=>{auth=f;},getSession:async()=>({data:{session:null}}),signInWithPassword:async()=>{auth('SIGNED_IN',{user:{id:'fixture',email:'fixture@example.test'}});return {};},signOut:async()=>({})},rpc:async()=>({}),from:table=>{const q={};for(const m of ['select','eq','order','limit'])q[m]=()=>q;q.maybeSingle=async()=>({data:{role:'admin'}});for(const m of ['insert','update','delete','upsert'])q[m]=data=>{window.fixtureWrites.push({table,method:m,data});return q;};q.then=ok=>Promise.resolve({data:table==='flight_equipment'?window.inventoryFixture:table==='flight_directory_items'?[{category:'platformNumber',value:'DIRECTORY-ONLY'}]:table==='flight_records'?[{id:'legacy-flight',created_by:'fixture',data:{date:'2026-10-24',platformKind:'Вампір',task:'Доставка',platformNumber:'HISTORIC-ONLY',executor:'Fixture',countMode:'per-record'}}]:[],error:table==='flight_equipment'&&window.inventoryError?{message:'fixture offline'}:null}).then(ok);return q;}})};
`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://fixture').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'){if(u.pathname==='/supabase-config.js')return route.fulfill({contentType:'text/javascript',body:"window.APP_CONFIG={url:'https://fixture.test',key:'fixture'}"});if(u.pathname==='/assets/nrk-3d.js')return route.fulfill({contentType:'text/javascript',body:''});return route.continue();}if(u.href.includes('@supabase/supabase-js'))return route.fulfill({contentType:'text/javascript',body:fixture});return route.fulfill({contentType:'text/javascript',body:''});});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#loginEmail').fill('fixture@example.test');await page.locator('#loginPassword').fill('fixture');await page.locator('#loginForm button[type=submit]').click();
 await page.waitForFunction(()=>document.getElementById('equipmentNotice').textContent.includes('Оновлюються'));
 const values=()=>page.locator('#platformNumber option').evaluateAll(es=>es.map(e=>e.value).filter(Boolean));
 await page.locator('#addBtn').click();assert.deepEqual(await values(),['N-REGISTERED']);
 await page.locator('#platformKind').selectOption('Вампір');assert.deepEqual(await values(),['V-AVAILABLE']);
 await page.locator('#platformNumber').selectOption('V-AVAILABLE');
 await page.locator('#platformKind').selectOption('HEAVY SHOT');assert.deepEqual(await values(),['H-REGISTERED']);assert.equal(await page.locator('#platformNumber').inputValue(),'');
 await page.evaluate(async()=>{window.inventoryFixture.push({id:'new',platform_kind:'Вампір',board_number:'V-NEW',status:'vp'});await loadEquipment();});
 await page.locator('#platformKind').selectOption('Вампір');assert.deepEqual(await values(),['V-AVAILABLE','V-NEW']);
 await page.locator('#cancelBtn').click();await page.locator('.side-link[data-view="records"]').click();await page.locator('[data-edit="legacy-flight"]').click();
 assert.equal(await page.locator('#platformNumber').inputValue(),'HISTORIC-ONLY');assert((await values()).includes('HISTORIC-ONLY'));
 assert((await page.locator('#platformNumber option:checked').textContent()).includes('зі збереженого рейсу'));
 await page.evaluate(async()=>{await loadEquipment();});assert.equal(await page.locator('#platformNumber').inputValue(),'HISTORIC-ONLY');
 await page.locator('#cancelBtn').click();await page.locator('[data-repeat="legacy-flight"]').click();assert.deepEqual(await values(),['V-AVAILABLE','V-NEW']);assert.equal(await page.locator('#platformNumber').inputValue(),'');
 await page.evaluate(async()=>{window.inventoryFixture=[];await loadEquipment();});assert.deepEqual(await values(),[]);assert((await page.locator('#boardAvailabilityHint').textContent()).includes('немає наявної'));
 await page.evaluate(async()=>{window.inventoryFixture=[{id:'v',platform_kind:'Вампір',board_number:'V-AVAILABLE',status:'vp'}];await loadEquipment();window.inventoryError=true;await loadEquipment();});assert.deepEqual(await values(),[]);
 assert((await page.locator('#boardAvailabilityHint').textContent()).includes('не завантажено'));
 assert.deepEqual(await page.evaluate(()=>window.fixtureWrites),[],'checking choices must not change stored data');assert.deepEqual(errors,[]);
 console.log('PASS: inventory-only board options, platform/status filtering, refreshed additions, legacy edit preservation, clean repeat, empty/error states and no writes.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
