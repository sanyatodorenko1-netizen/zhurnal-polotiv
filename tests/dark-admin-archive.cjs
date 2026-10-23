// Run: node tests/dark-admin-archive.cjs (requires Playwright and Chrome).
// All remote scripts/data are intercepted. No production service is contacted.
const {chromium} = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const mock = `
window.testCalls=[];window.testRole='admin';window.testArchiveError=false;window.testDelay=0;
const fixtureUser={id:'00000000-0000-4000-8000-000000000001',email:'admin@example.test'};
let authCallback;
window.supabase={createClient:()=>({
 auth:{onAuthStateChange:cb=>{authCallback=cb;},getSession:async()=>({data:{session:null}}),
 signInWithPassword:async()=>{authCallback('SIGNED_IN',{user:fixtureUser});return {};},
 signOut:async()=>{authCallback('SIGNED_OUT',null);return {};},resetPasswordForEmail:async()=>({})},
 rpc:async(name)=>{window.testCalls.push(name);await new Promise(r=>setTimeout(r,window.testDelay));return {error:window.testArchiveError?{code:'PGRST202'}:null};},
 from:table=>{window.testCalls.push(table);const q={};for(const m of ['select','eq','order'])q[m]=()=>q;
 q.maybeSingle=async()=>({data:{role:window.testRole}});
 for(const m of ['insert','update','delete','upsert'])q[m]=()=>{window.testCalls.push('WRITE:'+table);return q;};
 q.then=(ok,bad)=>Promise.resolve({data:table==='admin_monthly_summaries'?[{month:'2026-10-01',captured_at:'2026-10-23T10:00:00Z',admins:1,moderators:2,executors:3,viewers:4}]:[],error:null}).then(ok,bad);return q;}
})};`;
const server = http.createServer((req,res)=>{
  const file = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(data);});
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
  try{
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.hostname==='127.0.0.1'){
        if(u.pathname==='/supabase-config.js')return route.fulfill({contentType:'text/javascript',body:"window.APP_CONFIG={url:'https://test.invalid',key:'fixture'}"});
        return route.continue();
      }
      if(u.href.includes('@supabase/supabase-js'))return route.fulfill({contentType:'text/javascript',body:mock});
      return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:''});
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForSelector('#loginForm:not([hidden])');
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:960});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'login overflow '+width);
    }
    if(process.env.QA_SCREENSHOT_DIR){fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,'login-desktop.png'),fullPage:true});}
    await page.locator('#loginEmail').fill('admin@example.test');await page.locator('#loginPassword').fill('fixture-only');
    await page.locator('#loginForm button[type=submit]').click();
    await page.waitForFunction(()=>document.getElementById('archiveCount').textContent==='1');
    await page.locator('#archiveNav').click();
    assert.equal(await page.locator('#archiveNav').getAttribute('aria-current'),'page');
    assert.equal(await page.locator('#archiveRows tr').count(),1);
    assert.equal(await page.locator('#archiveChart meter').count(),4);
    for(const width of [360,768,1440]){
      await page.setViewportSize({width,height:960});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'archive overflow '+width);
    }
    const out=process.env.QA_SCREENSHOT_DIR;
    if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'admin-archive-desktop.png'),fullPage:true});}
    await page.locator('[data-view=records]').click();
    await page.locator('[data-view=overview]').click();
    await page.setViewportSize({width:360,height:960});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overview overflow');
    if(out)await page.screenshot({path:path.join(out,'dashboard-mobile.png'),fullPage:true});
    // Empty cloud must not import or overwrite a non-empty local cache.
    await page.evaluate(async()=>{localStorage.setItem('flight-log-v1',JSON.stringify([{id:'fixture',date:'2026-10-01'}]));await refreshFromCloud();});
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('flight-log-v1')).length),1);
    assert.equal(await page.evaluate(()=>testCalls.filter(x=>x.startsWith('WRITE:')).length),0);
    // Missing RPC is visible, retryable, and never claims success.
    await page.locator('#archiveNav').click();await page.evaluate(()=>window.testArchiveError=true);
    await page.locator('#archiveRefresh').click();
    await page.waitForFunction(()=>document.getElementById('archiveStatus').textContent.includes('Збереження не підтверджено'));
    await page.evaluate(()=>{window.testArchiveError=false;window.testDelay=200;});
    await page.locator('#archiveRefresh').click();await page.locator('#signOutBtn').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#archiveRows tr').count(),0);
    assert(await page.locator('#archiveNav').isHidden());
    // Non-admin accounts cannot request archive data or navigate directly to it.
    for(const role of ['viewer','executor','moderator']){
      await page.evaluate(r=>{window.testRole=r;window.testCalls=[];},role);
      await page.locator('#loginForm button[type=submit]').click();
      await page.waitForFunction(r=>currentRole===r,role);
      await page.evaluate(()=>showView('archive'));
      assert(await page.locator('#archiveView').isHidden());
      assert.equal(await page.evaluate(()=>testCalls.filter(x=>x==='capture_admin_monthly_summary'||x==='admin_monthly_summaries').length),0);
      await page.locator('#signOutBtn').click();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: login, admin archive, role restrictions, logout race, missing migration, cache preservation, navigation, mobile/table overflow, zero runtime errors. Synthetic fixtures only.');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
