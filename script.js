
/* Queueless — front-end prototype. No server authentication or shared database. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const on = (id, type, handler) => $(id)?.addEventListener(type, handler);
  const put = (id, value) => { if ($(id)) $(id).textContent = String(value ?? ''); };
  const show = (id, visible) => $(id)?.classList.toggle('hidden', !visible);
  const read = (store, key, fallback) => { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } };
  const QUEUE_KEY = 'queueless_shared_queue_v1';
  const REGISTRY_KEY = 'queueless_department_token_registry_v1';
  const prefixes = { 'Cardiology':'CARDIO', 'Orthopedics':'ORTHO', 'Neurology':'NEURO', 'Pediatrics':'PEDIA', 'General Medicine':'GEN', 'Ophthalmology':'OPHTH', 'Dentistry':'DENT', 'Dermatology':'DERMA' };
  const today = () => { const d = new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  const seed = () => ({
    waiting: Array.from({length:5}, (_,i) => ({ number:'QL-'+String(19+i).padStart(3,'0'), name:'Patient '+(i+1), department:'General Medicine', example:true })),
    serving:{number:'QL-018',name:'Patient',department:'General Medicine',example:true},
    completed:0, history:[], skipped:[]
  });
  const getQueue = () => { const q = read(localStorage, QUEUE_KEY, null); if(q && Array.isArray(q.waiting)) return {...q,history:q.history||[],skipped:q.skipped||[]}; const initial=seed(); localStorage.setItem(QUEUE_KEY,JSON.stringify(initial)); return initial; };
  const saveQueue = q => { localStorage.setItem(QUEUE_KEY,JSON.stringify(q)); renderAll(); };
  const currentKey = () => sessionStorage.getItem('ql_current_profile');
  const tokenKey = () => currentKey() ? 'ql_tokens_'+currentKey() : null;
  const savedTokens = () => tokenKey() ? read(localStorage,tokenKey(),[]) : [];
  const currentToken = () => read(sessionStorage,'queuelessToken',null);
  const saveCurrentToken = t => { sessionStorage.setItem('queuelessToken',JSON.stringify(t)); };
  const setMessage = (id, message) => put(id,message);
  const scroll = id => $(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  const sidebarSync = () => { const side=$('patientDashboard'); if(!side)return; const collapsed=side.classList.contains('sidebar-collapsed'); const b=$('sidebarToggle'); if(b){b.setAttribute('aria-expanded',String(!collapsed));b.setAttribute('aria-label',collapsed?'Open navigation':'Close navigation');b.textContent=collapsed?'☰':'✕';} };

  window.qlQueueSnapshot = getQueue;
  window.qlGenerateUniqueToken = (department, visitDate) => {
    const prefix=prefixes[department] || String(department||'QUEUE').replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,8);
    const date=visitDate||today(); const key=date+'|'+prefix;
    const registry=read(localStorage,REGISTRY_KEY,{});
    const issued=new Set(Array.isArray(registry[key])?registry[key]:[]);
    const q=getQueue();
    const all=[...q.waiting,...(q.serving?[q.serving]:[]),...q.history,...q.skipped];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k?.startsWith('ql_tokens_')) all.push(...read(localStorage,k,[]));
    }
    for(const t of all) if(t.number?.startsWith(prefix+'-') && (!t.date||t.date===date)) issued.add(t.number);
    const available=[];
    for(let i=1;i<=999;i++){const n=prefix+'-'+String(i).padStart(3,'0');if(!issued.has(n))available.push(n);}
    if(!available.length) throw new Error('No available token numbers for this department and date.');
    const random=new Uint32Array(1); crypto.getRandomValues(random);
    const number=available[random[0]%available.length];
    issued.add(number); registry[key]=[...issued]; localStorage.setItem(REGISTRY_KEY,JSON.stringify(registry));
    return number;
  };
  window.qlStoreBookedToken = t => {
    const k=tokenKey(); if(!k)return;
    const tokens=savedTokens().filter(x=>x.number!==t.number); tokens.unshift(t);
    localStorage.setItem(k,JSON.stringify(tokens.slice(0,50)));
    window.qlRenderTokens();
  };
  window.qlAddToQueue = t => {
    const q=getQueue();
    if(![...q.waiting,...(q.serving?[q.serving]:[]),...q.history,...q.skipped].some(x=>x.number===t.number)){
      q.waiting.push({...t,joinedAt:Date.now(),createdAt:Date.now()}); saveQueue(q);
    }
  };

  let mode='login';
  const switchMode = next => {
    mode=next;
    $('loginTab')?.classList.toggle('active',mode==='login');
    $('signupTab')?.classList.toggle('active',mode==='signup');
    $('nameField')?.classList.toggle('hidden',mode!=='signup');
    if($('patientName'))$('patientName').required=mode==='signup';
    put('accountSubmit',mode==='signup'?'Sign Up':'Login');put('accountFeedback','');
  };
  const openLogin = (signup=false) => {
    switchMode(signup?'signup':'login');
    $('login')?.classList.add('modal-open');$('login')?.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-visible');setTimeout(()=>$('accountEmail')?.focus(),100);
  };
  const closeLogin = () => {
    $('login')?.classList.remove('modal-open');$('login')?.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-visible');
  };
  on('loginTab','click',()=>switchMode('login'));
  on('signupTab','click',()=>switchMode('signup'));
  document.querySelectorAll('a[href="#login"],a[href="#signup"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openLogin(a.getAttribute('href')==='#signup');}));
  on('closeLogin','click',closeLogin);
  on('login','click',e=>{if(e.target===$('login'))closeLogin();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLogin();});
  const restoreToken = () => {
    const t=currentToken();if(!t)return;
    put('tokenNumber',t.number);put('receiptName',t.name);put('receiptTime',t.time);
    put('receiptDate',t.date);put('receiptDepartment',t.department);
    show('tokenResult',true);put('dashboardStatus','Token '+t.number+' for '+t.department);
    setJoinState(!!t.joined,t.number);
  };
  on('accountForm','submit',e=>{
    e.preventDefault();
    const email=$('accountEmail')?.value.trim().toLowerCase()||'';
    const name=$('patientName')?.value.trim()||'';
    const role=$('accountRole')?.value||'patient';
    if(!email){put('accountFeedback','Enter your email.');return;}
    if(mode==='signup'&&!name){put('accountFeedback','Enter your name.');return;}
    if(role==='patient'){
      const key='ql_profile_'+email;
      const existing=read(localStorage,key,{});
      const profile={...existing,name:mode==='signup'?name:(existing.name||name||email.split('@')[0]),email};
      localStorage.setItem(key,JSON.stringify(profile));
      sessionStorage.setItem('ql_current_profile',key);
      localStorage.setItem('ql_last_profile',key);
      put('dashboardGreeting','Welcome, '+profile.name+'!');
      if($('tokenPatient'))$('tokenPatient').value=profile.name;
      closeLogin();document.body.classList.remove('staff-active');document.body.classList.add('dashboard-active');
      $('patientDashboard')?.classList.remove('sidebar-collapsed');sidebarSync();
      location.hash='dashboard';window.scrollTo(0,0);
      window.qlRenderProfile();restoreToken();
    } else if(role==='staff'||role==='admin'){
      closeLogin();document.body.classList.remove('dashboard-active');document.body.classList.add('staff-active');
      window.qlSetStaffRole(role);window.qlStaffRender();location.hash='staff';window.scrollTo(0,0);
    }
  });

  const setJoinState=(joined,number)=>{
    const btn=$('joinQueueButton');if(btn){btn.disabled=!number||joined;btn.textContent=joined?'✓ Joined Queue':number?'Join Queue Now →':'Book a Token First';}
    put('joinQueueStatus',joined?'You are in the waiting line':number?'Token ready — join when you are ready':'Not joined yet');
    if(joined) updateQueue(number);
    else {put('nowServing','—');put('queuePosition',number||'—');put('peopleAhead','—');put('waitTime','—');if($('queueProgress'))$('queueProgress').style.width='0%';$('queueLine')?.replaceChildren();put('queueMessage',number?'Your token is booked. Select Join Queue to enter the waiting line.':'Book a token to see your queue details.');}
  };
  const updateQueue=number=>{
    const q=getQueue();const pos=q.waiting.findIndex(x=>x.number===number);const serving=q.serving?.number===number;
    put('nowServing',q.serving?.number||'—');put('queuePosition',number);
    put('peopleAhead',serving?'0':pos<0?'—':pos);put('waitTime',serving?'Now':pos<0?'—':pos*5+' min');
    if($('queueProgress'))$('queueProgress').style.width=serving?'100%':pos<0?'0%':Math.max(8,100/(pos+2))+'%';
    put('queueMessage',serving?'Your token is being served.':pos<0?'Your token is not currently in the waiting queue.':pos+' patient(s) ahead of you.');
    const line=$('queueLine');if(line){line.replaceChildren();q.waiting.slice(0,12).forEach(x=>{const c=document.createElement('div');c.className='queue-person'+(x.number===number?' mine':'');const b=document.createElement('strong');b.textContent=x.number;const s=document.createElement('span');s.textContent=x.number===number?'You':'Waiting';c.append(b,s);line.append(c);});}
  };
  on('joinQueueButton','click',()=>{
    const t=currentToken();if(!t||t.joined)return;
    t.joined=true;saveCurrentToken(t);window.qlStoreBookedToken(t);window.qlAddToQueue(t);setJoinState(true,t.number);scroll('queue');
  });
  if($('tokenDate'))$('tokenDate').min=today();
  on('tokenForm','submit',e=>{
    e.preventDefault();const name=$('tokenPatient')?.value.trim();const date=$('tokenDate')?.value;
    if(!name||!date||date<today()){alert('Enter a name and valid visit date.');return;}
    const department=$('tokenDepartment')?.value||'General Medicine';
    let number;try{number=window.qlGenerateUniqueToken(department,date);}catch(err){alert(err.message);return;}
    const t={number,name,time:$('tokenTime')?.value||'',date,department,joined:false};
    saveCurrentToken(t);window.qlStoreBookedToken(t);restoreToken();setJoinState(false,number);scroll('tokenResult');
  });
  on('dashboardBookNow','click',()=>scroll('tokens'));
  on('tileJoinQueue','click',()=>scroll('joinQueue'));
  on('tileBook','click',()=>scroll('tokens'));
  on('tileDepartments','click',()=>{scroll('tokens');$('tokenDepartment')?.focus({preventScroll:true});});
  on('tileMyToken','click',()=>scroll($('tokenResult')?.classList.contains('hidden')?'tokens':'tokenResult'));
  on('sidebarToggle','click',()=>{$('patientDashboard')?.classList.toggle('sidebar-collapsed');sidebarSync();});
  on('sidebarBackdrop','click',()=>{$('patientDashboard')?.classList.add('sidebar-collapsed');sidebarSync();});
  document.querySelectorAll('[data-dash-target]').forEach(link=>link.addEventListener('click',e=>{
    e.preventDefault();document.querySelectorAll('[data-dash-target]').forEach(x=>x.classList.remove('active'));
    link.classList.add('active');scroll(link.dataset.dashTarget);
    if(window.matchMedia('(max-width:950px)').matches){$('patientDashboard')?.classList.add('sidebar-collapsed');sidebarSync();}
  }));
  on('printToken','click',()=>window.print());
  on('logoutButton','click',()=>{
    document.body.classList.remove('dashboard-active');$('patientDashboard')?.classList.add('sidebar-collapsed');sidebarSync();
    $('accountForm')?.reset();$('tokenForm')?.reset();show('tokenResult',false);put('dashboardStatus','No token booked yet.');
    setJoinState(false,null);sessionStorage.removeItem('queuelessToken');sessionStorage.removeItem('ql_current_profile');
    location.hash='home';window.scrollTo(0,0);
  });

  function renderStaff(){
    const q=getQueue();
    put('staffWaiting',q.waiting.length);put('staffServing',q.serving?.number||'—');put('staffNow',q.serving?.number||'—');
    put('staffNext',q.waiting[0]?.number||'—');put('staffCompleted',q.completed||0);
    put('staffTotal',q.waiting.length+(q.serving?1:0)+(q.completed||0));put('staffEta',q.waiting.length*5+' min');
    for(const [id,disabled] of [['staffCall',!q.waiting.length||!!q.serving],['staffComplete',!q.serving],['staffSkip',!q.serving]])if($(id))$(id).disabled=disabled;
    const search=$('staffSearch')?.value.trim().toLowerCase()||'';const dept=$('staffDepartment')?.value||'';
    const filtered=q.waiting.map((t,i)=>({t,i})).filter(({t})=>(!dept||t.department===dept)&&(!search||[t.name,t.number,t.department].some(v=>String(v||'').toLowerCase().includes(search))));
    const rows=$('staffRows');if(rows){rows.replaceChildren();filtered.forEach(({t,i})=>{
      const tr=document.createElement('tr');[i+1,t.number,t.name||'Patient',t.department||'—','Waiting'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});
      const td=document.createElement('td');const btn=document.createElement('button');btn.className='staff-row-action';btn.textContent='Call Patient';btn.onclick=()=>callPatient(t.number);td.append(btn);tr.append(td);rows.append(tr);
    });}if($('staffEmpty'))$('staffEmpty').hidden=filtered.length>0;
    const historyRows=$('staffHistoryRows');if(historyRows){historyRows.replaceChildren();q.history.slice(-15).reverse().forEach(t=>{const tr=document.createElement('tr');[t.number,t.name||'Patient',t.department||'—',t.completedAt||'—'].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});historyRows.append(tr);});}
    if($('staffHistoryEmpty'))$('staffHistoryEmpty').hidden=q.history.length>0;
    renderReports();const t=currentToken();if(t?.joined)updateQueue(t.number);
  }
  function callPatient(number){
    const q=getQueue();if(q.serving){put('staffNotice','Complete the current visit before calling another patient.');return;}
    const idx=q.waiting.findIndex(x=>x.number===number);if(idx<0)return;
    q.serving={...q.waiting.splice(idx,1)[0],calledAt:Date.now()};saveQueue(q);put('staffNotice','Called '+number);
  }
  on('staffCall','click',()=>{const q=getQueue();if(q.waiting.length)callPatient(q.waiting[0].number);});
  on('staffComplete','click',()=>{
    const q=getQueue();if(!q.serving)return;const t=q.serving;
    q.history.push({...t,completedAt:new Date().toLocaleString(),completedAtMs:Date.now()});q.completed=(q.completed||0)+1;q.serving=null;
    saveQueue(q);put('staffNotice','Completed '+t.number);
  });
  on('staffSkip','click',()=>{
    const q=getQueue();if(!q.serving)return;const t=q.serving;q.skipped.push({...t,skippedAtMs:Date.now()});q.serving=null;saveQueue(q);put('staffNotice','Skipped '+t.number);
  });
  on('staffSearch','input',renderStaff);on('staffDepartment','change',renderStaff);
  on('staffExport','click',()=>{
    const q=getQueue();const data=[['Position','Token','Patient','Department','Status'],...q.waiting.map((t,i)=>[i+1,t.number,t.name||'',t.department||'','Waiting'])];
    const csv=data.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='queueless-queue.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  on('staffLogout','click',()=>{document.body.classList.remove('staff-active');location.hash='home';window.scrollTo(0,0);});
  on('staffMenu','click',()=>$('staffSidebar')?.classList.toggle('closed'));
  document.querySelectorAll('[data-staff-go]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-staff-go]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');scroll(b.dataset.staffGo);
    if(innerWidth<=850)$('staffSidebar')?.classList.add('closed');
  }));
  window.qlStaffRender=renderStaff;
  window.qlQueueSave=saveQueue;
  window.qlSetStaffRole=role=>{document.body.dataset.staffRole=role;};

  window.qlRenderTokens=()=>{
    const root=$('profileTokenList');if(!root)return;root.replaceChildren();
    const tokens=savedTokens();const current=currentToken();if(current&&!tokens.some(t=>t.number===current.number))tokens.unshift(current);
    put('profileTokenCount',tokens.length+' token'+(tokens.length===1?'':'s'));
    if(!tokens.length){const p=document.createElement('p');p.textContent='No tokens booked yet. Book a token from your dashboard to see it here.';root.append(p);return;}
    const q=getQueue();tokens.forEach(t=>{
      const card=document.createElement('article');card.className='profile-token-card';
      const title=document.createElement('div');title.className='profile-token-title';
      const number=document.createElement('strong');number.textContent=t.number;
      const status=document.createElement('span');status.className='profile-token-status';
      status.textContent=q.serving?.number===t.number?'Now Serving':q.waiting.some(x=>x.number===t.number)?'Waiting':q.history.some(x=>x.number===t.number)?'Completed':q.skipped.some(x=>x.number===t.number)?'Skipped':'Booked';
      title.append(number,status);const detail=document.createElement('p');detail.textContent=[t.department,t.date,t.time].filter(Boolean).join(' • ');card.append(title,detail);root.append(card);
    });
  };
  window.qlRenderProfile=()=>{
    const key=currentKey();const profile=key?read(localStorage,key,{}):{};
    const name=profile.name||'Patient';const email=profile.email||'';
    ['profileName','userProfileName','patientProfileName'].forEach(id=>put(id,name));
    ['profileEmail','userProfileEmail'].forEach(id=>put(id,email));
    ['profileAvatar','navAvatar'].forEach(id=>{const el=$(id);if(el&&!el.querySelector('img'))el.textContent=name.charAt(0).toUpperCase();});
    window.qlRenderTokens();
  };
  function renderReports(){
    const q=getQueue();const todayDate=today();
    const all=[...q.waiting,...(q.serving?[q.serving]:[]),...q.history,...q.skipped];
    const daily=all.filter(t=>t.date===todayDate||(!t.date&&t.example)).length;
    const waits=q.history.filter(t=>t.calledAt&&t.joinedAt).map(t=>(t.calledAt-t.joinedAt)/60000);
    const services=q.history.filter(t=>t.completedAtMs&&t.calledAt).map(t=>(t.completedAtMs-t.calledAt)/60000);
    const avg=xs=>xs.length?(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1)+' min':'—';
    const values={reportDailyVolume:daily,reportAverageWait:avg(waits),reportAvgWait:avg(waits),reportServiceTime:avg(services),reportCompleted:q.history.length,reportSkipped:q.skipped.length,reportPeakHours:'—'};
    Object.entries(values).forEach(([id,value])=>put(id,value));
  }
  window.qlRenderReports=renderReports;
  function renderAll(){renderStaff();window.qlRenderTokens();}
  window.addEventListener('storage',e=>{if(e.key===QUEUE_KEY||e.key===REGISTRY_KEY)renderAll();});
  sidebarSync();renderAll();
  if(currentKey())window.qlRenderProfile();
  // The page opens at home; login selects the patient or staff dashboard.
})();
