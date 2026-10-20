/* Questionnaire UI. One step per screen; state in sessionStorage only; nothing is sent over the network. */
(function(){
"use strict";
var D=window.PF_DATA,EN=window.PFEngine;if(!D||!EN)return;
var KEY='pf_wizard_v1',$=function(id){return document.getElementById(id);};
var form=$('wiz'),steps=[].slice.call(document.querySelectorAll('.step')),intro=$('intro'),res=$('results');
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var st=load()||{step:0,a:{},seen:0,view:'intro'};
/* 20261020e: drop invalid stored exact numbers */
(function(){['income_exact','funds_exact'].forEach(function(k){var v=st.a&&st.a[k];if(v!=null&&!(typeof v==='number'&&isFinite(v)&&v>=0&&v<=D.extra.numMax[k]&&Math.floor(v)===v)){delete st.a[k];}});})();
/* 20261020d: answers saved with old income/savings bands are kept only if they fit inside a new band; otherwise that one answer is cleared and the questionnaire reopens at the Money step. */
(function(){var M=D.extra.migrate,ch=false;Object.keys(M).forEach(function(q){var v=st.a&&st.a[q];if(v!=null&&Object.prototype.hasOwnProperty.call(M[q],v)){ch=true;if(M[q][v])st.a[q]=M[q][v];else{delete st.a[q];st.cleared=true;}}});
 if(ch){if(st.cleared){st.done=false;st.view='wiz';st.step=3;delete st.cleared;}try{sessionStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}})();
function load(){try{return JSON.parse(sessionStorage.getItem(KEY));}catch(e){return null;}}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function N(id){return D.names[id]||id;}
/* ---------- passports (used for EU free movement, working-holiday lists and visit guidance; see README) ---------- */
var ISO='AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI CV KH CM CA KY CF TD CL CN CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU MK MP NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
var dn=null;try{dn=new Intl.DisplayNames(['en'],{type:'region'});}catch(e){}
var PPC={};ISO.forEach(function(c){PPC[dn?dn.of(c):c]=c;});
var PP=ISO.map(function(c){return dn?dn.of(c):c;}).sort(function(a,b){return a.localeCompare(b);});
$('ppList').innerHTML=PP.map(function(n){return '<option value="'+esc(n)+'">';}).join('');
var ppIn=$('f-passport'),chips=$('ppChips');
function pp(){return st.a.passport||[];}
function renderChips(){chips.innerHTML=pp().map(function(n,i){return '<span class="chip">'+esc(n)+'<button type="button" data-rm="'+i+'" aria-label="Remove '+esc(n)+'">×</button></span>';}).join('');
 chips.querySelectorAll('[data-rm]').forEach(function(b){b.addEventListener('click',function(){var l=pp().slice();l.splice(+b.dataset.rm,1);st.a.passport=l;save();renderChips();ppIn.focus();});});
 ppIn.disabled=pp().length>=3;ppIn.placeholder=pp().length>=3?'Up to 3 added':'e.g. Philippines';}
function addPP(){var v=ppIn.value.trim();if(!v)return false;var m=PP.find(function(n){return n.toLowerCase()===v.toLowerCase();});
 if(!m){showErr('Please choose a country from the list.');return true;}
 var l=pp().slice();if(l.indexOf(m)<0&&l.length<3)l.push(m);st.a.passport=l;ppIn.value='';save();renderChips();showErr('');return true;}
ppIn.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addPP();}});
ppIn.addEventListener('change',function(){if(PP.indexOf(ppIn.value)>-1)addPP();});
/* ---------- read / write inputs ---------- */
function getVal(name){var els=form.querySelectorAll('[name="'+name+'"]');if(!els.length)return undefined;var e0=els[0];
 if(e0.type==='radio'){var c=form.querySelector('[name="'+name+'"]:checked');return c?c.value:undefined;}
 if(e0.type==='checkbox'){return [].filter.call(els,function(x){return x.checked;}).map(function(x){return x.value;});}
 return e0.value||undefined;}
function restore(){Object.keys(st.a).forEach(function(k){var v=st.a[k];form.querySelectorAll('[name="'+k+'"]').forEach(function(el){
 if(el.type==='radio')el.checked=el.value===v;else if(el.type==='checkbox')el.checked=Array.isArray(v)&&v.indexOf(el.value)>-1;else if(el.tagName==='SELECT'||el.tagName==='INPUT'&&el.id!=='f-passport')el.value=v==null?'':v;});});renderChips();}
/* exact-number fields: number wins; the matching range question is hidden and auto-derived */
var NUMQ={income_exact:'passive_income',funds_exact:'funds'};
function numCheck(el){var raw=el.value.trim(),mx=D.extra.numMax[el.name];if(raw==='')return {v:null};if(el.validity&&el.validity.badInput)return {err:'Please enter a number, or leave it blank.'};
 var v=Number(raw);if(!isFinite(v))return {err:'Please enter a number, or leave it blank.'};if(v<0)return {err:'Please enter 0 or more.'};if(Math.floor(v)!==v)return {err:'Please enter a whole number of US dollars.'};if(v>mx)return {err:'Please enter '+mx.toLocaleString('en')+' or less.'};return {v:v};}
function numUpdate(el){var r=numCheck(el),n=el.name,b=NUMQ[n],q=el.closest('.q'),d=$('d-'+n);q.classList.toggle('invalid',!!r.err);el.setAttribute('aria-invalid',r.err?'true':'false');
 if(r.err){d.textContent=r.err;delete st.a[n];}else if(r.v===null){d.textContent='';if(st.a[n]!=null){delete st.a[n];delete st.a[b];form.querySelectorAll('[name="'+b+'"]').forEach(function(x){x.checked=false;});}}
 else{st.a[n]=r.v;st.a[b]=EN.bandOf(D,b,r.v);form.querySelectorAll('[name="'+b+'"]').forEach(function(x){x.checked=x.value===st.a[b];});d.textContent='Using USD '+r.v.toLocaleString('en')+'. The range question is hidden.';}
 save();applyConditions();return r;}
Object.keys(NUMQ).forEach(function(n){var el=$('f-'+n);el.addEventListener('input',function(){numUpdate(el);});});
form.addEventListener('change',function(e){var n=e.target.name;if(!n||e.target.id==='f-passport'||NUMQ[n])return;st.a[n]=getVal(n);
 if(n==='priorities')capPriorities();save();applyConditions();showErr('');});
function capPriorities(){var b=form.querySelectorAll('[name="priorities"]'),n=[].filter.call(b,function(x){return x.checked;}).length;b.forEach(function(x){x.disabled=!x.checked&&n>=3;x.closest('.opt').classList.toggle('is-disabled',x.disabled);});}
/* ---------- conditional questions ---------- */
function A(k){return st.a[k];}
function conds(){var g=A('goal'),lp=A('langpick')||[],jo=A('jo')==='yes',ft=A('ft')&&A('ft')!=='none',ties=jo||ft;
 return {'if-work':g==='work','if-lang-french':lp.indexOf('french')>-1,'if-lang-german':lp.indexOf('german')>-1,'if-lang-japanese':lp.indexOf('japanese')>-1,
  'if-invest':g==='invest','if-income':g==='retire'||g==='remote','if-jo':jo,'if-ft':ft,'if-ties':ties,'if-pr':ties&&(A('pr')==='study'||A('pr')==='work'),'if-masters':A('education')==='master'||A('education')==='phd','if-noincx':A('income_exact')==null,'if-nofundx':A('funds_exact')==null};}
function applyConditions(){var c=conds();Object.keys(c).forEach(function(cls){form.querySelectorAll('.'+cls).forEach(function(el){
 var show=c[cls];if(el.hidden===!show)return;el.hidden=!show;if(show&&!RM){el.classList.remove('appear');void el.offsetWidth;el.classList.add('appear');}});});}
function visible(el){return !el.hidden&&!el.closest('[hidden]');}
/* ---------- validation ---------- */
function showErr(t){$('stepErr').textContent=t;}
function validate(i){var s=steps[i],bad=null;
 s.querySelectorAll('[data-num]').forEach(function(q){if(bad||!visible(q))return;var el=q.querySelector('input'),r=numUpdate(el);if(r.err){bad=q;}});
 if(bad){showErr(bad.querySelector('.num-derived').textContent);bad.querySelector('input').focus();return false;}
 s.querySelectorAll('[data-required]').forEach(function(q){if(bad||!visible(q))return;var n=q.getAttribute('data-q');
  var ok=n==='passport'?pp().length>0:!!getVal(n);q.classList.toggle('invalid',!ok);if(!ok)bad=q;});
 if(bad){var l=bad.querySelector('legend,label');showErr('Please answer: '+(l?l.textContent:'this question'));var f=bad.querySelector('input:not([disabled]),select');if(f)f.focus();return false;}
 showErr('');return true;}
/* ---------- navigation ---------- */
var dots=$('dots');
function renderDots(){dots.innerHTML=steps.map(function(s,i){var t=s.querySelector('.step-kicker').textContent.split('· ')[1];var cur=i===st.step;
 return '<li><button type="button" data-go="'+i+'" class="'+(cur?'cur':i<=st.seen?'done':'')+'"'+(i>st.seen?' disabled':'')+(cur?' aria-current="step"':'')+'><span class="dot-n">'+(i+1)+'</span><span class="dot-t">'+esc(t)+'</span></button></li>';}).join('');
 dots.querySelectorAll('[data-go]').forEach(function(b){b.addEventListener('click',function(){var to=+b.dataset.go;if(to>st.step&&!validate(st.step))return;go(to);});});}
function show(view){intro.hidden=view!=='intro';form.hidden=view!=='wiz';res.hidden=view!=='results';st.view=view;save();window.scrollTo(0,0);}
function go(i,noFocus){st.step=i;st.seen=Math.max(st.seen,i);save();steps.forEach(function(s,k){s.hidden=k!==i;});
 if(!RM){steps[i].classList.remove('enter');void steps[i].offsetWidth;steps[i].classList.add('enter');}
 $('progBar').style.width=((i+1)/steps.length*100)+'%';$('progText').textContent='Step '+(i+1)+' of '+steps.length;
 $('backBtn').disabled=false;$('nextBtn').firstChild.textContent=i===steps.length-1?'See my results ':'Next ';renderDots();applyConditions();
 if(!noFocus)steps[i].querySelector('.step-title').focus({preventScroll:true});window.scrollTo(0,0);}
form.addEventListener('submit',function(e){e.preventDefault();if(document.activeElement===ppIn&&addPP())return;if(!validate(st.step))return;
 if(st.step<steps.length-1)go(st.step+1);else{st.done=true;renderResults();show('results');$('resTitle').focus({preventScroll:true});}});
$('backBtn').addEventListener('click',function(){if(st.step===0){show('intro');$('introTitle').focus();}else go(st.step-1);});
$('startBtn').addEventListener('click',function(){show('wiz');go(st.step||0);});
$('resumeBtn').addEventListener('click',function(){if(st.done){renderResults();show('results');}else{show('wiz');go(st.step);}});
$('editBtn').addEventListener('click',function(){show('wiz');go(0);});
$('restartBtn').addEventListener('click',function(){st={step:0,a:{},seen:0,view:'wiz'};save();form.reset();restore();capPriorities();show('wiz');go(0);});
/* ---------- answers for the engine (hidden questions are ignored) ---------- */
function answers(){var c=conds(),a=st.a;
 return {goal:a.goal,household:a.household,age:a.age,passport:a.passport,passportCodes:(a.passport||[]).map(function(n){return PPC[n];}).filter(Boolean),education:a.education,fr_degree:c['if-masters']?a.fr_degree:undefined,recognised:a.recognised,occupation:a.occupation,experience:a.experience,
  salary:c['if-work']?a.salary:undefined,english:a.english,
  langs:{french:c['if-lang-french']?a.french:'none',german:c['if-lang-german']?a.german:'none',japanese:c['if-lang-japanese']?a.japanese:'none'},
  funds:a.funds,funds_exact:a.funds_exact,income_exact:c['if-income']?a.income_exact:undefined,budget:a.budget,invest:c['if-invest']?a.invest:undefined,passive_income:c['if-income']?a.passive_income:undefined,
  job_offer:a.jo==='yes'?a.jo_country:'no',family_tie:{type:a.ft||'none',country:c['if-ft']?a.ft_country:undefined},
  prior:{type:c['if-ties']?(a.pr||'none'):'none',country:c['if-pr']?a.pr_country:undefined},
  timeline:a.timeline,priorities:(a.priorities||[]).slice(0,3),exclude:a.exclude||[],decl:{criminal:a.criminal,health:a.health,refusal:a.refusal}};}
window.PFAnswers=answers;
/* ---------- plain-language description of a requirement the answers didn't show (wording built only from scoring.json rule fields) ---------- */
var QL={english:'English',french:'French',german:'German',japanese:'Japanese (JLPT)',experience:'skilled work experience',funds:'savings (USD)',salary:'gross annual salary (USD)',
 invest:'investment amount (USD)',passive_income:'passive or remote income per month (USD)',age:'age band',education:'education',occupation:'occupation field',skills_assessed:'skills assessment',recognised:'qualification recognition',fr_degree:'a master’s or PhD earned in France'};
var VL={phd:'PhD',it:'IT / software',trade:'skilled trade',in_progress:'in progress',child_adult:'adult child',spouse:'spouse / partner',vocational:'vocational / trade certificate'};
function vl(v){return VL[v]||v;}
function phrase(r){if(r.paused)return 'this route is currently paused';if(r.q==='fr_degree')return 'a master’s or PhD earned in France'+(r.alt?', or '+phrase(r.alt):'');var q=r.q,t;
 if(q==='job_offer')t='a job offer in '+N(r.country);
 else if(q==='family_tie')t='a close family member ('+(r.in||[r.eq]).map(vl).join(' or ')+') who is a citizen or permanent resident of '+N(r.country);
 else if(r.usd!=null)t=QL[q]+': about USD '+r.usd.toLocaleString('en')+' or more (official figure: '+r.usd_src.official+')';
 else if(r.min)t=QL[q]+': '+r.min+' or higher';else if(r.max)t=QL[q]+': '+r.max.replace('-','–')+' or younger';
 else if(r.in)t=QL[q]+': '+r.in.map(vl).join(', ');else if('eq' in r)t=QL[q]+': '+vl(r.eq);else t=QL[q]||q;
 return r.alt?t+', or '+phrase(r.alt):t;}
/* ---------- results ---------- */
var BL={strong:'Worth exploring',possible:'Possibly worth exploring',explore:'Worth exploring after a few steps',low:'Low fit, talk to a consultant'};
var EXT='<span class="sr-only"> (official site, opens in a new tab)</span>';
function xl(label,url){return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+EXT+'</a>';}
var HINT={free:'Your passport is on the official list of travellers who don’t need a visa for short visits here.',visa:'Your passport isn’t on the official list we checked, so you may need a visitor visa.'};
function regLinks(c){var r=D.reg[c];return r.links.map(function(l){return '<a href="'+esc(l[1])+'" target="_blank" rel="noopener noreferrer">'+esc(l[0])+'<span class="sr-only"> (official site, opens in a new tab)</span></a>';});}
function renderResults(){var A=answers();if(A.goal==='tour'){renderTour(A);return;}var R=EN.score(D,A),list=R.list;
 $('declNote').innerHTML=EN.declarationNote(A)?'<div class="notice decl" role="note"><p><strong>Worth raising with a professional.</strong> '+esc(D.text.declNote)+'</p></div>':'';
 var ul=$('resList');
 var bn=budgetNote(R,A);$('declNote').innerHTML+=bn;
 if(!list.length){ul.innerHTML='<li class="res-empty"><h2>No pathways to show for these answers</h2><p>'+(R.removed.length?'Your exclusions and stated budget removed every country with a pathway for this goal.':'Your exclusions removed every country with a pathway for this goal.')+' You can still browse the <a href="countries.html">countries, official sources and registries</a>, or edit your answers.</p></li>';fillCountries([]);return;}
 ul.innerHTML=list.map(function(r,i){var c=r.country;
  var pws=r.pathways.map(function(p){return '<li class="rp"><div class="rp-top"><h4>'+esc(p.name)+'</h4><span class="pill '+p.band+'">'+BL[p.band]+'</span></div>'
   +(p.passes?'':'<p class="rp-miss"><span>What your answers didn’t show:</span> '+p.failed.map(function(f){return esc(phrase(f));}).join('; ')+'.</p>')
   +(p.note?'<p class="rp-note">'+esc(p.note)+'</p>':'')
   +(p.next_steps?'<p class="rp-next"><span>Next step:</span> '+esc(p.next_steps)+'</p>':'')
   +(p.cost?'<p class="rp-cost small muted">Official figure: '+esc(p.cost.cur)+' '+p.cost.amount.toLocaleString('en')+' '+esc(p.cost.what)+'.</p>':'<p class="rp-cost small muted">Costs vary, so check the official site.</p>')
   +(p.paused?'<p class="rp-paused"><strong>Currently paused</strong></p>':'')+'<p class="rp-src"><a href="'+esc(p.source)+'" target="_blank" rel="noopener noreferrer">Official page<span class="sr-only"> for '+esc(p.name)+' (opens in a new tab)</span></a> · checked '+esc(p.checked)+(p.verify?' · <span class="unconf">not fully confirmed on that date, so check the official page'+(p.verify_note?' ('+esc(p.verify_note)+')':'')+'</span>':'')+'</p></li>';}).join('');
  var links=regLinks(c),reg=D.reg[c];
  return '<li class="rcard" data-reveal style="--d:'+(i*0.07)+'s"><div class="rc-head"><span class="rc-n" aria-hidden="true">'+(i+1)+'</span><div><h2>'+esc(N(c))+'</h2><span class="pill big '+r.band+'">'+BL[r.band]+'</span></div></div>'
   +'<p class="rc-text">'+esc(D.meta.result_text[r.band])+'</p><h3 class="rc-sub">Pathways that may be relevant</h3><ul class="rps">'+pws+'</ul>'
   +'<div class="rc-reg"><h3>How to find a licensed consultant</h3><p>'+esc(D.text.referral.replace('{country}',N(c)).split('{links}')[0])+links.join(', ')+'.</p><p class="small muted">'+esc(reg.body)+(reg.extra?' '+esc(reg.extra):'')+'</p></div></li>';}).join('');
 fillCountries(list);
 if(window.PFReveal)window.PFReveal(ul);}
function budgetNote(R,A){var r=R.removed;if(!r.length)return '';
 return '<div class="notice budget" role="note"><p><strong>Filtered by your budget.</strong> We left out '+r.map(function(x){return esc(x.name)+' ('+esc(N(x.country))+')';}).join(', ')+', because the official figure (for example '+esc(r[0].cost.cur)+' '+r[0].cost.amount.toLocaleString('en')+' '+esc(r[0].cost.what)+') is clearly above the top of the budget band you chose. We only filter where an official figure is published; elsewhere costs vary, so check the official site. Currency conversion uses '+xl('ECB reference rates',D.extra.fxSource)+' of '+esc(D.extra.checked)+', reduced by 10%.</p></div>';}
function renderTour(A){var ul=$('resList'),rows=EN.tour(D,A);$('declNote').innerHTML=EN.declarationNote(A)?'<div class="notice decl" role="note"><p><strong>Worth raising with a professional.</strong> '+esc(D.text.declNote)+'</p></div>':'';
 ul.innerHTML='<li class="res-empty"><h2>Visiting or touring</h2><p>The 29 pathways in this questionnaire are for moving, so a visit isn’t scored. Below is general visit information for each country, with the official checker. Entry rules depend on your passport and change often, so always confirm on the official site.</p></li>'+rows.map(function(r,i){var t=r.t,h='';
  if(r.hint==='auth')h='Your passport appears on the official list for '+esc(t.auth_name)+'.';else if(r.hint==='maybe')h='With your passport you '+esc(t.maybe_text)+'.';else if(r.hint)h=HINT[r.hint];
  return '<li class="rcard tour" data-reveal style="--d:'+(i*0.04)+'s"><div class="rc-head"><span class="rc-n" aria-hidden="true">'+(i+1)+'</span><div><h2>'+esc(N(r.country))+'</h2></div></div><p class="rc-text">'+esc(t.general)+'</p>'+(h?'<p class="rp-note">'+h+' Conditions apply, so confirm with the official checker.</p>':'')
  +'<p class="rp-src">'+t.links.map(function(l){return xl(l[0],l[1]);}).join(' · ')+' · checked '+esc(D.extra.checked)+(t.verify?' · <span class="unconf">general guidance, check the official site</span>':'')+'</p></li>';}).join('');
 fillCountries([]);if(window.PFReveal)window.PFReveal(ul);}
function fillCountries(list){var sel=$('c-country'),ids=list.map(function(r){return r.country;});Object.keys(D.names).forEach(function(k){if(ids.indexOf(k)<0)ids.push(k);});
 sel.innerHTML='<option value="">Choose…</option>'+ids.map(function(k){return '<option value="'+esc(k)+'">'+esc(N(k))+'</option>';}).join('');if(list[0])sel.value=list[0].country;}
/* ---------- contact (frontend only) ---------- */
$('contactForm').addEventListener('submit',function(e){e.preventDefault();var f=e.target,err='';
 var nm=f.name.value.trim(),em=f.email.value.trim();
 if(!nm)err='Please enter your name.';else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))err='Please enter a valid email address.';else if(!f.country.value)err='Please choose a country.';else if(!f.consent.checked)err='Please tick the consent box so we can share your details.';
 $('cErr').textContent=err;if(err){var bad=!nm?f.name:!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)?f.email:!f.country.value?f.country:f.consent;bad.focus();return;}
 f.hidden=true;$('thanksName').textContent=', '+nm;var t=$('thanks');t.hidden=false;t.focus();});
/* ---------- boot ---------- */
restore();Object.keys(NUMQ).forEach(function(n){if(st.a[n]!=null)numUpdate($('f-'+n));});capPriorities();applyConditions();
if(new URLSearchParams(location.search).has('start')){show('wiz');go(st.step||0,true);}
else if(st.view==='results'&&st.done){renderResults();show('results');}
else if(st.view==='wiz'){show('wiz');go(st.step,true);}
else{show('intro');}
$('resumeRow').hidden=!(Object.keys(st.a).length&&st.view==='intro');
})();
