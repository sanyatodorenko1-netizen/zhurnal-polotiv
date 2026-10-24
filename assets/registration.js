/* Registration sends only the email and password entered in this form to Supabase Auth. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  el('loginForm').insertAdjacentHTML('beforeend','<button type="button" class="btn" id="openRegistration" style="margin-top:16px">Зареєструватися</button>');
  el('syncError').insertAdjacentHTML('beforebegin','<section id="pendingApproval" hidden><h2>Очікує підтвердження</h2><p>Обліковий запис створено. Адміністратор має підтвердити заявку та призначити роль. До цього дані журналу недоступні.</p><div class="actions"><button class="btn primary" id="checkApproval" type="button">Перевірити доступ</button><button class="btn" id="pendingSignOut" type="button">Вийти</button></div></section>');
  document.body.insertAdjacentHTML('beforeend','<dialog id="registrationDialog" aria-labelledby="registrationTitle"><div class="form-head"><h2 id="registrationTitle">Реєстрація</h2><button class="btn" id="closeRegistration" type="button" aria-label="Закрити реєстрацію">✕</button></div><form id="registrationForm" class="form-body"><p>Після реєстрації підтвердьте email, якщо надійде лист, і дочекайтеся схвалення адміністратора.</p><label for="registrationEmail">Електронна пошта</label><input id="registrationEmail" type="email" autocomplete="email" required maxlength="254"><label for="registrationPassword">Пароль · від 8 символів</label><input id="registrationPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="registrationConfirm">Повторіть пароль</label><input id="registrationConfirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><p id="registrationStatus" class="note" role="status"></p><button id="registrationSubmit" class="btn primary" type="submit">Створити обліковий запис</button></form></dialog>');
  el('roleManager').insertAdjacentHTML('beforeend','<hr><h3>Заявки на доступ</h3><p class="note">Нові користувачі не мають доступу, доки адміністратор не призначить роль.</p><button id="refreshRegistrations" class="btn" type="button">Оновити заявки</button><p id="registrationQueueStatus" class="note" role="status"></p><div id="registrationQueue" class="day-list"></div>');
  let queueOwner='',loading=false,revision=0;
  const admin=()=>cloudEnabled&&currentUser&&currentRole==='admin'&&!passwordRecovery;
  el('openRegistration').onclick=()=>{el('registrationForm').reset();el('registrationStatus').textContent='';el('registrationEmail').value=el('loginEmail').value;el('registrationDialog').showModal();};
  el('closeRegistration').onclick=()=>el('registrationDialog').close();
  el('registrationForm').onsubmit=async event=>{
    event.preventDefault();if(!cloudEnabled||el('registrationSubmit').disabled)return;
    if(el('registrationPassword').value!==el('registrationConfirm').value){el('registrationStatus').textContent='Паролі не збігаються.';return;}
    el('registrationSubmit').disabled=true;el('registrationStatus').textContent='Створюємо обліковий запис…';
    try{
      const {data,error}=await cloud.auth.signUp({email:el('registrationEmail').value.trim(),password:el('registrationPassword').value,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error)throw error;
      el('registrationPassword').value='';el('registrationConfirm').value='';
      el('registrationStatus').textContent='Якщо адресу можна зареєструвати, обліковий запис створено. Перевірте пошту для підтвердження email. Доступ до журналу надає адміністратор.';
      if(data?.session){el('registrationDialog').close();await loadUserRole();}
    }catch(error){el('registrationStatus').textContent='Не вдалося зареєструватися: '+(error.message||'Перевірте підключення.');}
    finally{el('registrationSubmit').disabled=false;}
  };
  el('pendingSignOut').onclick=()=>cloud.auth.signOut();
  el('checkApproval').onclick=async()=>{el('checkApproval').disabled=true;try{await loadUserRole();}finally{el('checkApproval').disabled=false;}};
  async function refreshQueue(){
    if(!admin()||loading)return;loading=true;const user=currentUser.id,request=revision;
    el('registrationQueueStatus').textContent='Завантажуємо заявки…';
    try{
      const {data,error}=await cloud.rpc('list_pending_flight_users');if(!admin()||currentUser.id!==user||request!==revision)return;if(error)throw error;
      el('registrationQueue').innerHTML=(data||[]).map(row=>'<div class="day-row"><div><strong>'+escape(row.email)+'</strong><p class="note">'+(row.email_confirmed?'Email підтверджено':'Очікується підтвердження email')+'</p></div><div><label>Роль<select data-approval-role="'+escape(row.user_id)+'"><option value="viewer">Переглядач</option><option value="executor">Виконавець</option><option value="moderator">Модератор</option><option value="admin">Адмін</option></select></label><button class="btn primary" data-approve-user="'+escape(row.user_id)+'" data-approve-email="'+escape(row.email)+'" '+(row.email_confirmed?'':'disabled')+'>Підтвердити й призначити роль</button></div></div>').join('')||'<p class="note">Нових заявок немає.</p>';
      el('registrationQueueStatus').textContent='Заявок: '+(data||[]).length;
    }catch(error){el('registrationQueueStatus').textContent='Не вдалося завантажити заявки: '+(error.message||'Перевірте підключення.');}
    finally{loading=false;}
  }
  el('refreshRegistrations').onclick=refreshQueue;
  el('registrationQueue').onclick=async event=>{
    const button=event.target.closest('[data-approve-user]');if(!button||button.disabled||!admin())return;
    const select=[...el('registrationQueue').querySelectorAll('[data-approval-role]')].find(node=>node.dataset.approvalRole===button.dataset.approveUser);if(!select)return;
    button.disabled=true;select.disabled=true;
    try{const {error}=await cloud.rpc('set_flight_user_role',{target_email:button.dataset.approveEmail,new_role:select.value});if(error)throw error;await refreshQueue();}
    catch(error){el('registrationQueueStatus').textContent='Не вдалося підтвердити: '+error.message;button.disabled=false;select.disabled=false;}
  };
  function sync(){
    el('pendingApproval').hidden=!(cloudEnabled&&currentUser&&!currentRole&&!passwordRecovery);
    if(!admin()){revision++;queueOwner='';el('registrationQueue').replaceChildren();return;}
    if(queueOwner!==currentUser.id){queueOwner=currentUser.id;refreshQueue();}
  }
  window.SiteRegistration={sync};sync();
  setInterval(()=>{if(cloudEnabled&&currentUser&&!currentRole&&!passwordRecovery)loadUserRole();else if(admin()&&activeView==='roles')refreshQueue();},15000);
})();
