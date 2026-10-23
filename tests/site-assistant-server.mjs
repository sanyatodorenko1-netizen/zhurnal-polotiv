import assert from 'node:assert/strict';
import {handler,safeQuestion,extractAnswer} from '../supabase/functions/site-assistant/index.ts';
assert(safeQuestion('Як завантажити звіт?'));
for(const q of ['', 'a'.repeat(1501), '33U XP 05004 44997', '48.24949, 16.41450','sk-abcdefghijklmnop','eyJabcdefghijklmnopqrstuvw.x']) assert(!safeQuestion(q),q);
assert.equal(extractAnswer({output:[{content:[{type:'output_text',text:'Test',annotations:[{type:'url_citation',url:'javascript:alert(1)',start_index:0,end_index:4}]}]}]}).citations.length,0);
let configured=true, role='viewer', quota=true, provider=200, citations=true, captured=[];
const env=name=>({SUPABASE_URL:'https://fixture.test',SUPABASE_ANON_KEY:'anon-fixture',OPENAI_API_KEY:configured?'secret-fixture':undefined})[name];
const request=async(url,options)=>{
 captured.push({url,options});
 if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture-user'});
 if(url.endsWith('current_flight_role'))return Response.json(role);
 if(url.endsWith('consume_site_ai_quota'))return Response.json(quota?null:{error:'limit'},{status:quota?200:400});
 if(url==='https://api.openai.com/v1/responses')return Response.json(provider===200?{output:[{content:[{type:'output_text',text:'Use Export XLSX.',annotations:citations?[{type:'url_citation',url:'https://example.org/help',title:'Help',start_index:4,end_index:15}]:[]}]}]}:{error:{message:'sensitive-provider-error'}},{status:provider});
 throw Error('Unexpected endpoint '+url);
};
const call=(method,body,headers={})=>handler(new Request('https://fixture.test/site-assistant',{method,headers:{Origin:'https://sanyatodorenko1-netizen.github.io',Authorization:'Bearer fixture-token','Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)}),env,request);
assert.equal((await call('OPTIONS')).status,204);
assert.equal((await call('POST',{message:'hello',web:false},{Origin:'https://attacker.test'})).status,403);
assert.equal((await call('GET',undefined,{Authorization:''})).status,401);
role=null;assert.equal((await call('GET')).status,403);role='viewer';
configured=false;assert.equal((await(await call('GET')).json()).configured,false);
assert.equal((await call('POST',{message:'Hello',web:false})).status,503);configured=true;
assert.equal((await call('POST',{message:'33UXP0500444997',web:false})).status,400);
assert.equal((await call('POST',null)).status,400);
assert.equal((await call('POST',{message:'a'.repeat(9000),web:false})).status,413);
assert.equal((await call('POST',{message:'Help',web:false,records:[{private:'data'}]})).status,400);
quota=false;assert.equal((await call('POST',{message:'Help',web:false})).status,429);quota=true;
for(role of ['viewer','executor','moderator','admin']){
 captured=[];const response=await call('POST',{message:'How to export?',web:true});assert.equal(response.status,200);
 const upstream=captured.find(x=>x.url==='https://api.openai.com/v1/responses');const body=JSON.parse(upstream.options.body);
 assert.equal(body.input,'How to export?');assert.equal(body.store,false);assert.equal(body.max_tool_calls,1);assert.equal(body.tools[0].type,'web_search');assert.equal(body.tool_choice,'required');
 assert(!upstream.options.body.includes('fixture-user'));assert(!upstream.options.body.includes('fixture-token'));
 assert(captured.every(x=>!x.url.includes('flight_records')));
}
captured=[];assert.equal((await call('POST',{message:'Help',web:false})).status,200);
assert.equal(JSON.parse(captured.find(x=>x.url==='https://api.openai.com/v1/responses').options.body).tools,undefined);
citations=false;assert.equal((await call('POST',{message:'Find a source',web:true})).status,502);citations=true;
provider=500;const failure=await call('POST',{message:'Help',web:false});assert.equal(failure.status,502);assert(!(await failure.text()).includes('sensitive-provider-error'));
console.log('PASS: backend auth/role/CORS, unconfigured state, input boundaries, no journal access, quotas, optional/required search, citations and safe upstream failures. All services mocked.');
