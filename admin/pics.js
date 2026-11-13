// PICTURES tab: the private collection, fetched only through the signed-in /api/pics
var L=[],cur=0,lb=document.getElementById('lb'),im=lb.querySelector('img');
function url(f){return '/api/pics?f='+encodeURIComponent(f)}
function show(i){cur=(i+L.length)%L.length;var s=L[cur];im.src=url(s.file);document.getElementById('cap').textContent=s.name+' · '+(s.kind?s.kind+' · ':'')+'v'+s.version+' · '+s.date;lb.classList.add('on')}
function close_(){lb.classList.remove('on');im.removeAttribute('src')}
function fill(id,items){var g=document.getElementById(id);if(!items.length){g.innerHTML='<p class="none">No sheets yet</p>';return}
items.forEach(function(s){var b=document.createElement('button');b.className='card';var i=L.length;L.push(s);
var a=document.createElement('img');a.loading='lazy';a.alt=s.name;a.src=url(s.file);b.appendChild(a);
var d=document.createElement('div');var n=document.createElement('b');n.textContent=s.name;var m=document.createElement('span');m.textContent=(s.kind?s.kind+' · ':'')+'v'+s.version+' · '+s.date;d.appendChild(n);d.appendChild(m);b.appendChild(d);
b.onclick=function(){show(i)};g.appendChild(b)})}
window.loadPics=function(){fetch('/api/pics').then(function(r){return r.ok?r.json():[]}).catch(function(){return[]}).then(function(a){L=[];
fill('people',a.filter(function(s){return s.section==='people'}));fill('instruments',a.filter(function(s){return s.section!=='people'}))})};
document.getElementById('x').onclick=close_;document.getElementById('pv').onclick=function(){show(cur-1)};document.getElementById('nx').onclick=function(){show(cur+1)};
lb.onclick=function(e){if(e.target===lb)close_()};
document.addEventListener('keydown',function(e){if(!lb.classList.contains('on'))return;if(e.key==='Escape')close_();else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1)});
