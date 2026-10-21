/* Portal core: localStorage store (wa_demo_v1), seed data, session, directory rules, plan limits, UI helpers (dialogs, tables, messenger).
   Everything runs in this browser; nothing is sent over the network. Seed people and firms are fictional. */
(function(){
"use strict";
var CFG=window.WA_CFG,D=window.PF_DATA,EN=window.PFEngine;if(!CFG)return;
var KEY='wa_demo_v1',SKEY='wa_session_v1',WKEY='pf_wizard_v1',DAY=864e5;
var W={cfg:CFG};window.WA=W;
/* ---------- utils ---------- */
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return (n<10?'0':'')+n;}
function iso(d){d=new Date(d);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function today(){return iso(Date.now());}
function fmtDate(d){if(!d)return '';var x=new Date(typeof d==='string'&&d.length===10?d+'T12:00:00':d);return x.toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});}
function fmtTime(ts){var d=new Date(ts),n=new Date();if(iso(d)===iso(n))return d.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'});return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'});}
function money(n){return CFG.currency+' '+Number(n).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});}
function hash(s){var h=2166136261;s='wa:'+s;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return ('0000000'+(h>>>0).toString(16)).slice(-8);}
function uid(p){return p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function cname(id){var c=CFG.countries.find(function(x){return x[0]===id;});return c?c[1]:id;}
function plan(id){return CFG.plans.find(function(p){return p.id===id;})||CFG.plans[0];}
function initials(n){var p=String(n||'?').replace(/&/g,' ').split(/\s+/).filter(Boolean);return ((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();}
Object.assign(W,{esc:esc,iso:iso,today:today,fmtDate:fmtDate,fmtTime:fmtTime,money:money,hash:hash,uid:uid,cname:cname,plan:plan,initials:initials,DAY:DAY});
/* ---------- store ---------- */
var S=null;
function load(){try{S=JSON.parse(localStorage.getItem(KEY));}catch(e){S=null;}if(!S||S.v!==1){S=seed();save();}return S;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){W.toast&&W.toast('Storage is full. Try a smaller upload.');}}
W.db=function(){return S||load();};W.save=save;
W.reset=function(){localStorage.removeItem(KEY);sessionStorage.removeItem(SKEY);S=null;load();};
W.user=function(id){return W.db().users.find(function(u){return u.id===id;});};
W.byRole=function(r){return W.db().users.filter(function(u){return u.role===r;});};
/* ---------- session ---------- */
W.session=function(){try{return JSON.parse(sessionStorage.getItem(SKEY)||'null');}catch(e){return null;}};
W.me=function(){var s=W.session();return s?W.user(s.id):null;};
W.login=function(email,pw){var u=W.db().users.find(function(x){return x.email.toLowerCase()===String(email).trim().toLowerCase();});
 if(!u||u.pw!==hash(pw))return null;sessionStorage.setItem(SKEY,JSON.stringify({id:u.id,role:u.role}));if(u.role==='applicant')W.mergeWizard(u);return u;};
W.logout=function(){sessionStorage.removeItem(SKEY);};
W.home=function(u){return {admin:'admin/dashboard.html',applicant:'app/dashboard.html',firm:'firm/dashboard.html'}[u.role];};
/* ---------- applicant answers and matches ---------- */
W.wizardState=function(){try{return JSON.parse(sessionStorage.getItem(WKEY)||'null');}catch(e){return null;}};
var MC={};
W.matches=function(u){if(!u||!u.eng||!EN||!D)return [];var k=u.id+':'+(u.ts||0);if(MC[k])return MC[k];
 var r=EN.scoreAll(D,u.eng).merged;MC[k]=r;return r;};
/* Pathway type of the applicant's best-ranked suggestion (no goal question any more). */
W.TL={work:'Work',study:'Study',family:'Family',invest:'Investment and business',retire:'Retirement',remote:'Remote work'};
W.topType=function(u){var m=W.matches(u)[0];return m?W.TL[m.type]:'';};
W.matchIds=function(u){return W.matches(u).map(function(r){return r.country;});};
W.mergeWizard=function(u){var st=W.wizardState();if(!st||!st.done||!st.eng)return false;if(u.ts&&st.ts&&st.ts<=u.ts)return false;
 u.eng=st.eng;u.raw=st.a;u.ts=st.ts||Date.now();var m=EN&&D?EN.scoreAll(D,st.eng).merged:[];
 (u.saved=u.saved||[]).unshift({ts:u.ts,type:m[0]?W.TL[m[0].type]:'',top:m.map(function(r){return {c:r.country,band:r.band};})});u.saved=u.saved.slice(0,10);save();return true;};
/* Called by wizard.js after results render: a signed-in applicant's profile follows their latest answers. */
window.WASync=function(){var u=W.me();if(u&&u.role==='applicant'){W.mergeWizard(u);}};
/* ---------- licences, directory, plans ---------- */
W.licState=function(l){if(l.status==='approved'&&l.expiry<today())return 'expired';return l.status;};
W.billing=function(f){var now=Date.now(),trial=now<f.trialEnds,paid=f.paidThrough&&now<f.paidThrough;return {trial:trial,active:trial||paid,paid:!!paid,renews:paid?f.paidThrough:f.trialEnds};};
W.listed=function(f){if(f.role!=='firm'||f.status!=='approved'||!W.billing(f).active)return [];
 var ok=(f.licences||[]).filter(function(l){return W.licState(l)==='approved';}).sort(function(a,b){return (a.reviewed||0)-(b.reviewed||0);});
 var cs=[];ok.forEach(function(l){if(cs.indexOf(l.country)<0)cs.push(l.country);});var n=plan(f.plan).countries;return n?cs.slice(0,n):cs;};
W.directory=function(country){return W.byRole('firm').filter(function(f){return W.listed(f).indexOf(country)>-1;})
 .sort(function(a,b){var fa=plan(a.plan).featured?1:0,fb=plan(b.plan).featured?1:0;return fb-fa||a.trade.localeCompare(b.trade);});};
W.licFor=function(f,c){return (f.licences||[]).find(function(l){return l.country===c&&W.licState(l)==='approved';});};
W.monthConvs=function(f){var d=new Date(),m0=new Date(d.getFullYear(),d.getMonth(),1).getTime();return W.db().convs.filter(function(c){return c.f===f.id&&c.created>=m0;}).length;};
W.canReceive=function(f){var lim=plan(f.plan).newConvPerMonth;return !lim||W.monthConvs(f)<lim;};
W.convs=function(pred){return W.db().convs.filter(pred).sort(function(a,b){return last(b).ts-last(a).ts;});};
function last(c){return c.msgs[c.msgs.length-1]||{ts:c.created,t:''};}W.last=last;
W.unread=function(u){var side=u.role==='applicant'?'a':'f';return W.db().convs.filter(function(c){return c[side]===u.id&&c.msgs.some(function(m){return m.by!==side&&m.ts>(c['r'+side]||0);});}).length;};
W.startConv=function(app,firm,country,text){if(W.listed(firm).indexOf(country)<0)return {err:'This firm is not listed for '+cname(country)+'.'};
 if(W.matchIds(app).indexOf(country)<0)return {err:cname(country)+' is not one of your matched countries.'};
 var ex=W.db().convs.find(function(c){return c.a===app.id&&c.f===firm.id&&c.country===country;});if(ex)return {conv:ex,existing:true};
 if(!W.canReceive(firm))return {err:firm.trade+' has reached its limit of new conversations for this month. Please choose another professional or try again next month.'};
 var now=Date.now(),c={id:uid('c'),a:app.id,f:firm.id,country:country,created:now,msgs:[{by:'a',t:text,ts:now}],ra:now,rf:0};W.db().convs.push(c);save();return {conv:c};};
W.send=function(conv,side,text){var now=Date.now();conv.msgs.push({by:side,t:text,ts:now});conv['r'+side]=now;save();};
/* ---------- seed (fictional) ---------- */
function seed(){
 var now=Date.now(),users=[],convs=[],apps0;var M=function(n){var d=new Date();d.setDate(1);d.setMonth(d.getMonth()-n);return d.getTime()+DAY*((n*7)%20+2);};
 users.push({id:'u-admin',role:'admin',email:'admin@example.com',pw:hash('Admin#2026'),name:'Jordan Ellery',created:M(12)});
 var base={invest:'no',passive_income:'none',langs:{french:'none',german:'none',japanese:'none'},job_offer:'no',family_tie:{type:'none'},prior:{type:'none'},exclude:[],priorities:[],decl:{},budget:'40k+',timeline:'1-2y',passport:[],passportCodes:[]};
 var T={work:{age:'25-32',education:'bachelor',recognised:'yes',occupation:'it',experience:'5-7',salary:'60-100k',english:'C1+',funds:'30-100k',priorities:['english_speaking','career','public_healthcare']},
  nurse:{age:'33-39',education:'bachelor',recognised:'in_progress',occupation:'healthcare',experience:'8+',salary:'40-60k',english:'B2',funds:'15-30k',priorities:['public_healthcare','safety','citizenship']},
  trade:{age:'25-32',education:'vocational',recognised:'yes',occupation:'trade',experience:'5-7',salary:'40-60k',english:'B2',funds:'15-30k',priorities:['nature','citizenship','safety']},
  study:{age:'18-24',education:'secondary',recognised:'dont_know',occupation:'other',experience:'0',english:'B2',funds:'30-100k',budget:'15-40k',priorities:['safety','english_speaking','career']},
  grad:{age:'25-32',education:'bachelor',recognised:'yes',occupation:'engineering',experience:'1-2',english:'C1+',funds:'30-100k',priorities:['career','big_city','citizenship']},
  retire:{age:'55+',education:'bachelor',recognised:'dont_know',occupation:'finance',experience:'8+',english:'C1+',funds:'270-500k',passive_income:'3.5-5.5k',priorities:['low_cost_of_living','public_healthcare','safety']},
  remote:{age:'33-39',education:'bachelor',recognised:'yes',occupation:'it',experience:'5-7',english:'C1+',funds:'30-100k',passive_income:'5.5k+',priorities:['low_cost_of_living','nature','big_city']},
  family:{age:'33-39',education:'bachelor',recognised:'dont_know',occupation:'teaching',experience:'5-7',english:'B2',funds:'15-30k',family_tie:{type:'spouse',country:'Canada'},priorities:['safety','public_healthcare','citizenship']},
  invest:{age:'40-54',education:'master',recognised:'yes',occupation:'finance',experience:'8+',english:'C1+',funds:'500k+',invest:'500k-1M',priorities:['low_tax','big_city','safety']}};
 var A=[['Maria Santos','maria.santos','work','Philippines','PH'],['Arjun Mehta','arjun.mehta','work','India','IN'],['Chen Wei','chen.wei','grad','China','CN'],['Fatima Oyelaran','fatima.oyelaran','nurse','Nigeria','NG'],
  ['Lucas Moreira','lucas.moreira','trade','Brazil','BR'],['Amira Haddad','amira.haddad','study','Lebanon','LB'],['Daniel Kowalczyk','daniel.kowalczyk','work','Poland','PL'],['Sofia Reyes','sofia.reyes','study','Mexico','MX'],
  ['Robert Hale','robert.hale','retire','United States','US'],['Grace Okafor','grace.okafor','nurse','Kenya','KE'],['Nguyen Thi Lan','nguyen.lan','study','Vietnam','VN'],['Omar Farouk','omar.farouk','invest','Egypt','EG'],
  ['Priya Raman','priya.raman','work','India','IN'],['Hannah Brooks','hannah.brooks','remote','United States','US'],['Kenji Watanabe','kenji.watanabe','grad','Japan','JP'],['Elena Petrova','elena.petrova','remote','Bulgaria','BG'],
  ['Joseph Mwangi','joseph.mwangi','trade','Kenya','KE'],['Aisha Rahman','aisha.rahman','family','Bangladesh','BD'],['Mateo Fernández','mateo.fernandez','work','Colombia','CO'],['Leila Karimi','leila.karimi','grad','Türkiye','TR'],
  ['Thomas Byrne','thomas.byrne','retire','United Kingdom','GB'],['Ana Lima','ana.lima','nurse','Brazil','BR'],['Rafael Cruz','rafael.cruz','work','Philippines','PH'],['Mei Tanaka','mei.tanaka','study','Japan','JP'],['Samuel Adeyemi','samuel.adeyemi','family','Nigeria','NG']];
 A.forEach(function(a,i){var e=Object.assign({},base,T[a[2]]);e.passport=[a[3]];e.passportCodes=[a[4]];var cr=M(11-(i%12))+i*3600e3;
  users.push({id:'a'+(i+1),role:'applicant',email:a[1]+'@example.com',pw:hash('Applicant#2026'),name:a[0],residence:a[3],created:cr,eng:e,raw:null,ts:cr,consent:cr,saved:[]});});
 function F(id,trade,legal,plan_,months,status,lics,extra){var cr=M(months),f={id:id,role:'firm',email:id.slice(2)+'@example.com',pw:hash('Firm#2026'),name:extra.contact,created:cr,trade:trade,legal:legal,
   address:extra.address,website:'https://'+id.slice(2)+'.example.com',contact:extra.contact,languages:extra.langs,logo:null,services:extra.services,fees:extra.fees,plan:plan_,status:status,
   trialEnds:cr+CFG.trialDays*DAY,paidThrough:null,invoices:[],staff:[{name:extra.contact,email:id.slice(2)+'@example.com'}],declared:cr,
   licences:lics.map(function(l,k){var rs=l[3]||'approved';return {id:id+'-l'+k,country:l[0],regulator:CFG.regs[l[0]].name,number:'EX-'+({UK:'GB',UnitedStates:'US',NewZealand:'NZ',UAE:'AE'}[l[0]]||l[0].slice(0,2).toUpperCase())+'-'+(100000+parseInt(hash(id+'#'+k),16)%900000),
     person:l[1],expiry:l[2],cert:{name:'licence-certificate.pdf',type:'application/pdf',data:null},registry:CFG.regs[l[0]].registry[1],status:rs,note:rs==='rejected'?'The member number did not match the official register.':(rs==='approved'?'Matched on the official register.':''),submitted:cr+DAY,reviewed:rs==='pending'?null:cr+3*DAY};})};
  if(status==='approved'){var p=plan(plan_).price,t=f.trialEnds;for(var d=t;d<now;){var dt=new Date(d);f.invoices.push({id:'INV-'+id.slice(2,6).toUpperCase()+'-'+dt.getFullYear()+pad(dt.getMonth()+1),date:d,amount:p,plan:plan_,status:'paid'});dt.setMonth(dt.getMonth()+1);d=dt.getTime();}
   if(f.invoices.length)f.paidThrough=(function(){var x=new Date(f.invoices[f.invoices.length-1].date);x.setMonth(x.getMonth()+1);return x.getTime();})();}
  users.push(f);return f;}
 var Y=new Date().getFullYear(),fut=function(m){var d=new Date();d.setMonth(d.getMonth()+m);return iso(d);};
 F('f-saffrongate','Saffron Gate Immigration Advisory','Saffron Gate Advisory Inc.','pro',10,'approved',[['Canada','Nadia Brennan',fut(14)],['UK','Owen Marsh',fut(9)]],{contact:'Nadia Brennan',address:'210 Example Street, Suite 400, Toronto, ON',langs:['English','French','Tagalog'],services:['work','study','family'],fees:'Free 20-minute first call. Fixed-fee packages are quoted in writing after the first call.'});
 F('f-tidewell','Tidewell Pathways','Tidewell Pathways Pty Ltd','agency',11,'approved',[['Australia','Liam Carver',fut(18)],['NewZealand','Aroha Prentice',fut(7)]],{contact:'Liam Carver',address:'12 Sample Lane, Brisbane, QLD',langs:['English','Hindi'],services:['work','study','family','investor'],fees:'Consultation fee credited against any engagement. Written quote before you commit.'});
 F('f-corvidlane','Corvid Lane Migration','Corvid Lane Migration Ltd.','starter',9,'approved',[['Canada','Priyanka Sood',fut(11)]],{contact:'Priyanka Sood',address:'88 Placeholder Ave, Vancouver, BC',langs:['English','Punjabi','Hindi'],services:['work','study'],fees:'Hourly consultations; fixed fees for study permit files.'});
 F('f-bluefinch','Bluefinch Relocation Counsel','Bluefinch Counsel LLP','starter',8,'approved',[['UK','Imogen Hart',fut(20)]],{contact:'Imogen Hart',address:'5 Example Row, Manchester',langs:['English','Polish'],services:['work','family','visit'],fees:'Initial assessment fee, then fixed fees per application.'});
 F('f-marrowstone','Marrowstone Visa Advisors','Marrowstone Legal PLLC','pro',7,'approved',[['UnitedStates','Dana Whitcombe',fut(16)]],{contact:'Dana Whitcombe',address:'400 Sample Blvd, Austin, TX',langs:['English','Spanish'],services:['work','family','investor'],fees:'Flat-fee consultations; engagement letters list all fees up front.'});
 F('f-kestrelbay','Kestrelbay Immigration Partners','Kestrelbay Partners GmbH','agency',6,'approved',[['Germany','Jonas Albrecht',fut(24)],['Netherlands','Fleur Janssen',fut(13)],['France','Camille Roux',fut(10)]],{contact:'Jonas Albrecht',address:'Beispielstraße 1, Berlin',langs:['English','German','Dutch','French'],services:['work','study','family'],fees:'Quotes in writing. Employer-paid packages available.'});
 F('f-halcyonridge','Halcyon Ridge Migration','Halcyon Ridge Lda.','pro',5,'approved',[['Portugal','Inês Carvalho',fut(15)],['Spain','Álvaro Ruiz',fut(12)]],{contact:'Inês Carvalho',address:'Rua Exemplo 10, Lisbon',langs:['English','Portuguese','Spanish'],services:['retire_remote','investor','family'],fees:'Fixed fees for D7, digital nomad and non-lucrative files.'});
 F('f-orielvane','Oriel & Vane Counsel','Oriel & Vane Solicitors','starter',9,'approved',[['Ireland','Ciarán Doyle',iso(now-20*DAY)]],{contact:'Ciarán Doyle',address:'3 Sample Quay, Dublin',langs:['English','Irish'],services:['work','family'],fees:'Hourly rates on request.'});
 F('f-thistledown','Thistledown Migration Services','Thistledown Migration Ltd','starter',0,'pending',[['NewZealand','Mere Lawson',fut(22),'pending']],{contact:'Mere Lawson',address:'7 Example Tce, Wellington',langs:['English','Māori'],services:['work','family'],fees:'Free first call.'});
 F('f-copperleaf','Copperleaf Global Mobility','Copperleaf Mobility FZ-LLC','pro',0,'pending',[['UAE','Rami Aziz',fut(12),'pending'],['Singapore','Wen Hui Lim',fut(10),'pending']],{contact:'Rami Aziz',address:'Example Tower, Level 9, Dubai',langs:['English','Arabic','Mandarin'],services:['work','investor','retire_remote'],fees:'Corporate and individual packages.'});
 F('f-windrose','Windrose Meridian Advisory','Windrose Meridian KK','pro',4,'approved',[['Japan','Haruka Mori',fut(19)],['Canada','Haruka Mori',fut(19),'rejected']],{contact:'Haruka Mori',address:'1-2-3 Sample, Minato-ku, Tokyo',langs:['English','Japanese'],services:['work','study'],fees:'Fixed fees per visa category.'});
 F('f-larkspur','Larkspur & Finch Legal','Larkspur & Finch LLP','starter',0,'pending',[['Canada','Theo Larkin',fut(17),'pending']],{contact:'Theo Larkin',address:'55 Example Rd, Calgary, AB',langs:['English'],services:['work','family','visit'],fees:'Hourly consultations.'});
 S={v:1,users:users,convs:convs,created:now};
 apps0=users.filter(function(u){return u.role==='applicant';});apps0.forEach(function(a){var m=W.matches(a);a.saved=[{ts:a.ts,type:W.topType(a),top:m.map(function(r){return {c:r.country,band:r.band};})}];});
 /* conversations: only with countries the applicant matched and the firm is listed for */
 var apps=users.filter(function(u){return u.role==='applicant';}),firms=users.filter(function(u){return u.role==='firm';});
 var L=['Hello, I matched with {c} and would like to understand my options. Are you able to help?','Thank you for reaching out. We can book a first call to look at your situation. What dates suit you?','Next Tuesday afternoon works for me.','Booked. You will receive a written quote before any work begins.'];
 var k=0;firms.forEach(function(f){var cs=W.listed(f);cs.forEach(function(c){var target=f.id==='f-corvidlane'?10:3,n=0;
  apps.forEach(function(a){if(n>=target)return;if(W.matchIds(a).indexOf(c)<0)return;n++;k++;
   var t0=f.id==='f-corvidlane'?now-DAY*(n%Math.max(1,new Date().getDate()))-3600e3*n:now-DAY*(3+(k*5)%80);if(t0<f.created)t0=f.created+DAY;
   var len=1+(k%4),msgs=[];for(var j=0;j<len;j++)msgs.push({by:j%2?'f':'a',t:L[j].replace('{c}',cname(c)),ts:t0+j*3600e3*(j+1)});
   convs.push({id:'c'+k,a:a.id,f:f.id,country:c,created:t0,msgs:msgs,ra:t0+len*3600e3*len,rf:j%2?t0:t0+len*3600e3*len});});});});
 return S;}
/* ---------- UI helpers ---------- */
var lastFocus=null;
W.dialog=function(html,opts){opts=opts||{};var back=document.createElement('div');back.className='modal-back';
 back.innerHTML='<div class="modal'+(opts.wide?' wide':'')+'" role="dialog" aria-modal="true" aria-labelledby="dlgT"><button class="dialog-x" type="button" data-x aria-label="Close">×</button>'+html+'</div>';
 lastFocus=document.activeElement;document.body.appendChild(back);document.body.style.overflow='hidden';
 function close(){back.remove();document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus();if(opts.onClose)opts.onClose();}
 back.addEventListener('click',function(e){if(e.target===back||e.target.closest('[data-x]'))close();});
 back.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){var f=[].slice.call(back.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea')).filter(function(x){return x.offsetParent!==null;});if(!f.length)return;
   if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}}});
 var m=back.querySelector('.modal'),af=m.querySelector('[data-autofocus]')||m.querySelector('h2');if(af){if(af.tagName==='H2')af.tabIndex=-1;af.focus();}
 if(opts.onOpen)opts.onOpen(m,close);return {el:m,close:close};};
W.toast=function(t){var el=document.getElementById('waToast');if(!el){el=document.createElement('div');el.id='waToast';el.className='wa-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);}
 el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('on');},3200);};
W.badge=function(st){var m={approved:['','Approved'],pending:['outline','Pending review'],rejected:['destructive','Rejected'],expired:['destructive','Expired'],active:['','Active'],trial:['secondary','Trial'],paid:['','Paid'],past_due:['destructive','Payment due']};var x=m[st]||['outline',st];return '<span class="s-badge '+x[0]+'">'+esc(x[1])+'</span>';};
W.bandLabel={strong:'Worth exploring',possible:'Possibly worth exploring',explore:'Worth exploring after a few steps',low:'Low fit, talk to a consultant'};
W.logo=function(f,cls){return f.logo?'<img class="'+(cls||'f-logo')+'" src="'+esc(f.logo)+'" alt="" width="44" height="44">':'<span class="'+(cls||'f-logo')+' mono" aria-hidden="true">'+esc(initials(f.trade))+'</span>';};
/* Paginated, searchable, filterable table (10 per page). cols:[{h,v:fn(row)->html,label}] */
W.table=function(el,o){var pg=0,q='',fv={};o.size=o.size||10;
 el.innerHTML='<div class="tbl-tools"><label class="sr-only" for="'+o.id+'Q">Search</label><input class="s-input" id="'+o.id+'Q" type="search" placeholder="'+esc(o.placeholder||'Search')+'">'
  +(o.filters||[]).map(function(f,i){return '<label class="sr-only" for="'+o.id+'F'+i+'">'+esc(f.label)+'</label><select class="s-input" id="'+o.id+'F'+i+'" data-f="'+i+'"><option value="">'+esc(f.label)+': all</option>'+f.options.map(function(x){return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>';}).join('')+'</select>';}).join('')
  +'</div><div class="s-table-wrap"><table class="s-table stack"><caption class="sr-only">'+esc(o.caption)+'</caption><thead><tr>'+o.cols.map(function(c){return '<th scope="col"'+(c.num?' class="num"':'')+'>'+esc(c.h)+'</th>';}).join('')+'</tr></thead><tbody></tbody></table></div>'
  +'<div class="pager-row"><p class="muted" role="status"></p><nav class="s-pagination" aria-label="'+esc(o.caption)+' pages"></nav></div>';
 var tb=el.querySelector('tbody'),info=el.querySelector('[role=status]'),nav=el.querySelector('nav');
 function rows(){var r=o.rows();if(q)r=r.filter(function(x){return o.search(x).toLowerCase().indexOf(q)>-1;});(o.filters||[]).forEach(function(f,i){if(fv[i])r=r.filter(function(x){return f.test(x,fv[i]);});});return r;}
 function draw(){var r=rows(),n=Math.max(1,Math.ceil(r.length/o.size));if(pg>=n)pg=n-1;var s=r.slice(pg*o.size,pg*o.size+o.size);
  tb.innerHTML=s.length?s.map(function(x,i){return '<tr'+(o.onRow?' class="row-link" tabindex="0" data-i="'+(pg*o.size+i)+'"':'')+'>'+o.cols.map(function(c){return '<td data-label="'+esc(c.h)+'"'+(c.num?' class="num"':'')+'>'+c.v(x)+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+o.cols.length+'">'+esc(o.empty||'No results.')+'</td></tr>';
  info.textContent=r.length?('Showing '+(pg*o.size+1)+'–'+(pg*o.size+s.length)+' of '+r.length):'No results';
  nav.hidden=n<2;var b='<button class="s-btn outline" type="button" data-p="'+(pg-1)+'"'+(pg?'':' disabled')+'>Previous</button>';
  for(var i=0;i<n;i++)b+='<button class="s-btn '+(i===pg?'':'outline ')+'pg-num" type="button" data-p="'+i+'"'+(i===pg?' aria-current="page"':'')+' aria-label="Page '+(i+1)+'">'+(i+1)+'</button>';
  nav.innerHTML=b+'<button class="s-btn outline" type="button" data-p="'+(pg+1)+'"'+(pg<n-1?'':' disabled')+'>Next</button>';
  if(o.onRow)tb.querySelectorAll('tr[data-i]').forEach(function(tr){function go(){o.onRow(r[+tr.dataset.i]);}tr.addEventListener('click',function(e){if(!e.target.closest('a,button'))go();});tr.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});}
 el.querySelector('input').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();pg=0;draw();});
 el.querySelectorAll('select[data-f]').forEach(function(s){s.addEventListener('change',function(){fv[s.dataset.f]=s.value;pg=0;draw();});});
 nav.addEventListener('click',function(e){var b=e.target.closest('[data-p]');if(!b||b.disabled)return;pg=+b.dataset.p;draw();nav.querySelector('[aria-current]').focus();});
 draw();return {redraw:draw};};
/* Messenger (Messenger-style two-pane chat). o:{el, side:'a'|'f'|null(read-only audit), list:fn->convs, title:fn(c), sub:fn(c), header:fn(c)->extra html, onChange} */
var SEND='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>';
W.messenger=function(o){var cur=o.open||null,q='',el=o.el;
 el.innerHTML='<div class="msgr"><div class="msgr-list">'+(o.top||'')+'<div class="msgr-search"><label class="sr-only" for="mSearch">Search conversations</label><input id="mSearch" type="search" placeholder="Search conversations"></div><ul class="conv-list" aria-label="Conversations"></ul></div><section class="msgr-thread" aria-label="Conversation"><div class="thread-head"></div><div class="chat-log" tabindex="0" role="log" aria-live="polite" aria-label="Messages"></div>'
  +(o.side?'<form class="chat-composer" hidden><label class="sr-only" for="mText">Write a message</label><textarea id="mText" rows="1" maxlength="2000" placeholder="Write a message"></textarea><button class="chat-send" type="submit" aria-label="Send message">'+SEND+'</button></form>':'<p class="chat-ro muted" hidden>Read-only audit view. Messages cannot be sent from here.</p>')+'</section></div>';
 var root=el.querySelector('.msgr'),ul=el.querySelector('.conv-list'),head=el.querySelector('.thread-head'),log=el.querySelector('.chat-log'),form=el.querySelector('.chat-composer'),ro=el.querySelector('.chat-ro');
 function list(){var c=o.list();if(q)c=c.filter(function(x){return (o.title(x)+' '+o.sub(x)).toLowerCase().indexOf(q)>-1;});return c;}
 function drawList(){var c=list();ul.innerHTML=c.length?c.map(function(x){var l=W.last(x),un=o.side&&x.msgs.some(function(m){return m.by!==o.side&&m.ts>(x['r'+o.side]||0);});
  return '<li><button type="button" class="conv'+(x.id===cur?' active':'')+(un?' has-unread':'')+'" data-c="'+x.id+'"'+(x.id===cur?' aria-current="true"':'')+'><span class="avatar" aria-hidden="true">'+esc(initials(o.title(x)))+'</span><span class="conv-body"><span class="conv-top"><span class="conv-name">'+esc(o.title(x))+'</span><span class="conv-time">'+esc(fmtTime(l.ts))+'</span></span><span class="conv-prev">'+(un?'<span class="unread-dot" aria-hidden="true"></span><span class="sr-only">Unread. </span>':'')+esc((l.by===o.side?'You: ':'')+l.t)+'</span><span class="conv-prev conv-sub">'+esc(o.sub(x))+'</span></span></button></li>';}).join(''):'<li class="conv-none">'+esc(o.empty||'No conversations yet.')+'</li>';}
 function drawThread(){var c=W.db().convs.find(function(x){return x.id===cur;});if(!c){head.innerHTML='';log.innerHTML='<p class="chat-empty">Select a conversation.</p>';if(form)form.hidden=true;if(ro)ro.hidden=true;return;}
  if(o.side){c['r'+o.side]=Date.now();W.save();}
  head.innerHTML='<button class="thread-back" type="button" aria-label="Back to conversations">←</button><span class="avatar" aria-hidden="true">'+esc(initials(o.title(c)))+'</span><div class="thread-id"><h2>'+esc(o.title(c))+'</h2><p>'+esc(o.sub(c))+'</p></div>'+(o.header?o.header(c):'');
  var lastDay='';log.innerHTML=c.msgs.map(function(m){var d=iso(m.ts),sep='';if(d!==lastDay){lastDay=d;sep='<div class="chat-sep"><span>'+esc(fmtDate(m.ts))+'</span></div>';}
   var mine=o.side?m.by===o.side:m.by==='f';var who=o.side?'':('<span class="chat-by">'+esc(m.by==='a'?W.user(c.a).name:W.user(c.f).trade)+'</span>');
   return sep+'<div class="chat-msg '+(mine?'mine':'theirs')+' from-'+(m.by==='a'?'client':'owner')+'">'+who+'<p class="chat-bubble">'+esc(m.t)+'</p><span class="chat-status">'+esc(new Date(m.ts).toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit'}))+'</span></div>';}).join('');
  log.scrollTop=log.scrollHeight;if(form)form.hidden=false;if(ro)ro.hidden=false;
  head.querySelector('.thread-back').addEventListener('click',function(){root.classList.remove('show-thread');var b=ul.querySelector('[data-c="'+cur+'"]');if(b)b.focus();});
  if(o.onHeader)o.onHeader(head,c);if(o.onChange)o.onChange();}
 ul.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(!b)return;cur=b.dataset.c;drawList();drawThread();root.classList.add('show-thread');var t=form&&form.querySelector('textarea');if(t&&matchMedia('(min-width:761px)').matches)t.focus();else head.querySelector('h2').setAttribute('tabindex','-1'),head.querySelector('h2').focus();});
 el.querySelector('#mSearch').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();drawList();});
 if(form){var ta=form.querySelector('textarea');ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  form.addEventListener('submit',function(e){e.preventDefault();var t=ta.value.trim(),c=W.db().convs.find(function(x){return x.id===cur;});if(!t||!c)return;W.send(c,o.side,t);ta.value='';drawList();drawThread();ta.focus();});}
 drawList();drawThread();if(cur)root.classList.add('show-thread');
 return {open:function(id){cur=id;drawList();drawThread();root.classList.add('show-thread');},redraw:function(){drawList();drawThread();}};};
/* Floating chat (applicant and firm portal pages, except the full Messages page) */
W.floatingChat=function(u){if(document.body.dataset.waPage.slice(-5)==='-chat')return;var side=u.role==='applicant'?'a':'f';
 var wrap=document.createElement('div');wrap.className='portal-chat';document.body.classList.add('has-portal-chat');
 wrap.innerHTML='<button class="isc-chat-fab portal-chat-fab" type="button" aria-expanded="false" aria-controls="pcPanel"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="isc-chat-fab-text">Messages<small>'+(side==='a'?'Your professionals':'Your applicants')+'</small></span><span class="pc-badge" hidden></span></button>'
  +'<div class="pc-panel" id="pcPanel" role="dialog" aria-label="Messages" hidden><div class="pc-head"><span class="avatar pc-logo" aria-hidden="true">AM</span><div><h2>Messages</h2><p>Recent conversations</p></div><button class="pc-close" type="button" aria-label="Close messages">×</button></div><div class="pc-body"></div></div>';
 document.body.appendChild(wrap);var fab=wrap.querySelector('.portal-chat-fab'),panel=wrap.querySelector('.pc-panel'),body=wrap.querySelector('.pc-body'),badge=wrap.querySelector('.pc-badge');
 function name(c){return side==='a'?W.user(c.f).trade:W.user(c.a).name;}
 function drawList(){var cs=W.convs(function(c){return c[side]===u.id;}).slice(0,6);
  body.innerHTML='<ul class="conv-list">'+(cs.length?cs.map(function(c){var l=W.last(c);return '<li><button class="conv" type="button" data-c="'+c.id+'"><span class="avatar" aria-hidden="true">'+esc(initials(name(c)))+'</span><span class="conv-body"><span class="conv-top"><span class="conv-name">'+esc(name(c))+'</span><span class="conv-time">'+esc(fmtTime(l.ts))+'</span></span><span class="conv-prev">'+esc(l.t)+'</span></span></button></li>';}).join(''):'<li class="conv-none">No conversations yet.</li>')+'</ul><p class="pc-all"><a class="s-btn outline" href="chat.html">Open all messages</a></p>';}
 function drawThread(id){var c=W.db().convs.find(function(x){return x.id===id;});c['r'+side]=Date.now();W.save();
  body.innerHTML='<p class="pc-back"><button class="s-btn ghost" type="button" data-back>← All conversations</button> <strong>'+esc(name(c))+'</strong></p><div class="chat-log pc-log" role="log" tabindex="0">'+c.msgs.map(function(m){return '<div class="chat-msg '+(m.by===side?'mine':'theirs')+' from-'+(m.by==='a'?'client':'owner')+'"><p class="chat-bubble">'+esc(m.t)+'</p></div>';}).join('')+'</div><form class="chat-composer"><label class="sr-only" for="pcText">Write a message</label><textarea id="pcText" rows="1" maxlength="2000" placeholder="Write a message"></textarea><button class="chat-send" type="submit" aria-label="Send message">'+SEND+'</button></form>';
  var lg=body.querySelector('.pc-log');lg.scrollTop=lg.scrollHeight;var f=body.querySelector('form'),ta=f.querySelector('textarea');ta.focus();
  ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit();}});
  f.addEventListener('submit',function(e){e.preventDefault();var t=ta.value.trim();if(!t)return;W.send(c,side,t);drawThread(id);});upd();}
 function upd(){var n=W.unread(u);badge.hidden=!n;badge.textContent=n;fab.setAttribute('aria-label','Messages'+(n?', '+n+' unread':''));document.querySelectorAll('[data-unread]').forEach(function(b){b.hidden=!n;b.textContent=n;});}
 body.addEventListener('click',function(e){var b=e.target.closest('[data-c]');if(b)drawThread(b.dataset.c);if(e.target.closest('[data-back]'))drawList();});
 function toggle(open){panel.hidden=!open;fab.setAttribute('aria-expanded',open);document.body.classList.toggle('pc-open',open);if(open){drawList();var f=body.querySelector('button,a');if(f)f.focus();}else fab.focus();}
 fab.addEventListener('click',function(){toggle(panel.hidden);});wrap.querySelector('.pc-close').addEventListener('click',function(){toggle(false);});
 panel.addEventListener('keydown',function(e){if(e.key==='Escape')toggle(false);});upd();W.updUnread=upd;};
/* ---------- boot: portal chrome ---------- */
function boot(){load();if(new URLSearchParams(location.search).get('reset')==='1'){W.reset();}
 var u=W.me();document.querySelectorAll('[data-me-name]').forEach(function(e){e.textContent=u?(u.role==='firm'?u.trade:u.name):'';});
 document.querySelectorAll('[data-me-role]').forEach(function(e){e.textContent=u?({admin:'Administrator',applicant:'Applicant',firm:'Immigration professional'}[u.role]):'';});
 document.querySelectorAll('[data-logout]').forEach(function(b){b.addEventListener('click',function(){W.logout();location.href='../login.html';});});
 document.querySelectorAll('[data-menu]').forEach(function(b){b.addEventListener('click',function(){var s=document.getElementById('sideNav');b.setAttribute('aria-expanded',s.classList.toggle('open'));});});
 if(u&&(u.role==='applicant'||u.role==='firm')&&document.body.classList.contains('shad')&&!(u.role==='firm'&&u.status!=='approved'))W.floatingChat(u);
 else document.querySelectorAll('[data-unread]').forEach(function(b){var n=u&&u.role!=='admin'?W.unread(u):0;b.hidden=!n;b.textContent=n;});}
W.boot=boot;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
