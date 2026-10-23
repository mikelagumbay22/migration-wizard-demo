(function(){
"use strict";
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
var head=document.querySelector('.site-head');
function onScroll(){if(head)head.classList.toggle('scrolled',window.scrollY>8);}
window.addEventListener('scroll',onScroll,{passive:true});onScroll();
var io=('IntersectionObserver' in window&&!RM)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -6% 0px',threshold:.06}):null;
function reveal(root){(root||document).querySelectorAll('[data-reveal]:not(.in)').forEach(function(el){if(io)io.observe(el);else el.classList.add('in');});}
window.PFReveal=reveal;reveal();
/* magnetic buttons (fine pointers only) */
if(!RM&&matchMedia('(pointer:fine)').matches){document.querySelectorAll('[data-magnetic]').forEach(function(b){
 b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.12)+'px,'+((e.clientY-r.top-r.height/2)*.18)+'px)';});
 b.addEventListener('pointerleave',function(){b.style.transform='';});});
 /* subtle tilt on country cards */
 document.querySelectorAll('.ccard').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.setProperty('--rx',(-y*4)+'deg');c.style.setProperty('--ry',(x*5)+'deg');});
  c.addEventListener('pointerleave',function(){c.style.removeProperty('--rx');c.style.removeProperty('--ry');});});}
})();
/* Account-aware header and questionnaire gate. Reads the existing portal session (sessionStorage wa_session_v1)
   and account store (localStorage wa_demo_v1) read-only; nothing here writes to the store. */
(function(){
"use strict";
var SKEY='wa_session_v1',KEY='wa_demo_v1',Q='wizard.html';
function me(){try{var s=JSON.parse(sessionStorage.getItem(SKEY)||'null');if(!s||!s.id)return null;
 var d=JSON.parse(localStorage.getItem(KEY)||'null'),u=d&&d.users&&d.users.find(function(x){return x.id===s.id;});return u||null;}catch(e){return null;}}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function initials(n){var p=String(n||'?').replace(/&/g,' ').split(/\s+/).filter(Boolean);return ((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();}
var u=me();window.AMAccount={me:me};
/* Questionnaire CTAs: signed in goes straight in; signed out logs in first and comes back. */
function gateHref(a){var h=a.getAttribute('href')||'',i=h.indexOf(Q);if(i<0||!/^(\.\.\/)?wizard\.html/.test(h))return null;return h;}
document.addEventListener('click',function(e){if(u)return;var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=gateHref(a);if(!h)return;
 if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;e.preventDefault();var pre=h.indexOf('../')===0?'../':'';
 location.href=pre+'login.html?next='+encodeURIComponent(h.replace(/^\.\.\//,''));},true);
if(!u)return;
/* Signed in: swap "Log in" for an account menu. */
var login=document.querySelector('.nav a.nav-login');if(!login)return;
var name=u.role==='firm'?(u.trade||u.name||u.contact):u.name,pic=u.photo||(u.role==='firm'?u.logo:null);
var links={applicant:[['app/dashboard.html','My results'],['app/profile.html','Profile']],firm:[['firm/dashboard.html','Dashboard'],['firm/licences.html','Profile and licences']],admin:[['admin/dashboard.html','Dashboard']]}[u.role]||[];
var box=document.createElement('div');box.className='acct';
box.innerHTML='<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="acctMenu"><span class="acct-av" aria-hidden="true">'+(pic?'<img src="'+esc(pic)+'" alt="" width="34" height="34">':esc(initials(name)))+'</span><span class="sr-only">Account menu for '+esc(name)+'</span></button>'
 +'<div class="acct-menu" id="acctMenu" hidden><div class="acct-who"><strong>'+esc(name)+'</strong><span>'+esc(u.email||'')+'</span></div>'
 +links.map(function(l){return '<a href="'+l[0]+'">'+esc(l[1])+'</a>';}).join('')+'<button type="button" class="acct-out">Log out</button></div>';
login.replaceWith(box);
var btn=box.querySelector('.acct-btn'),menu=box.querySelector('.acct-menu');
function set(o){menu.hidden=!o;btn.setAttribute('aria-expanded',o?'true':'false');}
btn.addEventListener('click',function(e){e.stopPropagation();set(menu.hidden);if(!menu.hidden){var f=menu.querySelector('a,button');if(f&&e.detail===0)f.focus();}});
document.addEventListener('click',function(e){if(!box.contains(e.target))set(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){set(false);btn.focus();}});
box.querySelector('.acct-out').addEventListener('click',function(){try{sessionStorage.removeItem(SKEY);}catch(e){}location.href='index.html';});
})();
