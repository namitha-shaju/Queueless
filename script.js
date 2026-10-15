
(() => {
 let mode = 'login';
 const $ = id => document.getElementById(id);
 const switchMode = next => {
   mode = next;
   $('loginTab').classList.toggle('active', mode === 'login');
   $('signupTab').classList.toggle('active', mode === 'signup');
   $('nameField').classList.toggle('hidden', mode !== 'signup');
   $('patientName').required = mode === 'signup';
   $('accountSubmit').textContent = mode === 'signup' ? 'Sign Up' : 'Login';
   $('accountFeedback').textContent = '';
 };
 $('loginTab').addEventListener('click', () => switchMode('login'));
 $('signupTab').addEventListener('click', () => switchMode('signup'));
 const modal = $('login');
 const openLogin = (signup=false) => {switchMode(signup?'signup':'login');modal.classList.add('modal-open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-visible');setTimeout(()=>$('accountEmail').focus(),100);};
 const closeLogin = () => {modal.classList.remove('modal-open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-visible');};
 document.querySelectorAll('a[href="#login"],a[href="#signup"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openLogin(a.id==='footerSignup'||a.getAttribute('href')==='#signup');}));
 $('closeLogin').addEventListener('click',closeLogin);
 modal.addEventListener('click',e=>{if(e.target===modal)closeLogin();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogin();});
 $('accountForm').addEventListener('submit', event => {
   event.preventDefault();
   const name = $('patientName').value.trim();
   if (mode === 'signup' && !name) return;
   const email = $('accountEmail').value.trim();
   const displayName = name || email.split('@')[0];
   if ($('accountRole').value === 'patient') {
     const profileKey='ql_profile_'+email.toLowerCase();
     const existing=JSON.parse(localStorage.getItem(profileKey)||'{}');
     const profile={...existing,name:mode==='signup'?displayName:(existing.name||displayName),email};
     localStorage.setItem(profileKey,JSON.stringify(profile));
     sessionStorage.setItem('ql_current_profile',profileKey);
     localStorage.setItem('ql_last_profile',profileKey);
     window.qlRenderProfile?.();
   }
   if (['staff','admin'].includes($('accountRole').value)) { closeLogin(); document.body.classList.add('staff-active'); document.body.classList.remove('dashboard-active'); window.qlStaffRender?.(); window.qlSetStaffRole?.($('accountRole').value); location.hash='staff'; window.scrollTo(0,0); return; }
   $('dashboardGreeting').textContent = 'Welcome, ' + (JSON.parse(localStorage.getItem(sessionStorage.getItem('ql_current_profile')||localStorage.getItem('ql_last_profile'))||'{}').name||displayName) + '!';
   $('tokenPatient').value = JSON.parse(localStorage.getItem(sessionStorage.getItem('ql_current_profile')||localStorage.getItem('ql_last_profile'))||'{}').name||displayName;
   closeLogin();
   window.qlRenderProfile?.();
   document.body.classList.add('dashboard-active');
   $('patientDashboard').classList.remove('sidebar-collapsed');
   syncSidebar();
   location.hash = 'dashboard';
   window.scrollTo(0,0);
   const saved = sessionStorage.getItem('queuelessToken');
   if(saved) { try { const t=JSON.parse(saved); $('tokenNumber').textContent=t.number; $('receiptName').textContent=t.name; $('receiptTime').textContent=t.time; $('receiptDate').textContent=t.date; $('receiptDepartment').textContent=t.department; $('tokenResult').classList.remove('hidden'); $('dashboardStatus').textContent='Token '+t.number+' for '+t.department; setJoinState(!!t.joined,t.number); } catch(e) {} }
 });
 const setJoinState = (joined, number) => {
   const hasToken = !!number;
   $('joinQueueButton').disabled = !hasToken || joined;
   $('joinQueueButton').textContent = joined ? '✓ Joined Queue' : hasToken ? 'Join Queue Now →' : 'Book a Token First';
   $('joinQueueStatus').textContent = joined ? 'You are in the waiting line' : hasToken ? 'Token ready — join when you are ready' : 'Not joined yet';
   if(joined) updateQueue(number);
   else {
     $('nowServing').textContent = '—';$('queuePosition').textContent = hasToken ? number : '—';
     $('peopleAhead').textContent = '—';$('waitTime').textContent = '—';
     $('queueProgress').style.width='0%';$('queueLine').replaceChildren();
     $('queueMessage').textContent=hasToken?'Your token is booked. Select Join Queue to enter the waiting line.':'Book a token to see your queue details.';
   }
 };
 $('joinQueueButton').addEventListener('click',()=>{
   let t;try{t=JSON.parse(sessionStorage.getItem('queuelessToken')||'null')}catch(e){}
   if(!t || t.joined)return;
   t.joined=true;sessionStorage.setItem('queuelessToken',JSON.stringify(t));window.qlStoreBookedToken?.(t);window.qlAddToQueue?.(t);setJoinState(true,t.number);
   $('queue').scrollIntoView({behavior:'smooth',block:'start'});
 });
 const updateQueue = number => {
   const live = window.qlQueueSnapshot?.();
   if(live){const ahead=live.waiting.findIndex(x=>x.number===number); const active=live.serving?.number===number; const count=active?0:Math.max(0,ahead);$('nowServing').textContent=live.serving?.number||'—';$('queuePosition').textContent=number;$('peopleAhead').textContent=ahead<0&&!active?'—':count;$('waitTime').textContent=ahead<0&&!active?'—':(count*5)+' min';$('queueProgress').style.width=active?'100%':(ahead<0?'0%':Math.max(8,100/(count+2)))+'%';$('queueMessage').textContent=active?'Your token is now being served.':ahead<0?'Your token is not currently in the waiting queue.':count+' patient(s) ahead of you.';$('queueLine').replaceChildren();live.waiting.slice(0,12).forEach(x=>{const c=document.createElement('div');c.className='queue-person'+(x.number===number?' mine':'');const strong=document.createElement('strong');strong.textContent=x.number;const span=document.createElement('span');span.textContent=x.number===number?'You':'Waiting';c.append(strong,span);$('queueLine').append(c)});return;}
   $('nowServing').textContent = 'QL-018';
   $('queuePosition').textContent = number;
   $('peopleAhead').textContent = '5';
   $('waitTime').textContent = '25 min';
   $('queueProgress').style.width = '17%';
   $('queueMessage').textContent = '5 patients are ahead of you. Estimated waiting time: 25 minutes.';
   $('queueLine').innerHTML = '';
   for(let i=0;i<6;i++) {
     const cell=document.createElement('div');cell.className='queue-person'+(i===5?' mine':'');
     const label=document.createElement('strong');label.textContent=i===5?number:'QL-'+String(19+i).padStart(3,'0');
     const status=document.createElement('span');status.textContent=i===5?'You':'Waiting';
     cell.append(label,status);$('queueLine').appendChild(cell);
   }
 };
 const today = new Date();
 const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
 $('tokenDate').min = localDate;
 $('tokenForm').addEventListener('submit', event => {
   event.preventDefault();
   const name = $('tokenPatient').value.trim();
   if (!name || $('tokenDate').value < localDate) return;
   let number;
   try { number = window.qlGenerateUniqueToken($('tokenDepartment').value, $('tokenDate').value); } catch(error) { alert(error.message); return; }
   $('tokenNumber').textContent = number;
   $('receiptName').textContent = name;
   $('receiptTime').textContent = $('tokenTime').value;
   $('receiptDate').textContent = $('tokenDate').value;
   $('receiptDepartment').textContent = $('tokenDepartment').value;
   $('tokenResult').classList.remove('hidden');
   $('dashboardStatus').textContent = 'Token ' + number + ' for ' + $('tokenDepartment').value;
   setJoinState(false,number);
   const booked={number,name,time:$('tokenTime').value,date:$('tokenDate').value,department:$('tokenDepartment').value};
   sessionStorage.setItem('queuelessToken', JSON.stringify(booked));

   window.qlStoreBookedToken?.(booked);
   $('tokenResult').scrollIntoView({behavior:'smooth',block:'center'});
 });
 $('dashboardBookNow').addEventListener('click', () => $('tokens').scrollIntoView({behavior:'smooth'}));
 $('tileJoinQueue').addEventListener('click', () => $('joinQueue').scrollIntoView({behavior:'smooth'}));
 $('tileBook').addEventListener('click', () => $('tokens').scrollIntoView({behavior:'smooth'}));
 $('tileDepartments').addEventListener('click', () => { $('tokens').scrollIntoView({behavior:'smooth'}); $('tokenDepartment').focus({preventScroll:true}); });
 $('tileMyToken').addEventListener('click', () => ($('tokenResult').classList.contains('hidden') ? $('tokens') : $('tokenResult')).scrollIntoView({behavior:'smooth'}));
 const syncSidebar=()=>{const collapsed=$('patientDashboard').classList.contains('sidebar-collapsed');$('sidebarToggle').setAttribute('aria-expanded',String(!collapsed));$('sidebarToggle').setAttribute('aria-label',collapsed?'Open navigation':'Close navigation');$('sidebarToggle').textContent=collapsed?'☰':'✕';};
 $('sidebarToggle').addEventListener('click',()=>{$('patientDashboard').classList.toggle('sidebar-collapsed');syncSidebar();});
 $('sidebarBackdrop').addEventListener('click',()=>{$('patientDashboard').classList.add('sidebar-collapsed');syncSidebar();});
 document.querySelectorAll('[data-dash-target]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); document.querySelectorAll('[data-dash-target]').forEach(x=>x.classList.remove('active'));link.classList.add('active');$(link.dataset.dashTarget).scrollIntoView({behavior:'smooth'});if(matchMedia('(max-width:950px)').matches){$('patientDashboard').classList.add('sidebar-collapsed');syncSidebar();} }));
 $('printToken').addEventListener('click', () => window.print());
 $('logoutButton').addEventListener('click', () => {
   $('patientDashboard').classList.add('sidebar-collapsed');syncSidebar();
   document.body.classList.remove('dashboard-active');
   $('accountForm').reset();
   $('tokenForm').reset();
   $('tokenResult').classList.add('hidden');
   $('dashboardStatus').textContent = 'No token booked yet.';
   setJoinState(false,null);
   $('nowServing').textContent = $('queuePosition').textContent = $('peopleAhead').textContent = '—';
   $('queueProgress').style.width='0%';
   $('waitTime').textContent='—';
   $('queueLine').innerHTML='';
   $('queueMessage').textContent='Book a token to see your queue details.';
   sessionStorage.removeItem('queuelessToken');
   sessionStorage.removeItem('ql_current_profile');
   location.hash = 'home';
   window.scrollTo(0,0);
 });
})();


(()=>{
const key='queueless_shared_queue_v1';const $=id=>document.getElementById(id);
const seed=()=>({waiting:Array.from({length:5},(_,i)=>({number:'QL-'+String(19+i).padStart(3,'0'),name:'Patient '+(i+1),department:'General Medicine',joinedAt:null,example:true})),serving:{number:'QL-018',name:'Patient',department:'General Medicine',example:true},completed:0,skipped:[]});
const get=()=>{try{const q=JSON.parse(localStorage.getItem(key));if(q&&Array.isArray(q.waiting))return q}catch(e){}const q=seed();localStorage.setItem(key,JSON.stringify(q));return q};
const save=q=>{localStorage.setItem(key,JSON.stringify(q));render()};
window.qlQueueSnapshot=get;
window.qlGenerateUniqueToken=(department,visitDate)=>{
 const prefixes={'Cardiology':'CARDIO','Orthopedics':'ORTHO','Neurology':'NEURO','Pediatrics':'PEDIA','General Medicine':'GEN','Ophthalmology':'OPHTH','Dentistry':'DENT','Dermatology':'DERMA'};
 const prefix=prefixes[department]||String(department||'QUEUE').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,8);
 const registryKey='queueless_department_token_registry_v1';
 let registry={};
 try{registry=JSON.parse(localStorage.getItem(registryKey)||'{}')||{}}catch(e){}
 const date=visitDate||new Date().toLocaleDateString('en-CA');
 const dayKey=date+'|'+prefix;
 const issued=new Set(Array.isArray(registry[dayKey])?registry[dayKey]:[]);
 const q=get();
 const all=[...(q.waiting||[]),...(q.serving?[q.serving]:[]),...(q.history||[]),...(q.skipped||[])];
 for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);
   if(!k||!k.startsWith('ql_tokens_'))continue;
   try{const tokens=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(tokens))all.push(...tokens)}catch(e){}
 }
 for(const t of all){if(t.number&&t.number.startsWith(prefix+'-')&&(!t.date||t.date===date))issued.add(t.number)}
 const available=[];
 for(let i=1;i<=999;i++){
   const candidate=prefix+'-'+String(i).padStart(3,'0');
   if(!issued.has(candidate))available.push(candidate);
 }
 if(!available.length)throw new Error('No available token numbers for this department and date.');
 const random=new Uint32Array(1);
 crypto.getRandomValues(random);
 const number=available[random[0]%available.length];
 issued.add(number);
 registry[dayKey]=[...issued];
 localStorage.setItem(registryKey,JSON.stringify(registry));
 return number;
};

window.qlAddToQueue=t=>{const q=get();if(![...(q.waiting||[]),...(q.serving?[q.serving]:[]),...(q.history||[]),...(q.skipped||[])].some(x=>x.number===t.number)){q.waiting.push({...t,joinedAt:Date.now(),createdAt:Date.now()});save(q)}};

function render(){
 const q=get();q.history=Array.isArray(q.history)?q.history:[];q.skipped=Array.isArray(q.skipped)?q.skipped:[];
 $('staffWaiting').textContent=q.waiting.length;
 $('staffServing').textContent=q.serving?.number||'—';
 $('staffNow').textContent=q.serving?.number||'—';
 $('staffNext').textContent=q.waiting[0]?.number||'—';
 $('staffCompleted').textContent=q.completed||0;
 $('staffTotal').textContent=q.waiting.length+(q.serving?1:0)+(q.completed||0);
 $('staffEta').textContent=(q.waiting.length*5)+' min';
 $('staffCall').disabled=!q.waiting.length;
 $('staffComplete').disabled=!q.serving;
 $('staffSkip').disabled=!q.serving;
 const search=$('staffSearch').value.trim().toLowerCase(),dept=$('staffDepartment').value;
 const filtered=q.waiting.map((t,i)=>({t,i})).filter(({t})=>(!dept||t.department===dept)&&(!search||[t.name,t.number,t.department].some(v=>String(v||'').toLowerCase().includes(search))));
 $('staffRows').replaceChildren();
 filtered.forEach(({t,i})=>{
  const tr=document.createElement('tr');
  [String(i+1),t.number,t.name||'Patient',t.department||'—','Waiting'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});
  const td=document.createElement('td'),btn=document.createElement('button');btn.className='staff-row-action';btn.textContent='Call Patient';
  btn.onclick=()=>{const fresh=get();if(fresh.serving){$('staffNotice').textContent='Complete the current visit before calling another patient.';return}const idx=fresh.waiting.findIndex(x=>x.number===t.number);if(idx<0)return;fresh.serving={...fresh.waiting.splice(idx,1)[0],calledAt:Date.now()};save(fresh);$('staffNotice').textContent='Called '+t.number};
  td.append(btn);tr.append(td);$('staffRows').append(tr)
 });
 $('staffEmpty').hidden=filtered.length>0;
 $('staffHistoryRows').replaceChildren();
 q.history.slice(-15).reverse().forEach(t=>{const tr=document.createElement('tr');[t.number,t.name||'Patient',t.department||'—',t.completedAt||'—'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});$('staffHistoryRows').append(tr)});
 $('staffHistoryEmpty').hidden=q.history.length>0;
 window.qlRenderReports?.();
 const t=JSON.parse(sessionStorage.getItem('queuelessToken')||'null');
 if(t?.joined){const pos=q.waiting.findIndex(x=>x.number===t.number);const serving=q.serving?.number===t.number;const ahead=pos<0?0:pos;$('nowServing').textContent=q.serving?.number||'—';$('peopleAhead').textContent=serving?'0':pos<0?'—':String(ahead);$('waitTime').textContent=serving?'Now':pos<0?'—':(ahead*5)+' min';$('queueMessage').textContent=serving?'Your token is being served.':pos<0?'Your token is no longer in the waiting line.':ahead+' patient(s) ahead of you.';$('queueLine').replaceChildren();q.waiting.slice(0,12).forEach(x=>{const c=document.createElement('div');c.className='queue-person'+(x.number===t.number?' mine':'');const b=document.createElement('strong');b.textContent=x.number;c.append(b,document.createTextNode(x.number===t.number?'You':'Waiting'));$('queueLine').append(c)})}
}
function completeCurrent(q){if(!q.serving)return null;const t=q.serving;q.history=Array.isArray(q.history)?q.history:[];q.history.push({...t,completedAt:new Date().toLocaleString(),completedAtMs:Date.now()});q.completed=(q.completed||0)+1;q.serving=null;return t}
$('staffSearch').addEventListener('input',render);
$('staffDepartment').addEventListener('change',render);
$('staffExport').addEventListener('click',()=>{
 const q=get(), rows=[['Position','Token','Patient','Department','Status'],...q.waiting.map((t,i)=>[i+1,t.number,t.name||'',t.department||'','Waiting'])];
 const csv=rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\\r\\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='queueless-queue.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
});

window.qlStaffRender=render;
window.qlQueueSave=save;
$('staffCall').onclick=()=>{const q=get();if(!q.waiting.length)return;if(q.serving){$('staffNotice').textContent='Complete the current visit first.';return}q.serving={...q.waiting.shift(),calledAt:Date.now()};save(q);$('staffNotice').textContent='Called '+q.serving.number};
$('staffComplete').onclick=()=>{const q=get();if(!q.serving)return;const n=q.serving.number;completeCurrent(q);save(q);$('staffNotice').textContent='Completed '+n};
$('staffSkip').onclick=()=>{const q=get();if(!q.serving)return;q.skipped=Array.isArray(q.skipped)?q.skipped:[];q.skipped.push({...q.serving,skippedAtMs:Date.now()});const n=q.serving.number;q.serving=null;save(q);$('staffNotice').textContent='Skipped '+n};
$('staffLogout').onclick=()=>{document.body.classList.remove('staff-active');location.hash='home';window.scrollTo(0,0)};
$('staffMenu').onclick=()=>$('staffSidebar').classList.toggle('closed');
document.querySelectorAll('[data-staff-go]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-staff-go]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$(b.dataset.staffGo).scrollIntoView({behavior:'smooth'});if(innerWidth<=850)$('staffSidebar').classList.add('closed')});
window.addEventListener('storage',e=>{if(e.key===key)render()});render();
})();


(()=>{
const $=id=>document.getElementById(id);
const tokenKey=()=>{const k=sessionStorage.getItem('ql_current_profile')||localStorage.getItem('ql_last_profile');return k?'ql_tokens_'+k:null};
const loadTokens=()=>{try{return JSON.parse(localStorage.getItem(tokenKey())||'[]')}catch(e){return []}};
window.qlStoreBookedToken=t=>{const k=tokenKey();if(!k)return;const tokens=loadTokens().filter(x=>x.number!==t.number);tokens.unshift(t);try{localStorage.setItem(k,JSON.stringify(tokens.slice(0,50)))}catch(e){};};
window.qlRenderTokens=()=>{const root=$('profileTokenList');if(!root)return;root.replaceChildren();const tokens=loadTokens();const current=(()=>{try{return JSON.parse(sessionStorage.getItem('queuelessToken')||'null')}catch(e){return null}})();if(current&&!tokens.some(t=>t.number===current.number)){tokens.unshift(current)};$('profileTokenCount').textContent=tokens.length+' token'+(tokens.length===1?'':'s');if(!tokens.length){const empty=document.createElement('p');empty.textContent='No tokens booked yet. Book a token from your dashboard to see it here.';root.append(empty);return;}const q=window.qlQueueSnapshot?.();tokens.forEach(t=>{const card=document.createElement('article');card.className='profile-token-card';const title=document.createElement('div');title.className='profile-token-title';const num=document.createElement('strong');num.textContent=t.number||'Token';const status=document.createElement('span');status.className='profile-token-status';let label='Booked';if(q){if(q.serving?.number===t.number)label='Now Serving';else if((q.waiting||[]).some(x=>x.number===t.number))label='Waiting';else if((q.history||[]).some(x=>x.number===t.number))label='Completed';else if(t.joined)label='Joined Queue';}status.textContent=label;title.append(num,status);const details=document.createElement('p');details.textContent=[t.department,t.date,t.time].filter(Boolean).join('  •  ');const patient=document.createElement('small');patient.textContent=t.name||'';card.append(title,details,patient);root.append(card)})};
window.qlRenderProfile=()=>{
 const key=sessionStorage.getItem('ql_current_profile')||localStorage.getItem('ql_last_profile');
 if(!key)return;
 let p={};try{p=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
 $('profileName').value=p.name||'';$('profileEmail').value=p.email||'';
 $('profilePhone').value=p.phone||'';$('profileAge').value=p.age||'';
 $('profileAddress').value=p.address||'';
 $('profileAvatar').textContent=(p.name||'P').charAt(0).toUpperCase();
 $('profileNotice').textContent='';
 window.qlRenderTokens?.();

 $('profileTopAvatar').textContent=(p.name||'P').charAt(0).toUpperCase();
 $('profileTopName').textContent=p.name||'My Account';
 $('profileDropdownName').textContent=p.name||'Patient';
 $('profileDropdownEmail').textContent=p.email||'';
};
$('tileProfile')?.addEventListener('click',()=>{
 window.qlRenderProfile?.();
 window.qlOpenProfilePage?.();
});
$('profileForm').addEventListener('submit',e=>{
 e.preventDefault();const key=sessionStorage.getItem('ql_current_profile')||localStorage.getItem('ql_last_profile');if(!key)return;
 const p={name:$('profileName').value.trim(),email:$('profileEmail').value,phone:$('profilePhone').value.trim(),age:$('profileAge').value,address:$('profileAddress').value.trim()};
 if(!p.name)return;
 try { localStorage.setItem(key,JSON.stringify(p)); }
 catch(error){$('profileNotice').textContent='Unable to save in this browser. Check storage permissions.';return;}
 $('profileAvatar').textContent=p.name[0].toUpperCase();
 $('profileTopAvatar').textContent=p.name[0].toUpperCase();
 $('profileTopName').textContent=p.name;
 $('profileDropdownName').textContent=p.name;
 $('dashboardGreeting').textContent='Welcome, '+p.name+'!';
 $('tokenPatient').value=p.name;
 $('profileNotice').textContent='Profile updated successfully.';
});
window.qlOpenProfilePage=()=>{window.qlRenderProfile?.();document.body.classList.add('profile-page-active');$('profilePage').hidden=false;window.scrollTo(0,0)};
const closeProfilePage=()=>{document.body.classList.remove('profile-page-active');$('profilePage').hidden=true;window.scrollTo(0,0)};
$('profileBack').addEventListener('click',closeProfilePage);
$('logoutButton').addEventListener('click',closeProfilePage);
document.querySelectorAll('[data-dash-target="profile"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();window.qlOpenProfilePage?.()}));
const menu=$('profileDropdown'),trigger=$('profileMenuButton');
const closeMenu=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false')};
trigger.addEventListener('click',()=>{closeMenu();window.qlOpenProfilePage?.()});
$('openProfileFromMenu').addEventListener('click',()=>{closeMenu();window.qlRenderProfile?.();window.qlOpenProfilePage?.()});
$('profileMenuLogout').addEventListener('click',()=>{closeMenu();$('logoutButton').click()});
document.addEventListener('click',e=>{if(!e.target.closest('.profile-menu-wrap'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
function adminRender(){
 if(!document.body.classList.contains('ql-admin'))return;
 const q=window.qlQueueSnapshot?.();if(!q)return;
 const waiting=q.waiting||[],history=q.history||[],all=[...waiting,...(q.serving?[q.serving]:[])];
 $('adminWaiting').textContent=waiting.length;
 $('adminServing').textContent=q.serving?.number||'—';
 $('adminCompleted').textContent=q.completed||0;
 const depts={};all.forEach(t=>{const d=t.department||'Unassigned';depts[d]=(depts[d]||0)+1});
 $('adminDepartments').textContent=Object.keys(depts).length;
 const list=$('adminDepartmentList');list.replaceChildren();
 if(!Object.keys(depts).length)list.textContent='No active departments in the queue.';
 Object.entries(depts).sort((a,b)=>b[1]-a[1]).forEach(([name,count])=>{
 const line=document.createElement('div');line.className='admin-dept-row';
 const label=document.createElement('span');label.textContent=name;
 const value=document.createElement('strong');value.textContent=count+' patient'+(count===1?'':'s');
 line.append(label,value);list.append(line);
 });
 const activity=$('adminActivity');activity.replaceChildren();
 const events=[...history.slice(-5).reverse().map(t=>({title:'Completed · '+t.number,detail:(t.name||'Patient')+' — '+(t.department||'Unassigned')})),...waiting.slice(0,3).map(t=>({title:'Waiting · '+t.number,detail:(t.name||'Patient')+' — '+(t.department||'Unassigned')}))];
 if(!events.length)activity.textContent='No activity recorded.';
 events.forEach(ev=>{const row=document.createElement('div');row.className='admin-activity-row';const title=document.createElement('strong');title.textContent=ev.title;const detail=document.createElement('span');detail.textContent=ev.detail;row.append(title,detail);activity.append(row)});

}
const oldStaffRender=window.qlStaffRender;
window.qlStaffRender=()=>{oldStaffRender?.();adminRender();window.qlRenderReports?.()};
$('adminDownload').addEventListener('click',()=>{
 if(!document.body.classList.contains('ql-admin'))return;
 const q=window.qlQueueSnapshot?.();if(!q)return;
 const rows=[['Status','Token','Patient','Department'],...(q.waiting||[]).map(t=>['Waiting',t.number,t.name,t.department]),...(q.serving?[['Serving',q.serving.number,q.serving.name,q.serving.department]]:[]),...(q.history||[]).map(t=>['Completed',t.number,t.name,t.department])];
 const csv=rows.map(row=>row.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='queueless-admin-report.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
window.qlSetStaffRole=role=>{
 document.body.classList.toggle('ql-admin',role==='admin');
 document.querySelector('#staffTop h1').textContent=role==='admin'?'Admin Dashboard':'Staff Dashboard';
 document.querySelector('#staffTop .dash-eyebrow').textContent=role==='admin'?'ADMINISTRATOR WORKSPACE':'HOSPITAL WORKSPACE';
 adminRender();
};
$('adminReset').addEventListener('click',()=>{
 if(!document.body.classList.contains('ql-admin'))return;
 if(!confirm('Reset the queue and completed visit history on this browser?'))return;
 localStorage.removeItem('queueless_shared_queue_v1');
 window.qlStaffRender?.();
 $('adminNotice').textContent='Queue has been reset.';
});
$('staffLogout').addEventListener('click',()=>document.body.classList.remove('ql-admin'));
})();


(()=>{
const $=id=>document.getElementById(id);
const dateInput=$('reportDate');
const localDate=d=>{const dt=new Date(d);return Number.isFinite(dt.getTime())?dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'):''};
dateInput.value=localDate(Date.now());
const timeOf=v=>{if(typeof v==='number'&&v>1000000000000)return v;if(typeof v==='string'&&v){const n=Date.parse(v);return Number.isFinite(n)?n:null}return null};
const clock=t=>t?new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—';
const minutes=ms=>ms===null?'—':Math.round(ms/60000)+' min';
const safe=(v)=>String(v??'');
const csvEscape=v=>'"'+safe(v).replace(/"/g,'""')+'"';
function data(){
 const q=window.qlQueueSnapshot?.()||{waiting:[],history:[],skipped:[]};
 const rows=[...(q.waiting||[]).map(t=>({...t,status:'Waiting'})),...(q.serving?[{...q.serving,status:'Serving'}]:[]),...(q.history||[]).map(t=>({...t,status:'Completed'})),...(q.skipped||[]).map(t=>({...t,status:'Skipped'}))];
 return rows.map(t=>{
 const arrived=timeOf(t.joinedAt)||timeOf(t.createdAt)||timeOf(t.date);
 const called=timeOf(t.calledAt),completed=timeOf(t.completedAtMs)||timeOf(t.completedAt);
 const skipped=timeOf(t.skippedAtMs);
 const day=localDate(arrived||called||completed||skipped);
 return {...t,arrived,called,completed,skipped,day,waitMs:arrived&&called&&called>=arrived?called-arrived:null,serviceMs:called&&completed&&completed>=called?completed-called:null};
 }).filter(t=>t.day===dateInput.value&&!t.example);
}
function build(){
 const rows=data();
 $('reportVolume').textContent=rows.length;
 const average=key=>{const values=rows.map(t=>t[key]).filter(v=>v!==null);return values.length?minutes(values.reduce((a,b)=>a+b,0)/values.length):'—'};
 $('reportWait').textContent=average('waitMs');
 $('reportService').textContent=average('serviceMs');
 $('reportCompleted').textContent=rows.filter(t=>t.status==='Completed').length;
 $('reportSkipped').textContent=rows.filter(t=>t.status==='Skipped').length;
 const hours=Array(24).fill(0);rows.forEach(t=>{if(t.arrived)hours[new Date(t.arrived).getHours()]++});
 const peak=Math.max(...hours);$('reportPeak').textContent=peak?clock(new Date(dateInput.value+'T'+String(hours.indexOf(peak)).padStart(2,'0')+':00:00').getTime()):'—';
 const bars=$('reportHourly');bars.replaceChildren();
 for(let h=0;h<24;h++){const wrap=document.createElement('div');wrap.className='report-bar-column';wrap.title=h+':00 — '+hours[h]+' arrivals';const bar=document.createElement('div');bar.className='report-bar';bar.style.height=(peak?Math.max(3,hours[h]/peak*100):3)+'%';const label=document.createElement('small');label.textContent=h%3===0?String(h).padStart(2,'0'):'';wrap.append(bar,label);bars.append(wrap)}
 const outcomes=$('reportOutcomes');outcomes.replaceChildren();
 for(const status of ['Waiting','Serving','Completed','Skipped']){const count=rows.filter(t=>t.status===status).length;const item=document.createElement('div');item.className='report-outcome-row';const label=document.createElement('span');label.textContent=status;const track=document.createElement('div');track.className='report-track';const fill=document.createElement('div');fill.className='report-fill';fill.style.width=(rows.length?count/rows.length*100:0)+'%';track.append(fill);const value=document.createElement('strong');value.textContent=count;item.append(label,track,value);outcomes.append(item)}
 const tbody=$('reportRows');tbody.replaceChildren();
 rows.forEach(t=>{const tr=document.createElement('tr');[t.number||'—',t.department||'—',clock(t.arrived),minutes(t.waitMs),minutes(t.serviceMs),t.status].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});tbody.append(tr)});
 $('reportEmpty').hidden=rows.length!==0;
}
window.qlRenderReports=build;
dateInput.addEventListener('change',build);
$('reportExport').addEventListener('click',()=>{
 const rows=data();
 const head=['Token','Patient','Department','Arrival','Waiting minutes','Service minutes','Status'];
 const body=rows.map(t=>[t.number,t.name,t.department,t.arrived?new Date(t.arrived).toLocaleString():'',t.waitMs===null?'':(t.waitMs/60000).toFixed(1),t.serviceMs===null?'':(t.serviceMs/60000).toFixed(1),t.status]);
 const csv=[head,...body].map(row=>row.map(csvEscape).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='queueless-report-'+

dateInput.value+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
build();
})();
