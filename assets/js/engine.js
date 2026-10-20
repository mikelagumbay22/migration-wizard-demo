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
function declarationNote(A){return ['criminal','health','refusal'].some(function(k){return A.decl&&A.decl[k]==='yes';});}
var api={bandOf:bandOf,own:own,score:score,tour:tour,test:test,evalPathway:evalPathway,lifestyle:lifestyle,goalMax:goalMax,pathwayMax:pathwayMax,declarationNote:declarationNote};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PFEngine=api;
})(this);
