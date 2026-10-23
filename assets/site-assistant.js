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
  let revision=0, identity='', feedbackId=crypto.randomUUID();
  const allowed=()=>cloudEnabled && !!currentUser && !!currentRole && !passwordRecovery;
  function say(id,text){el(id).textContent=text;}
  function reset(){revision++;identity='';el('feedbackList').replaceChildren();el('assistantQuestion').value='';el('feedbackForm').reset();feedbackId=crypto.randomUUID();say('feedbackStatus','');el('assistantSearchLinks').hidden=true;if(activeView==='assistant')showView('overview');}
  el('assistantChatForm').addEventListener('submit',event=>{
    event.preventDefault();if(!allowed())return;
    const text=el('assistantQuestion').value.trim();el('assistantSearchLinks').hidden=true;if(!text)return;
    if(/\bsk-[\w-]{12,}|\b\d{1,2}[C-HJ-NP-X]\s*[A-HJ-NP-Z]{2}\s*\d{2,10}\b|-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/i.test(text)){say('assistantStatus','Не вводьте координати, токени та секретні ключі.');return;}
    const query=encodeURIComponent(text);el('assistantGoogle').href='https://www.google.com/search?q='+query;el('assistantDuckDuckGo').href='https://duckduckgo.com/?q='+query;el('assistantSearchLinks').hidden=false;say('assistantStatus','Оберіть пошуковик. Запит передається лише після натискання посилання.');
  });
  el('assistantQuestion').addEventListener('input',()=>{el('assistantSearchLinks').hidden=true;});
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
    reset();identity=key;el('feedbackSend').disabled=false;feedback();
  }
  window.SiteAssistant={sync};sync();
})();
