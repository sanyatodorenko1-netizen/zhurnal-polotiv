const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const auth=`window.testRole='admin';let cb;window.fixtureFeedback=[];window.supabase={createClient:()=>({auth:{onAuthStateChange:f=>{cb=f;},getSession:async()=>({data:{session:window.fixtureSignedIn?{user:{id:'fixture',email:'demo@example.test'},access_token:'fixture-token'}:null}}),signInWithPassword:async()=>{window.fixtureSignedIn=true;cb('SIGNED_IN',{user:{id:'fixture',email:'demo@example.test'}});return {};},signOut:async()=>{window.fixtureSignedIn=false;cb('SIGNED_OUT',null);}},from:t=>{const q={};for(const k of ['select','eq','order','limit'])q[k]=()=>q;q.maybeSingle=async()=>({data:{role:window.testRole}});q.then=ok=>Promise.resolve({data:t==='site_feedback'?window.fixtureFeedback:[],error:null}).then(ok);return q;},rpc:async(name,p)=>{if(name==='submit_site_feedback'){window.fixtureFeedback.push({id:p.request_id,title:p.feedback_title,body:p.feedback_body,created_at:'2026-10-23T12:00:00Z'});return {data:p.request_id};}return {};}})};`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://test').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/html');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],sent=[];let configured=false,delay=0,fail=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1'){
    if(u.pathname==='/supabase-config.js')return route.fulfill({contentType:'text/javascript',body:"window.APP_CONFIG={url:'https://fixture.test',key:'anon-fixture'}"});
    return route.continue();
   }
   if(u.href.includes('@supabase/supabase-js'))return route.fulfill({contentType:'text/javascript',body:auth});
   if(u.hostname==='fixture.test'&&u.pathname==='/functions/v1/site-assistant'){
    if(route.request().method()==='GET')return route.fulfill({json:{configured}});
    sent.push(route.request().postDataJSON());if(delay)await new Promise(r=>setTimeout(r,delay));
    if(fail)return route.fulfill({status:429,json:{error:'Ліміт запитів вичерпано.'}});
    return route.fulfill({json:{text:'Answer <img src=x onerror=alert(1)> source.',citations:[{start:36,end:42,title:'Official documentation',url:'https://example.org/help'},{start:0,end:1,title:'Unsafe',url:'javascript:alert(1)'}]}});
   }
   return route.fulfill({contentType:'text/javascript',body:''});
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert(await page.locator('#assistantNav').isHidden());
  await page.locator('#loginEmail').fill('demo@example.test');await page.locator('#loginPassword').fill('fixture-only');await page.locator('#loginForm button[type=submit]').click();
  await page.waitForSelector('#assistantNav:not([hidden])');await page.locator('#assistantNav').click();
  await page.waitForFunction(()=>document.getElementById('assistantStatus').textContent.includes('ще не підключено'));
  assert(await page.locator('#assistantSend').isDisabled());
  await page.locator('.assistant-help-card').filter({hasText:'Як завантажити звіт'}).click();
  assert((await page.locator('#assistantGuideBody').textContent()).includes('обидва дні'));
  for(const width of [360,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'assistant overflow '+width);}
  const out=process.env.QA_SCREENSHOT_DIR;if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'assistant-desktop.png'),fullPage:true});}
  await page.locator('#feedbackTitle').fill('Фільтр за виконавцем');await page.locator('#feedbackBody').fill('Було б зручно мати швидкий фільтр для вибору виконавця.');await page.locator('#feedbackSend').click();
  await page.waitForFunction(()=>document.getElementById('feedbackStatus').textContent.includes('Пропозицію збережено'));
  assert((await page.locator('#feedbackList').textContent()).includes('Фільтр за виконавцем'));
  await page.locator('#addBtn').click();await page.locator('#date').fill('');await page.locator('#checkRecordForm').click();
  assert((await page.locator('#assistantFormResult').textContent()).includes('обов’язкові'));
  assert((await page.locator('#assistantFormIssues').textContent()).includes('Дата'));
  assert.equal(sent.length,0,'local checks must never invoke AI');
  await page.locator('#cancelBtn').click();configured=true;await page.locator('#assistantReconnect').click();await page.waitForFunction(()=>!document.getElementById('assistantSend').disabled);
  await page.locator('#assistantQuestion').fill('Як завантажити звіт?');await page.locator('#assistantWeb').check();await page.locator('#assistantSend').click();
  await page.waitForSelector('.assistant-message.assistant');
  assert.deepEqual(Object.keys(sent[0]).sort(),['message','web']);assert.equal(sent[0].web,true);
  assert.equal(await page.locator('.assistant-message img').count(),0);
  assert.equal(await page.locator('.assistant-message a[href^="javascript:"]').count(),0);
  assert((await page.locator('.assistant-message a').all()).length>0);
  await page.locator('#assistantQuestion').fill('33U XP 05004 44997');await page.locator('#assistantSend').click();assert.equal(sent.length,1);
  fail=true;await page.locator('#assistantQuestion').fill('Поясни експорт');await page.locator('#assistantSend').click();await page.waitForFunction(()=>document.getElementById('assistantStatus').textContent.includes('Ліміт'));
  fail=false;delay=300;await page.locator('#assistantQuestion').fill('Як працює карта?');await page.locator('#assistantSend').click();await page.locator('#signOutBtn').click();await page.waitForTimeout(400);
  assert.equal(await page.locator('#assistantMessages').textContent(),'');assert.equal(await page.locator('#feedbackList').textContent(),'');assert(await page.locator('#assistantNav').isHidden());
  assert.deepEqual(errors,[]);
  console.log('PASS: assistant unavailable/configured modes, local help and form checks, suggestion confirmation, explicit search, no journal payload, escaped output/citations, rate-limit errors, logout race and mobile layouts. Mocked AI only.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
