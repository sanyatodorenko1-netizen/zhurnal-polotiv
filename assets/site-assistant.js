/* Only explicitly typed questions leave this panel. Journal/form data never do. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const help = {
    records:['Як додати запис','Натисніть «Додати рейс», заповніть дату, платформу й завдання та потрібні поля. Натисніть «Перевірити форму», щоб побачити пропуски. Зберігайте запис окремою кнопкою й дочекайтеся підтвердження бази.','records'],
    export:['Як завантажити звіт','Натисніть «Експорт XLSX» угорі. Оберіть початкову та кінцеву дату: обидва дні входять до звіту. Також доступне завантаження всього журналу.','records'],
    map:['Як працюють карта й MGRS','На карті оберіть точку або введіть код MGRS. Кнопка «Копіювати» копіює MGRS, «Додати запис тут» переносить точку у форму. Старі точки WGS84 залишаються доступними.','map'],
    access:['Чому кнопка недоступна','Доступ залежить від вашої ролі. Адміністратор керує доступом; переглядач читає дані. Помічник не змінює ролі та не виконує дії від вашого імені. Якщо потрібна інша роль, зверніться до адміністратора.','overview'],
    archive:['Що зберігає архів','Архів адміністратора зберігає щомісячні знімки кількості призначених ролей. Це не звіт про рейси. Знімок зберігається під час першого входу адміністратора в місяці й не перезаписується.','overview']
  };
  let revision = 0, identity = '', controller, ready = false, busy = false, feedbackId = crypto.randomUUID();
  const allowed = () => cloudEnabled && !!currentUser && !!currentRole && !passwordRecovery;
  function say(id, text) { el(id).textContent = text; }
  async function api(method, body) {
    const {data,error} = await cloud.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Увійдіть до журналу знову.');
    const response = await fetch(cfg.url+'/functions/v1/site-assistant', {method,
      headers:{Authorization:'Bearer '+data.session.access_token, apikey:cfg.key, 'Content-Type':'application/json'},
      body:body ? JSON.stringify(body) : undefined, signal:controller?.signal});
    let result; try { result = await response.json(); } catch (_) { throw new Error('Сервер помічника тимчасово недоступний.'); }
    if (!response.ok) throw new Error(result.error || 'Помічник тимчасово недоступний.');
    return result;
  }
  function controls() {
    el('assistantSend').disabled = !allowed() || !ready || busy;
    el('assistantWeb').disabled = !ready || busy;
    el('assistantQuestion').disabled = !allowed() || busy;
  }
  function reset() {
    revision++; controller?.abort(); identity=''; ready=false; busy=false;
    el('assistantMessages').replaceChildren(); el('feedbackList').replaceChildren();
    el('assistantQuestion').value=''; el('feedbackForm').reset(); feedbackId=crypto.randomUUID();
    say('assistantStatus','Увійдіть з призначеною роллю.'); say('feedbackStatus','');
    if (activeView === 'assistant') showView('overview');
    controls();
  }
  async function status() {
    const requestRevision=revision;
    say('assistantStatus','Перевіряємо підключення ШІ…');
    try {
      const result=await api('GET'); if(requestRevision!==revision || !allowed())return;
      ready=result.configured===true;
      say('assistantStatus',ready?'ШІ підключено. Доступні запитання й пошук у мережі.':'ШІ ще не підключено. Довідка, локальна перевірка форм і пропозиції працюють окремо.');
    } catch (error) {
      if(requestRevision!==revision)return;
      ready=false; say('assistantStatus','ШІ поки недоступний. Довідка й локальна перевірка форм доступні.');
    }
    controls();
  }
  function message(text, kind='assistant') {
    const item=document.createElement('div'); item.className='assistant-message '+kind;
    const name=document.createElement('small'); name.textContent=kind==='user'?'Ви':'Помічник';
    const body=document.createElement('div'); body.className='assistant-message-body'; body.textContent=text;
    item.append(name,body); el('assistantMessages').append(item);
    while(el('assistantMessages').children.length>20)el('assistantMessages').firstElementChild.remove();
    return body;
  }
  function renderAnswer(result) {
    const body=message('');
    const text=String(result.text||'');
    const notes=(result.citations||[]).filter(note=>{
      try{return ['https:','http:'].includes(new URL(note.url).protocol);}catch(_){return false;}
    });
    const ordered=notes.filter(note=>Number.isInteger(note.start)&&Number.isInteger(note.end)&&note.start>=0&&note.end>note.start&&note.end<=text.length).sort((a,b)=>a.start-b.start);
    let position=0;
    for(const note of ordered){
      if(note.start<position)continue;
      body.append(document.createTextNode(text.slice(position,note.start)));
      const link=document.createElement('a');link.href=note.url;link.textContent='['+(note.title||new URL(note.url).hostname)+']';link.target='_blank';link.rel='noopener noreferrer';body.append(link);position=note.end;
    }
    body.append(document.createTextNode(text.slice(position)));
    if(notes.length){
      const list=document.createElement('div');list.className='assistant-sources';
      const unique=new Set();for(const note of notes){if(unique.has(note.url))continue;unique.add(note.url);const a=document.createElement('a');a.href=note.url;a.textContent=note.title||new URL(note.url).hostname;a.target='_blank';a.rel='noopener noreferrer';list.append(a);}body.append(list);
    }
    el('assistantMessages').scrollTop=el('assistantMessages').scrollHeight;
  }
  el('assistantChatForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!allowed()||!ready||busy)return;
    const text=el('assistantQuestion').value.trim();if(!text)return;
    if(/\bsk-[\w-]{12,}|\b\d{1,2}[C-HJ-NP-X]\s*[A-HJ-NP-Z]{2}\s*\d{2,10}\b|\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(text)){
      say('assistantStatus','Не надсилайте координати, токени та секретні ключі.');return;
    }
    const requestRevision=revision;message(text,'user');busy=true;controls();
    say('assistantStatus',el('assistantWeb').checked?'Шукаємо інформацію та джерела…':'Готуємо відповідь…');
    controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),45000);
    try{
      const result=await api('POST',{message:text,web:el('assistantWeb').checked});
      if(requestRevision!==revision||!allowed())return;
      renderAnswer(result);el('assistantQuestion').value='';say('assistantStatus','Відповідь готова. Перевіряйте важливі факти за джерелами.');
    }catch(error){if(requestRevision===revision)say('assistantStatus',error.name==='AbortError'?'Запит перервано. Спробуйте знову.':error.message);}
    finally{clearTimeout(timeout);if(requestRevision===revision){busy=false;controls();}}
  });
  el('assistantClear').addEventListener('click',()=>{revision++;controller?.abort();busy=false;el('assistantMessages').replaceChildren();say('assistantStatus',ready?'Розмову очищено.':'ШІ ще не підключено.');controls();});
  el('assistantReconnect').addEventListener('click',()=>{if(allowed()&&!busy)status();});
  el('assistantHelpCards').replaceChildren();
  for(const [key,[title]] of Object.entries(help)){
    const button=document.createElement('button');button.type='button';button.className='assistant-help-card';button.textContent=title+' ↗';
    button.addEventListener('click',()=>{say('assistantGuideTitle',help[key][0]);say('assistantGuideBody',help[key][1]);el('assistantGuide').hidden=false;});
    el('assistantHelpCards').append(button);
  }
  function checkForm() {
    const form=el('flightForm');const invalid=[...form.elements].filter(field=>field.willValidate&&field.getClientRects().length&&!field.validity.valid);
    const recommended=['executor','platformNumber'].map(id=>el(id)).filter(field=>field.getClientRects().length&&!field.value);
    const list=el('assistantFormIssues');list.replaceChildren();
    for(const field of [...invalid,...recommended.filter(field=>!invalid.includes(field))]){
      const item=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='assistant-field-link';
      const label=document.querySelector('label[for="'+field.id+'"]')?.textContent||field.id;
      button.textContent=(invalid.includes(field)?'Потрібно виправити: ':'Рекомендовано заповнити: ')+label.replace(/\s*\*$/,'');
      button.addEventListener('click',()=>{field.scrollIntoView({block:'center'});field.focus();});item.append(button);list.append(item);
    }
    say('assistantFormResult',invalid.length?'Є незаповнені або некоректні обов’язкові поля.':recommended.length?'Обов’язкові поля заповнено. Є додаткові рекомендації.':'За стандартними правилами форми помилок не знайдено. Перевірте зміст перед збереженням.');
    el('assistantFormCheck').hidden=false;
  }
  el('checkRecordForm').addEventListener('click',checkForm);
  el('flightForm').addEventListener('reset',()=>{el('assistantFormCheck').hidden=true;el('assistantFormIssues').replaceChildren();});
  async function feedback() {
    if(!allowed())return;const requestRevision=revision;
    try{
      const {data,error}=await cloud.from('site_feedback').select('id,title,body,created_at').order('created_at',{ascending:false}).limit(30);
      if(requestRevision!==revision||!allowed())return;if(error)throw error;
      el('feedbackList').replaceChildren();
      for(const row of data||[]){const card=document.createElement('article');card.className='feedback-item';const title=document.createElement('strong'),body=document.createElement('p'),date=document.createElement('small');title.textContent=row.title;body.textContent=row.body;date.textContent=new Date(row.created_at).toLocaleString('uk-UA');card.append(title,body,date);el('feedbackList').append(card);}
      if(!data?.length)say('feedbackList','Пропозицій поки немає.');
      say('feedbackListCaption',currentRole==='admin'?'Пропозиції користувачів · доступ адміністратора':'Ваші надіслані пропозиції');
    }catch(_){if(requestRevision===revision)say('feedbackList','Пропозиції поки недоступні. Адміністратор має завершити налаштування.');}
  }
  el('feedbackRefresh').addEventListener('click',feedback);
  el('feedbackForm').addEventListener('input',()=>{feedbackId=crypto.randomUUID();});
  el('feedbackForm').addEventListener('submit',async event=>{
    event.preventDefault();if(!allowed()||el('feedbackSend').disabled)return;
    const requestRevision=revision;el('feedbackSend').disabled=true;say('feedbackStatus','Зберігаємо пропозицію…');
    try{
      const {data,error}=await cloud.rpc('submit_site_feedback',{request_id:feedbackId,feedback_title:el('feedbackTitle').value.trim(),feedback_body:el('feedbackBody').value.trim()});
      if(requestRevision!==revision||!allowed())return;
      if(error||data!==feedbackId)throw new Error('Збереження не підтверджено. Спробуйте пізніше.');
      el('feedbackForm').reset();feedbackId=crypto.randomUUID();say('feedbackStatus','Пропозицію збережено. Адміністратор бачить її у цьому розділі.');await feedback();
    }catch(error){if(requestRevision===revision)say('feedbackStatus',error.message||'Не вдалося зберегти пропозицію.');}
    finally{if(requestRevision===revision)el('feedbackSend').disabled=false;}
  });
  function sync() {
    el('assistantNav').hidden=!allowed();
    if(!allowed()){reset();return;}
    const key=currentUser.id+':'+currentRole;
    if(identity===key)return;
    reset();identity=key;el('feedbackSend').disabled=false;status();feedback();
  }
  window.SiteAssistant={sync};sync();
})();
