/* Scoring engine. Client-side only; nothing is sent anywhere.
   Results are "countries worth exploring", never eligibility decisions.
   v3 (20261020g): each pathway's score is a percentage of that pathway's own maximum (its points for the goal + 15 lifestyle); passport routes keep fixed shares of the goal maximum (see README "Scoring"). */
(function(root){
"use strict";
/* Answer values used by scoring.json that its own "ordinals" lists don't contain (README "Gaps"):
   english "A1" is read as "basic"; french "B2" as "B2+". */
var ALIAS={english:{A1:'basic'},french:{B2:'B2+'}};
function ordIndex(D,q,v){var o=D.ordinals[q];if(!o)return -1;v=(ALIAS[q]&&ALIAS[q][v])||v;return o.indexOf(v);}
/* exact USD numbers (20261020e): band derived from the number; rules with an official 'usd' threshold compare the number directly */
function exact(A,q){var v=A[q==='passive_income'?'income_exact':'funds_exact'];return (typeof v==='number'&&isFinite(v)&&v>=0)?v:null;}
function bandOf(D,q,v){var e=D.extra&&D.extra.edges&&D.extra.edges[q],o=D.ordinals[q];if(!e)return undefined;
  if(q==='passive_income'&&v===0)return 'none';var i=0;while(i<e.length&&v>=e[i])i++;return o[q==='passive_income'?i+1:i];}
function val(A,q){
  switch(q){
    case 'family_tie': return A.family_tie&&A.family_tie.type!=='none'?A.family_tie.type:undefined;
    case 'job_offer': return A.job_offer&&A.job_offer!=='no'?'yes':undefined;
    case 'prior': return A.prior&&A.prior.type&&A.prior.type!=='none'?A.prior.country:undefined;
    case 'skills_assessed': case 'recognised': return A.recognised;
    case 'french': case 'german': case 'japanese': return (A.langs&&A.langs[q])||'none';
    case 'passive_income': case 'funds': var x=exact(A,q);return x!==null&&D0?bandOf(D0,q,x):A[q];
    default: return A[q];
  }
}
function countryOf(A,q){if(q==='job_offer')return A.job_offer;if(q==='family_tie')return A.family_tie&&A.family_tie.country;return undefined;}
var D0=null;
function test(D,A,r){
  D0=D;
  if(r.usd!=null&&exact(A,r.q)!==null){var ok0=exact(A,r.q)>=r.usd;if(!ok0&&r.alt)ok0=test(D,A,r.alt);return ok0;}
  var v=val(A,r.q),ok;
  if(v===undefined||v===null||v==='')ok=false;
  else if(r.in)ok=r.in.indexOf(v)>-1;
  else if('eq' in r)ok=v===r.eq;
  else if(r.min||r.max){var i=ordIndex(D,r.q,v);ok=i>-1;if(ok&&r.min)ok=i>=ordIndex(D,r.q,r.min);if(ok&&r.max)ok=i<=ordIndex(D,r.q,r.max);}
  else ok=true;
  if(ok&&r.country)ok=countryOf(A,r.q)===r.country;
  if(!ok&&r.alt)ok=test(D,A,r.alt);
  return ok;
}
/* Highest points a pathway can give: rules are grouped by question, and for each question we take the best
   total over every possible answer value (ordinal list, or values named in the rules). */
function rules(p,goal){return (p.by_goal&&p.by_goal[goal])||p;}
function pathwayMax(D,p,goal){
  var by={},tot=0;(rules(p,goal).points||[]).forEach(function(r){(by[r.q]=by[r.q]||[]).push(r);});
  Object.keys(by).forEach(function(q){var rs=by[q],vals=(D.ordinals[q]||[]).slice();
    rs.forEach(function(r){(r.in||[]).forEach(function(v){vals.push(v);});if('eq' in r)vals.push(r.eq);if(r.min)vals.push(r.min);});
    var best=0;vals.forEach(function(v){var s=0;rs.forEach(function(r){var A={};A[q]=v;if(q==='french'||q==='german'||q==='japanese'){A.langs={};A.langs[q]=v;}
      if(q==='prior')A.prior={type:'work',country:v};if(q==='family_tie')A.family_tie={type:v};var rr=r.country?Object.assign({},r,{country:undefined}):r;if(test(D,A,rr))s+=r.pts;});if(s>best)best=s;});
    tot+=best;});
  return tot;
}
var MAXC={};
function goalMax(D,goal){if(MAXC[goal]!=null)return MAXC[goal];var m=0;D.pathways.forEach(function(p){if(p.goal.indexOf(goal)>-1)m=Math.max(m,pathwayMax(D,p,goal));});
  return (MAXC[goal]=m);}
function lifestyle(D,A,country){var L=D.lifestyle,n=0;(A.priorities||[]).forEach(function(p){var m=L.map[p];if(m&&m.indexOf(country)>-1)n+=L.points_per_match;});return Math.min(n,L.max_points);}
function evalPathway(D,A,p){
  var R=rules(p,A.goal);
  var failed=(R.required||[]).filter(function(r){return !test(D,A,r);});
  if(p.paused_if&&test(D,A,p.paused_if)){var pf=Object.assign({},p,{note:p.paused_if.text,paused:true});return {p:pf,pts:0,passes:false,failed:[{paused:true}]};}
  var pts=(R.points||[]).reduce(function(s,r){return s+(test(D,A,r)?r.pts:0);},0);
  var pp=R===p?p:Object.assign({},p,{verify:R.verify,verify_note:R.verify_note||p.verify_note,note:R.band_note});
  return {p:pp,pts:pts,passes:failed.length===0,failed:failed};
}
/* citizens don't need a route to their own country */
var ISO2={Canada:'CA',UK:'GB',Ireland:'IE',NewZealand:'NZ',Australia:'AU',Germany:'DE',Spain:'ES',UAE:'AE',Singapore:'SG',Japan:'JP',UnitedStates:'US',Netherlands:'NL',Portugal:'PT',France:'FR'};
function own(A,c){return (A.passportCodes||[]).indexOf(ISO2[c])>-1;}
/* passport-based routes from gen/extra.py (EU free movement, working holiday). Placed at a fixed share of the goal maximum. */
function hasPP(A,list){return (A.passportCodes||[]).some(function(c){return list.indexOf(c)>-1;});}
function extraPathways(D,A){
  var out=[],g=A.goal,base=goalMax(D,g)+D.lifestyle.max_points,X=D.extra;
  if(X.eu.goal.indexOf(g)>-1&&hasPP(A,X.eu.passports))X.eu.countries.forEach(function(c){out.push({p:Object.assign({country:c,synthetic:true},X.eu),pts:Math.round(X.eu.fraction*base),passes:true,failed:[]});});
  X.wh.forEach(function(w){if(w.goal.indexOf(g)<0||!hasPP(A,w.passports))return;
    var ages=w.ages.slice();if(w.ages35&&hasPP(A,w.ages35))ages.push('33-39');
    var ok=ages.indexOf(A.age)>-1;out.push({p:Object.assign({synthetic:true},w),pts:Math.round(w.fraction*base),passes:ok,failed:ok?[]:[{q:'age',in:ages}]});});
  return out;
}
var BUDGET_TOP={'<5k':5000,'5-15k':15000,'15-40k':40000};
function overBudget(D,A,p){var c=D.extra.cost[p.id],top=BUDGET_TOP[A.budget];if(!c||!top)return null;
  var usd=c.amount*D.extra.usdPer[c.cur]*D.extra.margin;return usd>top?c:null;}
/* 20261020h: pathways with fewer than 40 possible points for the goal are capped at 'possible' (income/savings-threshold routes exempt) */
var CAP={minPts:40,exempt:['PT_D7','PT_D8','ES_NL','ES_DN','AE_REMOTE']};var BR={low:0,explore:1,possible:2,strong:3};
function bandE(D,e){var b=band(D,e.pct,e.passes);return e.capped&&b==='strong'?'possible':b;}
function band(D,pct,passes){var b=D.meta.bands;if(pct<b.explore)return 'low';if(!passes)return 'explore';return pct>=b.strong?'strong':pct>=b.possible?'possible':'explore';}
/* Returns {list: top 3-5 countries, removed: routes filtered by budget}. */
function score(D,A){
  var goal=A.goal,ex=A.exclude||[],by={},removed=[];
  var denom=goalMax(D,goal)+D.lifestyle.max_points;
  var evs=D.pathways.filter(function(p){return p.goal.indexOf(goal)>-1;}).map(function(p){return evalPathway(D,A,p);}).concat(extraPathways(D,A));
  evs.forEach(function(e){e.max=e.p.synthetic?null:pathwayMax(D,e.p,goal);e.den=e.p.synthetic?denom:e.max+D.lifestyle.max_points;e.capped=!e.p.synthetic&&e.max<CAP.minPts&&CAP.exempt.indexOf(e.p.id)<0;});
  evs.forEach(function(e){var c=e.p.country;if(ex.indexOf(c)>-1||own(A,c))return;var ob=overBudget(D,A,e.p);if(ob){removed.push({id:e.p.id,name:e.p.name,country:c,cost:ob});return;}(by[c]=by[c]||[]).push(e);});
  function pct(e,c){var d=e.den,s=e.pts+lifestyle(D,A,c);if(A.timeline==='<6m'&&!e.passes)s-=0.05*d;return d?Math.max(0,Math.min(100,Math.round(100*s/d))):0;}
  var list=Object.keys(by).map(function(c){
    var ev=by[c].map(function(e){e.pct=pct(e,c);e.band=bandE(D,e);return e;}).sort(function(a,b){return (b.passes-a.passes)||(BR[b.band]-BR[a.band])||(b.pct-a.pct);}),best=ev[0];
    return {country:c,score:best.pct,passes:best.passes,band:best.band,pathways:ev.map(function(e){var p=e.p;return {id:p.id,name:p.name,passes:e.passes,pct:e.pct,band:e.band,capped:e.capped,failed:e.failed,source:p.source,checked:p.checked,verify:p.verify,verify_note:p.verify_note,paused:!!p.paused,next_steps:p.next_steps,note:p.note,synthetic:!!p.synthetic,cost:D.extra.cost[p.id]||null};})};
  });
  list.sort(function(a,b){return (b.passes-a.passes)||(BR[b.band]-BR[a.band])||(b.score-a.score)||a.country.localeCompare(b.country);});
  return {list:list.slice(0,5),removed:removed,denom:denom};
}
/* Visit guidance for the goal "tour": general text + official checker, with a passport hint only where an official list was read. */
function tour(D,A){var codes=A.passportCodes||[],ex=A.exclude||[];
  return Object.keys(D.extra.tour).filter(function(c){return ex.indexOf(c)<0&&!own(A,c);}).map(function(c){var t=D.extra.tour[c],hint=null;
    if(codes.length){if(t.free&&codes.some(function(x){return t.free.indexOf(x)>-1;}))hint='free';
      else if(t.auth&&codes.some(function(x){return t.auth.indexOf(x)>-1;}))hint='auth';
      else if(t.maybe&&codes.some(function(x){return t.maybe.indexOf(x)>-1;}))hint='maybe';
      else if(t.auth)hint='visa';}
    return {country:c,t:t,hint:hint};});}
/* 20261020m: no goal question. Every pathway type is scored with that type's existing rules (scoring.json goal lists and by_goal
   rule sets), and results are grouped by type. Groups are ordered by their best country; 'merged' is the best entry per country across types. */
var TYPES=['work','study','family','invest','retire','remote'];
function rank(a,b){return (b.passes-a.passes)||(BR[b.band]-BR[a.band])||(b.score-a.score);}
function scoreAll(D,A,perType,hideLow){var groups=[],seen={},removed=[],best={};
  TYPES.forEach(function(g){var r=score(D,Object.assign({},A,{goal:g}));r.removed.forEach(function(x){if(!seen[x.id]){seen[x.id]=1;removed.push(x);}});
    r.list.forEach(function(c){var b=best[c.country];if(!b||rank(c,b)<0)best[c.country]=Object.assign({type:g},c);});
    var l=hideLow?r.list.filter(function(c){return c.band!=='low';}):r.list;
    if(l.length||hideLow)groups.push({type:g,list:l.slice(0,perType||3)});});
  /* hideLow: every type is returned; empty groups go last, in TYPES order */
  groups.sort(function(a,b){if(!a.list.length||!b.list.length)return (!a.list.length-!b.list.length)||TYPES.indexOf(a.type)-TYPES.indexOf(b.type);return rank(a.list[0],b.list[0])||TYPES.indexOf(a.type)-TYPES.indexOf(b.type);});
  var merged=Object.keys(best).map(function(k){return best[k];}).sort(function(a,b){return rank(a,b)||a.country.localeCompare(b.country);});
  return {groups:groups,merged:merged,removed:removed};}
/* 20261020o: results grouped by country. Same per-type scoring as scoreAll; keeps each pathway's best result
   (a pathway listed under several types keeps all its type labels), drops Low-fit pathways, and drops countries left with none. */
function byCountry(D,A){var C={},seen={},removed=[];
  TYPES.forEach(function(g){var r=score(D,Object.assign({},A,{goal:g}));r.removed.forEach(function(x){if(!seen[x.id]){seen[x.id]=1;removed.push(x);}});
    r.list.forEach(function(c){c.pathways.forEach(function(p){if(p.band==='low')return;var m=C[c.country]=C[c.country]||{},o=m[p.id];
      if(!o){m[p.id]=Object.assign({types:[g]},p);return;}if(o.types.indexOf(g)<0)o.types.push(g);
      if((BR[p.band]-BR[o.band])>0||(BR[p.band]===BR[o.band]&&p.pct>o.pct))m[p.id]=Object.assign({types:o.types},p);});});});
  var list=Object.keys(C).map(function(k){var ps=Object.keys(C[k]).map(function(i){return C[k][i];}).sort(function(a,b){return (b.passes-a.passes)||(BR[b.band]-BR[a.band])||(b.pct-a.pct);});
    return {country:k,pathways:ps,band:ps.reduce(function(b,p){return BR[p.band]>BR[b]?p.band:b;},ps[0].band),passes:ps.some(function(p){return p.passes;}),score:Math.max.apply(null,ps.map(function(p){return p.pct;}))};});
  list.sort(function(a,b){return rank(a,b)||a.country.localeCompare(b.country);});
  return {list:list,removed:removed};}

/* 20261022e: the applicant's top countries. byCountry() already drops low-fit pathways and anything over the stated budget.
   Order: has a pathway whose requirements are all met, best band, best pathway score, then number of fully met pathways,
   then number of viable pathways, then pathways with no published cost above the budget (all remaining fit), then name. */
var TOPN=5;
function topCountries(D,A,n){var R=byCountry(D,A);n=n||TOPN;
  /* 20261022e: intent. There is no goal question, so it is inferred: retirement or investment answers, or age 45+, mean study and
     working-holiday routes are left out of the ranking; younger applicants without those answers keep study routes first in each card. */
  var I=intent(A);
  if(I==='settled'){R.list=R.list.map(function(r){var ps=r.pathways.filter(function(p){return !isStudyLike(p);});if(!ps.length)return null;
    return Object.assign({},r,{pathways:ps,band:ps.reduce(function(b,p){return BR[p.band]>BR[b]?p.band:b;},ps[0].band),passes:ps.some(function(p){return p.passes;}),score:Math.max.apply(null,ps.map(function(p){return p.pct;}))});}).filter(Boolean);}
  else if(I==='study'){R.list.forEach(function(r){var st=r.pathways.filter(isStudyLike);if(st.length)r.pathways=st.concat(r.pathways.filter(function(p){return st.indexOf(p)<0;}));});}
  if(I==='settled')R.list.forEach(function(r){var w=r.pathways.filter(function(p){return (p.types||[]).some(function(t){return t==='retire'||t==='invest';});});if(w.length)r.pathways=w.concat(r.pathways.filter(function(p){return w.indexOf(p)<0;}));});
  R.list.forEach(function(r){if(A.job_offer===r.country){var w=r.pathways.filter(function(p){return p.passes&&(p.types||[]).indexOf('work')>-1;});if(w.length)r.pathways=w.concat(r.pathways.filter(function(p){return w.indexOf(p)<0;}));}r.nPass=r.pathways.filter(function(p){return p.passes;}).length;r.nViable=r.pathways.length;r.type=(r.pathways[0].types||[])[0];r.why=whyFits(D,A,r);});
  R.list.forEach(function(r){r.fitsIntent=I!=='settled'||r.pathways.some(function(p){return (p.types||[]).some(function(t){return t==='retire'||t==='invest'||t==='remote';});})?1:0;});
  var all=R.list.slice().sort(function(a,b){return (b.fitsIntent-a.fitsIntent)||rank(a,b)||(b.nPass-a.nPass)||(b.nViable-a.nViable)||a.country.localeCompare(b.country);});
  return {list:all.slice(0,n),total:all.length,removed:R.removed,n:n,intent:I};}
function isStudyLike(p){return /_STUDY$/.test(p.id||'')||/holiday/i.test(p.name||'')||((p.types||[]).length===1&&p.types[0]==='study');}
function intent(A){var old=['45-49','50-54','55+'].indexOf(A.age)>-1,inv=A.invest&&A.invest!=='no',pi=['3.5-5.5k','5.5k+'].indexOf(A.passive_income)>-1;
  if(old||inv||pi||A.funds==='1M+')return 'settled';if(['under18','18-24','25-32'].indexOf(A.age)>-1&&['0','<1','1-2'].indexOf(A.experience)>-1)return 'study';return '';}
var LANG={France:'french',Germany:'german',Japan:'japanese',Canada:'french'},LN={french:'French',german:'German',japanese:'Japanese'};
function whyFits(D,A,r){var c=r.country,top=r.pathways[0],T={};r.pathways.forEach(function(p){(p.types||[]).forEach(function(t){T[t]=1;});});var h=[];
  if(own(A,c))h.push('your passport');
  if(A.job_offer===c)h.push('your job offer here');
  if(A.family_tie&&A.family_tie.country===c&&A.family_tie.type!=='none')h.push('your family here');
  if(A.prior&&A.prior.country===c&&A.prior.type!=='none')h.push('your earlier '+A.prior.type+' here');
  var l=LANG[c];if(l&&A.langs&&A.langs[l]&&A.langs[l]!=='none')h.push('your '+LN[l]);
  if(T.work&&A.occupation&&A.experience&&['0','<1'].indexOf(A.experience)<0)h.push('your work experience');
  if((T.work||T.study)&&/master|phd|doctor|bachelor/i.test(A.education||''))h.push('your '+(/master/i.test(A.education)?'master’s degree':/phd|doctor/i.test(A.education)?'doctorate':'degree'));
  if((T.work||T.study)&&/C1|C2|B2/.test(A.english||''))h.push('your English');
  if(T.invest&&A.invest&&A.invest!=='no')h.push('your investment funds');
  var PI=A.passive_income&&A.passive_income!=='none';if(T.retire&&PI)h.push('your passive income');
  if(T.remote&&PI&&!T.retire)h.push('your remote income');
  h=h.filter(function(x,i){return h.indexOf(x)===i;}).slice(0,3);
  var lead=r.nPass?('Your answers meet the listed requirements for '+(r.nPass===1?'1 pathway':r.nPass+' pathways')+' here'):('Your answers match part of '+(r.nViable===1?'1 pathway':r.nViable+' pathways')+' here');
  lead+=', led by '+top.name+'.';
  if(h.length)lead+=' What helps: '+(h.length>1?h.slice(0,-1).join(', ')+' and '+h[h.length-1]:h[0])+'.';
  return lead;}
function declarationNote(A){return ['criminal','health','refusal'].some(function(k){return A.decl&&A.decl[k]==='yes';});}
var api={TYPES:TYPES,TOPN:TOPN,topCountries:topCountries,whyFits:whyFits,byCountry:byCountry,scoreAll:scoreAll,bandOf:bandOf,own:own,score:score,tour:tour,test:test,evalPathway:evalPathway,lifestyle:lifestyle,goalMax:goalMax,pathwayMax:pathwayMax,declarationNote:declarationNote};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PFEngine=api;
})(this);
