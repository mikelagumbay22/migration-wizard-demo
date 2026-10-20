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
