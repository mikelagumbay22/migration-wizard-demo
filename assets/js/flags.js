/* Country flags (flag-icons, MIT) and the searchable country picker used across the site. */
(function(){'use strict';
var S=document.currentScript,BASE=S?S.src.replace(/js\/flags\.js.*$/,'flags/'):'assets/flags/';
var CODES='ad ae af ag ai al am ao ar as at au aw az ba bb bd be bf bg bh bi bj bm bn bo br bs bt bw by bz ca cd cf cg ch ci ck cl cm cn co cr cu cv cw cy cz de dj dk dm do dz ec ee eg er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gt gu gw gy hk hn hr ht hu id ie il im in iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg si sk sl sm sn so sr ss st sv sx sy sz tc td tg th tj tl tm tn to tr tt tv tw tz ua ug us uy uz va vc ve vg vi vn vu ws xk ye yt za zm zw '.trim().split(' ');
var ID={Canada:'ca',UK:'gb',Ireland:'ie',NewZealand:'nz',Germany:'de',Spain:'es',UAE:'ae',Singapore:'sg',Japan:'jp',Australia:'au',UnitedStates:'us',Netherlands:'nl',Portugal:'pt',France:'fr'};
var AL={'uk':'gb','united kingdom':'gb','great britain':'gb','britain':'gb','england':'gb','scotland':'gb','wales':'gb','northern ireland':'gb','usa':'us','us':'us','u.s.':'us','u.s.a.':'us','america':'us','united states of america':'us','uae':'ae','emirates':'ae','south korea':'kr','korea':'kr','north korea':'kp','russia':'ru','czech republic':'cz','czechia':'cz','ivory coast':'ci','holland':'nl','vietnam':'vn','viet nam':'vn','turkey':'tr','turkiye':'tr','türkiye':'tr','burma':'mm','myanmar':'mm','macau':'mo','hong kong':'hk','taiwan':'tw','palestine':'ps','swaziland':'sz','eswatini':'sz','cape verde':'cv','congo':'cg','dr congo':'cd','drc':'cd','laos':'la','syria':'sy','iran':'ir','bolivia':'bo','venezuela':'ve','tanzania':'tz','moldova':'md','brunei':'bn','micronesia':'fm','vatican':'va','st lucia':'lc','saint lucia':'lc'};
var DN=null;try{DN=new Intl.DisplayNames(['en'],{type:'region'});}catch(e){}
var NAMES={};CODES.forEach(function(c){var n=c.toUpperCase();try{n=DN?DN.of(c.toUpperCase()):n;}catch(e){}NAMES[c]=n;AL[n.toLowerCase()]=c;});
var LIST=CODES.map(function(c){return [c,NAMES[c]];}).sort(function(a,b){return a[1].localeCompare(b[1]);});
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function iso(x){if(!x)return '';x=String(x).trim();if(ID[x])return ID[x];var l=x.toLowerCase();if(AL[l])return AL[l];if(/^[a-z]{2}$/i.test(x)&&NAMES[l])return l;
 var dn=(window.PF_DATA&&PF_DATA.names)||{};for(var k in dn)if(String(dn[k]).toLowerCase()===l&&ID[k])return ID[k];return '';}
function img(x,sz,cls){var c=iso(x);if(!c)return '';sz=sz||20;return '<img class="flag'+(cls?' '+cls:'')+'" src="'+BASE+c+'.svg" width="'+sz+'" height="'+Math.round(sz*.75)+'" alt="" aria-hidden="true" decoding="async">';}
function lab(x,name,sz){return '<span class="flag-l">'+img(x,sz)+'<span>'+esc(name==null?x:name)+'</span></span>';}
var css='.flag{display:inline-block;flex:none;height:auto;max-width:none;aspect-ratio:4/3;border-radius:3px;object-fit:cover;vertical-align:-2px;box-shadow:0 0 0 1px rgba(0,0,0,.08);margin-right:.45em;background:#eee}'
+'.flag-l{display:inline-flex;align-items:center;gap:0;vertical-align:baseline}.flag-l>.flag{vertical-align:middle}'
+'.flag.lg{width:28px;border-radius:4px;margin-right:.4em}.flag.xl{width:34px;border-radius:5px;margin-right:.45em}'
+'h1 .flag,h2 .flag,h3 .flag{vertical-align:middle;position:relative;top:-.08em}'
+'.fsel{position:relative}.fsel-btn{display:flex!important;align-items:center;gap:0;width:100%;text-align:left;cursor:pointer}.fsel-btn .fsel-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fsel-btn .fsel-t.ph{opacity:.6}'
+'.fsel-car{flex:none;margin-left:8px;opacity:.6}.fsel-pop{position:absolute;z-index:60;left:0;right:0;top:calc(100% + 4px);background:#fff;color:#18181b;border:1px solid rgba(0,0,0,.14);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.16);padding:6px}'
+'.fsel-q{width:100%;box-sizing:border-box;margin:0 0 6px;padding:8px 10px;border:1px solid rgba(0,0,0,.16);border-radius:7px;font:inherit;font-size:14px}'
+'.fsel-list{list-style:none;margin:0;padding:0;max-height:260px;overflow:auto}.fsel-list li{display:flex;align-items:center;padding:8px 9px;border-radius:6px;cursor:pointer;font-size:14px;line-height:1.3}'
+'.fsel-list li[aria-selected=true]{font-weight:600}.fsel-list li.on{background:rgba(0,0,0,.06)}.fsel-list .none{color:#71717a;cursor:default}'
+'.fsel-hid{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important;opacity:0}';
var st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).appendChild(st);
/* ---- searchable picker on top of a native select or a free-text country input ---- */
var NV=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value'),IV=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'),N=0;
function opts(el){if(el.tagName==='SELECT')return [].map.call(el.options,function(o){return {v:o.value,t:o.textContent,f:o.value?iso(o.value)||iso(o.textContent):''};});
 return LIST.map(function(c){return {v:c[1],t:c[1],f:c[0]};});}
function eligible(s){if(s.dataset.flagsel==='off'||s.multiple)return false;var o=[].filter.call(s.options,function(o){return o.value;});return o.length>=3&&o.every(function(x){return iso(x.value)||iso(x.textContent);});}
function enhance(el){if(el.__fsel)return;var isSel=el.tagName==='SELECT',id='fs'+(++N),P=el.getAttribute('placeholder')||'Choose a country';
 var w=document.createElement('div');w.className='fsel';el.parentNode.insertBefore(w,el);w.appendChild(el);
 var b=document.createElement('button');b.type='button';b.className=(el.className||'')+' fsel-btn';b.setAttribute('aria-haspopup','listbox');b.setAttribute('aria-expanded','false');
 var lbl=el.id&&document.querySelector('label[for="'+el.id+'"]');if(lbl){if(!lbl.id)lbl.id=id+'L';lbl.setAttribute('for',id+'B');}b.id=id+'B';
 b.innerHTML='<span class="fsel-t"></span><svg class="fsel-car" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 3.5l3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
 var pop=document.createElement('div');pop.className='fsel-pop';pop.hidden=true;pop.innerHTML='<input class="fsel-q" type="search" placeholder="Search countries" aria-label="Search countries" autocomplete="off"><ul class="fsel-list" role="listbox" id="'+id+'X"'+(lbl?' aria-labelledby="'+lbl.id+'"':' aria-label="Countries"')+'></ul>';
 w.appendChild(b);w.appendChild(pop);el.classList.add('fsel-hid');el.tabIndex=-1;el.setAttribute('aria-hidden','true');
 var q=pop.querySelector('.fsel-q'),ul=pop.querySelector('ul'),act=-1,items=[];
 function get(){return isSel?NV.get.call(el):IV.get.call(el);}
 function cur(){var v=get(),O=opts(el);for(var i=0;i<O.length;i++)if(O[i].v===v)return O[i];if(!isSel&&v){var c=iso(v);return {v:v,t:v,f:c};}return null;}
 function paint(){var c=cur(),t=b.querySelector('.fsel-t'),ph=!c||!c.v;t.className='fsel-t'+(ph?' ph':'');
  t.innerHTML=ph?esc(c&&c.t||P):((c.f?img(c.f):'')+esc(c.t));b.setAttribute('aria-label',(lbl?lbl.textContent.trim()+': ':'')+(ph?'not chosen':c.t));
  var inv=el.getAttribute('aria-invalid');if(inv)b.setAttribute('aria-invalid',inv);else b.removeAttribute('aria-invalid');b.disabled=el.disabled;}
 function list(){var s=q.value.trim().toLowerCase(),v=get();items=opts(el).filter(function(o){return !s||o.t.toLowerCase().indexOf(s)>-1||(o.f&&o.f===s);});
  if(!isSel&&!s)items=items;act=Math.max(0,items.findIndex(function(o){return o.v===v;}));
  ul.innerHTML=items.length?items.map(function(o,i){return '<li role="option" id="'+id+'o'+i+'" data-i="'+i+'" aria-selected="'+(o.v===v)+'"'+(i===act?' class="on"':'')+'>'+(o.f?img(o.f):'')+'<span>'+esc(o.t)+'</span></li>';}).join(''):'<li class="none" role="option" aria-disabled="true">No matching country</li>';hl();}
 function hl(){[].forEach.call(ul.children,function(li,i){li.classList.toggle('on',i===act);});var a=ul.children[act];if(a&&items.length){q.setAttribute('aria-activedescendant',a.id);if(a.offsetTop<ul.scrollTop)ul.scrollTop=a.offsetTop;else if(a.offsetTop+a.offsetHeight>ul.scrollTop+ul.clientHeight)ul.scrollTop=a.offsetTop+a.offsetHeight-ul.clientHeight;}}
 function open(){pop.hidden=false;b.setAttribute('aria-expanded','true');q.value='';list();q.focus({preventScroll:true});fit();}
 function fit(){var r=pop.getBoundingClientRect(),br=b.getBoundingClientRect(),over=r.bottom-window.innerHeight+8;if(over>0)window.scrollBy(0,Math.max(0,Math.min(over,br.top-90)));}
 function close(f){pop.hidden=true;b.setAttribute('aria-expanded','false');if(f)b.focus();}
 function pick(o){if(isSel)NV.set.call(el,o.v);else IV.set.call(el,o.v);paint();el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));close(true);}
 b.addEventListener('click',function(){pop.hidden?open():close(true);});
 b.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();}});
 q.addEventListener('input',list);
 q.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();act=Math.min(items.length-1,act+1);hl();}else if(e.key==='ArrowUp'){e.preventDefault();act=Math.max(0,act-1);hl();}
  else if(e.key==='Enter'){e.preventDefault();if(items[act])pick(items[act]);}else if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Tab')close();});
 ul.addEventListener('mousedown',function(e){e.preventDefault();});
 ul.addEventListener('click',function(e){var li=e.target.closest('li[data-i]');if(li)pick(items[+li.dataset.i]);});
 document.addEventListener('click',function(e){if(!w.contains(e.target)&&!pop.hidden)close();});
 Object.defineProperty(el,'value',{configurable:true,get:get,set:function(v){(isSel?NV:IV).set.call(el,v);paint();}});
 el.focus=function(){b.focus();};
 new MutationObserver(paint).observe(el,{attributes:true,attributeFilter:['aria-invalid','disabled'],childList:true});
 el.addEventListener('change',paint);el.__fsel=paint;paint();}
function scan(root){(root.querySelectorAll?root:document).querySelectorAll('select:not(.fsel-hid),input[autocomplete="country-name"]:not(.fsel-hid)').forEach(function(el){if(el.tagName==='INPUT'||eligible(el))enhance(el);});}
window.AMF={iso:iso,img:img,lab:lab,list:LIST,name:function(c){return NAMES[c]||'';},enhance:enhance,scan:scan};
function boot(){scan(document);new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n.parentNode||n);});});}).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
