// Sign-in, tabs and the LIVE tab. Recording to Google Drive works as MPA Academy's (portal/rec.js, 1.11.2026): the page holds a
// drive.file token, the camera+mic are recorded in 5 s pieces, each piece a finished Drive file, in
// "Santoshi Band live" > "YYYY-MM-DD HH-MM" of the auroville.community account. The stream itself is VDO.Ninja.
(function(){
var $=function(i){return document.getElementById(i)},CLIENT='260195292447-iucr95n1oc2burmm9o598ilh43vhompd.apps.googleusercontent.com';
function say(t,c){var m=$('msg');m.textContent=t;m.className=c||''}
function enter(){$('in').style.display='none';$('app').style.display='block';$('sub').textContent='Private';window.loadPics&&window.loadPics();status()}
fetch('/api/me').then(function(r){if(r.ok)enter()});
$('g').onclick=function(){var m=$('msg0');
 if(!window.google||!google.accounts||!google.accounts.oauth2){m.textContent='Google did not load: try again';return}
 google.accounts.oauth2.initTokenClient({client_id:CLIENT,scope:'openid email profile',prompt:'select_account',callback:function(t){
  if(!t.access_token){m.textContent='Google said no';return}
  fetch('/api/google',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({access_token:t.access_token})}).then(function(r){
   if(r.ok)enter();else m.textContent=r.status===403?'This Google address is not allowed.':'Sign-in failed, try again'})}}).requestAccessToken()};
function tab(n){[1,2].forEach(function(i){$('t'+i).classList.toggle('on',i===n);$('p'+i).classList.toggle('on',i===n)})}
$('t1').onclick=function(){tab(1)};$('t2').onclick=function(){tab(2)};
$('out').onclick=function(){fetch('/api/logout').then(function(){location.reload()})};

var token=null,tokenAt=0,folder=null,stream=null,rec=null,n=0,sending=Promise.resolve(),pending=0,failed=0,ext='webm',live=false;
var FMT=[['video/mp4;codecs=avc1.64001F,mp4a.40.2','mp4'],['video/webm;codecs=vp8,opus','webm'],['video/webm','webm']].map(function(a){return{mime:a[0],ext:a[1]}}).find(function(f){return window.MediaRecorder&&MediaRecorder.isTypeSupported(f.mime)})||{mime:'',ext:'webm'};
function getToken(gesture){return new Promise(function(res,rej){
 if(token&&Date.now()-tokenAt<45*60e3)return res(token);
 if(!window.google||!google.accounts)return rej(new Error('Google did not load'));
 google.accounts.oauth2.initTokenClient({client_id:CLIENT,scope:'https://www.googleapis.com/auth/drive.file',prompt:gesture?'':'',
  callback:function(t){t.access_token?(token=t.access_token,tokenAt=Date.now(),res(token)):rej(new Error('Google said no'))},error_callback:function(e){rej(new Error('Google popup: '+(e&&e.type)))}}).requestAccessToken()})}
function drive(path,init){init=init||{};return getToken().then(function(t){init.headers=Object.assign({authorization:'Bearer '+t},init.headers||{});return fetch('https://www.googleapis.com'+path,init)})}
function mkFolder(name,parent){
 var q=encodeURIComponent("name='"+name+"' and mimeType='application/vnd.google-apps.folder' and trashed=false and "+(parent?"'"+parent+"' in parents":"'root' in parents"));
 return drive('/drive/v3/files?fields=files(id)&q='+q).then(function(r){return r.json()}).then(function(f){
  if(f.files&&f.files[0])return f.files[0].id;
  return drive('/drive/v3/files?fields=id',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/vnd.google-apps.folder',parents:parent?[parent]:undefined})}).then(function(r){return r.json()}).then(function(j){return j.id})})}
function two(x){return String(x).padStart(2,'0')}
function sendPiece(blob,name,tries){tries=tries||0;
 return drive('/upload/drive/v3/files?uploadType=resumable',{method:'POST',headers:{'content-type':'application/json; charset=UTF-8','x-upload-content-type':blob.type||'video/webm'},body:JSON.stringify({name:name,parents:[folder],mimeType:blob.type||'video/webm'})})
 .then(function(r){var u=r.headers.get('location');if(!u)throw new Error('no upload address '+r.status);return fetch(u,{method:'PUT',body:blob})})
 .then(function(r){if(!r.ok)throw new Error('put '+r.status)})
 .catch(function(e){if(tries>=4){failed++;return}return new Promise(function(s){setTimeout(s,1500*(tries+1))}).then(function(){return sendPiece(blob,name,tries+1)})})}
var buf=[],bytes=0,since=0,stamp='';
function flush(){if(!bytes)return;var blob=new Blob(buf,{type:FMT.mime.split(';')[0]||'video/webm'});buf=[];bytes=0;since=Date.now();
 var name='Santoshi-live_'+stamp+'_c'+String(++n).padStart(4,'0')+'.'+FMT.ext;pending++;
 sending=sending.then(function(){return sendPiece(blob,name)}).then(function(){pending--;recinfo()})}
function recinfo(){$('recinfo').textContent=live?('Recording to Drive: Santoshi Band live / '+stamp+' · '+n+' pieces sent'+(failed?(' · '+failed+' failed'):'')):''}
function status(){fetch('/api/live',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'status'})}).then(function(r){return r.json()}).then(function(j){
 if(j.live&&!stream){setBtn(true);say('Live is on (started on another device). STOP ends it.','good')}})}
function setBtn(on){live=on;var b=$('go');b.textContent=on?'STOP':'GO LIVE';b.classList.toggle('stop',on)}
function call(a){return fetch('/api/live',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:a})}).then(function(r){return r.json()})}
$('go').onclick=function(){live?stop():start()};
function start(){
 var d=new Date();stamp=d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate())+' '+two(d.getHours())+'-'+two(d.getMinutes());n=0;failed=0;
 say('Starting…');var rec_ok=true;
 // the Drive permission first (it needs this tap), then the camera, then the stream
 getToken(true).then(function(){return mkFolder('Santoshi Band live')}).then(function(root){return mkFolder(stamp,root)}).then(function(id){folder=id})
 .catch(function(e){rec_ok=false;say('Recording to Drive is OFF ('+e.message+'). Going live anyway.','bad')})
 .then(function(){return navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})})
 .then(function(s){stream=s;return call('go')}).then(function(j){
  if(!j.live)throw new Error('server did not go live');
  $('sndw').style.display='block';$('snd').src=j.push;setBtn(true);
  if(!$('snd').dataset.ctl){$('snd').dataset.ctl=1;var fr=$('snd'),nz=function(on){fr.src=fr.src.replace(/&(denoise|echocancellation)=[^&]*/g,'')+'&denoise='+(on?1:0)+'&echocancellation='+(on?1:0)};
   window.SBCtl('send',$('sndw'),{frame:fr,stream:stream,onNoise:nz})}
  if(rec_ok&&window.MediaRecorder){rec=new MediaRecorder(stream,{mimeType:FMT.mime||undefined,videoBitsPerSecond:3e6,audioBitsPerSecond:192000});since=Date.now();
   rec.ondataavailable=function(e){if(e.data&&e.data.size){buf.push(e.data);bytes+=e.data.size}if(bytes>=4e6||Date.now()-since>=5000)flush()};rec.onstop=flush;rec.start(1000)}
  say('The Santoshi Band is live. The banner shows on the site.','good');recinfo()})
 .catch(function(e){say('Could not start: '+e.message,'bad');if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null}})}
function stop(){say('Stopping…');
 var done=function(){return sending.then(function(){return call('stop')}).then(function(){
  if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null}$('snd').removeAttribute('src');$('sndw').style.display='none';setBtn(false);recinfo();say('Stopped. The banner is gone.'+(n?' '+n+' pieces are in Drive.':''),'good')})};
 if(rec&&rec.state!=='inactive'){rec.onstop=function(){flush();done()};rec.stop()}else done()}
})();
