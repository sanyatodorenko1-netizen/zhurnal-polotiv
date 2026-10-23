const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const coordinates = require('../assets/map-coordinates.js');
const wind = require('../assets/weather-wind.js');
assert.equal(wind.describe(3.2, 0).directionText, 'З півночі · 0°');
assert.equal(wind.describe(3.2, 90).directionText, 'Зі сходу · 90°');
assert.equal(wind.describe(3.2, 180).directionText, 'З півдня · 180°');
assert.equal(wind.describe(3.2, 270).directionText, 'Із заходу · 270°');
assert.equal(wind.describe(3.2, 360).angle, 0);
assert.equal(wind.describe(3.2, 315).directionText, 'З північного заходу · 315°');
assert.equal(wind.describe(3.2, null).angle, null);
assert.equal(wind.describe(null, 0).speedText, '—');
assert.equal(wind.describe(-1, 0).speedText, '—');
assert.equal(wind.describe(0, 90).directionText, 'Штиль');
assert.equal(wind.describe(36, 90, 'km/h').speedText, '10,0 м/с');
assert.equal(wind.describe(3.2, 90).speedText, '3,2 м/с');
// Published upstream vectors: https://github.com/proj4js/mgrs/blob/master/test/test.js
assert.equal(coordinates.toMGRS(36.2361322, -115.0820944), '11S PA 72349 11844');
assert.equal(coordinates.toMGRS(0, 0), '31N AA 66021 00000');
const [lat, lon] = coordinates.fromMGRS('33UXP04');
assert(Math.abs(lat - 48.24949) < 0.000001);
assert(Math.abs(lon - 16.41450) < 0.000001);
assert.equal(coordinates.toMGRS(lat, lon), '33U XP 05004 44997');
assert.deepEqual(coordinates.fromMGRS('33u xp 05004 44997'), coordinates.fromMGRS('33UXP0500444997'));
assert.deepEqual(coordinates.parse('50.4501, 30.5234'), [50.4501, 30.5234]);
assert.equal(coordinates.toMGRS(85, 10), null);
assert.equal(coordinates.toMGRS(-81, 10), null);
for(const bad of ['', '61UXP1234', '0UXP1234', '33IXP1234', '33UXI1234', '33UAP1234', '33UXP123', '33UXP123456123456', '90, 181', '50, 10 garbage']) assert.equal(coordinates.parse(bad), null, bad);
for(const [latitude,longitude] of [[48.24949,16.41450],[0,0],[-33.86,151.2],[60,6],[78,20],[-79.5,40]]) {
  const point = coordinates.fromMGRS(coordinates.toMGRS(latitude,longitude));
  assert(Math.abs(point[0]-latitude)<0.00003);
  assert(Math.abs(point[1]-longitude)<0.0001);
}
const mapStub = `
window.maplibregl={
 Map:class{constructor(opts){this.options=opts;this.handlers={};this.zoom=opts.zoom;this.center=opts.center;window.mockMap=this;}
 on(e,cb){(this.handlers[e]??=[]).push(cb);if(e==='load')setTimeout(cb,0);return this;}
 once(e,cb){return this.on(e,cb);} emit(e,data){(this.handlers[e]||[]).forEach(cb=>cb(data));}
 addControl(){return this;}getZoom(){return this.zoom;}resize(){this.resized=true;}loaded(){return true;}
 flyTo(o){this.center=o.center;this.zoom=o.zoom;this.emit('zoomend');}setStyle(s){this.style=s;this.emit('style.load');}fitBounds(){}},
 NavigationControl:class{}, LngLatBounds:class{extend(){return this;}},
 Marker:class{setLngLat(p){this.point=p;return this;}setPopup(){return this;}addTo(){return this;}remove(){}},
 Popup:class{setHTML(){return this;}}
};`;
const authStub = `
window.supabase={createClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'test-map-user',email:'map@example.test'}}}})},
 from:table=>{const q={};for(const key of ['select','eq','order'])q[key]=()=>q;q.maybeSingle=async()=>({data:{role:'admin'}});q.then=ok=>Promise.resolve({data:[],error:null}).then(ok);return q;},rpc:async()=>({error:{code:'PGRST202'}})})};`;
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/html');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedCoordinates=text;}}}));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='127.0.0.1'){
    if(u.pathname==='/supabase-config.js')return route.fulfill({contentType:'text/javascript',body:"window.APP_CONFIG={url:'https://test.invalid',key:'fixture'}"});
    return route.continue();
   }
   if(u.href.includes('@supabase/supabase-js'))return route.fulfill({contentType:'text/javascript',body:authStub});
   if(u.hostname==='api.open-meteo.com'){
    assert.equal(u.searchParams.get('wind_speed_unit'),'ms');
    assert(u.searchParams.get('current').split(',').includes('wind_direction_10m'));
    return route.fulfill({json:{current_units:{wind_speed_10m:'m/s'},current:{temperature_2m:18,relative_humidity_2m:61,precipitation:0,wind_speed_10m:3.2,wind_direction_10m:315,weather_code:2,time:'2026-10-23T12:00'}}});
   }
   if(u.hostname==='geocoding-api.open-meteo.com')return route.fulfill({json:{results:[{name:'Демонстраційна точка',country:'Австрія',latitude:48.24949,longitude:16.41450}]}});
   if(process.env.MAP_REAL==='1' && ['unpkg.com','tiles.openfreemap.org'].includes(u.hostname))return route.continue();
   if(u.href.includes('maplibre-gl.js'))return route.fulfill({contentType:'text/javascript',body:mapStub});
   return route.fulfill({contentType:'text/javascript',body:''});
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('.side-nav [data-view=map]').click();
  await page.waitForFunction(()=>!!agroMap);
  assert.equal(await page.locator('#mapStyleSelect').inputValue(),'dark');
  await page.locator('#mgrsSearch').fill('33u xp 05004 44997');
  await page.locator('#mgrsSearchForm button').click();
  await page.waitForFunction(()=>document.getElementById('locationMGRS').value==='33U XP 05004 44997');
  await page.waitForFunction(()=>document.getElementById('weatherWind').textContent==='3,2 м/с');
  assert.equal(await page.locator('#weatherWindDirection').textContent(), 'З північного заходу · 315°');
  assert.equal(await page.locator('#weatherWindArrow').evaluate(el=>el.style.transform), 'rotate(315deg)');
  assert.match(await page.locator('#locationCoordinates').inputValue(),/^48\.249488, 16\.414501$/);
  await page.locator('#copyCoordinatesBtn').click();
  assert.equal(await page.evaluate(()=>window.copiedCoordinates),'33U XP 05004 44997');
  await page.locator('#addWorkPointBtn').click();
  assert.equal(await page.locator('#workCoordinates').inputValue(),'33U XP 05004 44997');
  await page.locator('#cancelBtn').click();
  await page.locator('#mgrsSearch').fill('33UXP123');await page.locator('#mgrsSearchForm button').click();
  assert(await page.locator('#mapNotice').isVisible());
  assert.equal(await page.locator('#locationMGRS').inputValue(),'33U XP 05004 44997');
  await page.locator('#mgrsSearch').fill('33U XP 05004 44997');
  await page.locator('#weatherPanelLayer').uncheck();assert(await page.locator('#mapWeatherPanel').isHidden());
  await page.locator('#weatherPanelLayer').check();assert(await page.locator('#mapWeatherPanel').isVisible());
  await page.locator('#savedPointsLayer').uncheck();await page.locator('#savedPointsLayer').check();
  await page.locator('#mapStyleSelect').selectOption('liberty');
  await page.locator('#mapStyleSelect').selectOption('dark');
  await page.locator('#worldViewBtn').click();
  assert.equal(await page.locator('#locationMGRS').inputValue(),'');assert(await page.locator('#copyCoordinatesBtn').isDisabled());
  await page.locator('#placeSearch').fill('Demo');await page.locator('#locationSearchBtn').click();
  await page.waitForFunction(()=>!!document.getElementById('locationMGRS').value);
  await page.evaluate(()=>{flights=[{id:'test-old',date:'2026-10-23',task:'Інше',workCoordinates:'48.24949, 16.41450'},{id:'test-new',date:'2026-10-23',task:'Інше',workCoordinates:'33U XP 05004 44997'}];render();});
  assert.equal(await page.evaluate(()=>savedWorkMarkers.length),2);
  await page.locator('#savedPointsLayer').uncheck();assert.equal(await page.evaluate(()=>savedWorkMarkers.length),0);
  await page.locator('#savedPointsLayer').check();assert.equal(await page.evaluate(()=>savedWorkMarkers.length),2);
  await page.evaluate(()=>{flights=[];render();});
  await page.locator('#mapFullscreen').click();
  await page.waitForFunction(()=>!!document.fullscreenElement||document.getElementById('agroMapSection').classList.contains('map-expanded'));
  await page.locator('#mapFullscreen').click();
  if(process.env.MAP_REAL==='1'){
   await page.waitForFunction(()=>agroMap.isStyleLoaded(),{timeout:30000});
   assert.equal(await page.evaluate(()=>agroMap.getStyle().layers.find(layer=>layer.type==='background').paint['background-color']), '#0d1716');
   await page.evaluate(()=>agroMap.jumpTo({center:[16.4145,48.24949],zoom:10}));
   await page.waitForFunction(()=>agroMap.areTilesLoaded(),{timeout:30000});
  }
  const output=process.env.QA_SCREENSHOT_DIR;
  if(output && process.env.MAP_REAL==='1'){
   fs.mkdirSync(output,{recursive:true});
   await page.evaluate(()=>{const b=document.createElement('p');b.textContent='ДЕМОНСТРАЦІЯ · Відкрита світова карта, тестова точка. Погода — вигаданий приклад.';b.style.cssText='font-size:11px;color:#a0d5b2;padding:12px;border:1px solid #487151;border-radius:9px';document.querySelector('#mapView').prepend(b);});
   await page.screenshot({path:path.join(output,'map-mgrs-desktop.png'),fullPage:true});
  }
  for(const width of [360,768,1440]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>agroMap.resize());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'map page overflow '+width);
   if(width===360 && output && process.env.MAP_REAL==='1')await page.screenshot({path:path.join(output,'map-mgrs-mobile.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: published MGRS vectors, round trips, invalid input, WGS84 compatibility, map controls, copy, form transfer, saved markers, fullscreen and responsive layouts. '+(process.env.MAP_REAL==='1'?'Real map rendering with public test coordinates; mocked weather.':'No production services contacted.'));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
