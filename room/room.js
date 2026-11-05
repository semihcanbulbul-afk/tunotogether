const AVATARS = [
  'aria.svg','atlas.svg','dylan.svg','ethan.svg','iris.svg','leo.svg','luna.svg','man.svg','mason.svg','mia.svg',
  'moonbyte.svg','noah.svg','nova.svg','pixel.svg','raven.svg','selena.svg','violet.svg','woman.svg','zen.svg','custom.svg'
];
const MODES = ['Standart','Acımasız','Çift Taraf','Parti','Hızlı'];
const CONFIG = window.PLAY_UNO_CONFIG || {MAX_PLAYERS:10, DOWNLOAD_URL:''};
const $ = (id) => document.getElementById(id);
const t = (key, vars) => window.PlayUnoI18n?.t(key, vars) || key;
const modeLabel = (mode) => window.PlayUnoI18n?.modeLabel(mode) || mode;
const params = new URLSearchParams(location.search);
const code = String(params.get('room') || '').replace(/^#?UNO-/i,'').trim().toUpperCase();
let identity = null;
let room = null;
let socket = null;
let profileAvatar = AVATARS[0];
let leaving = false;
let voiceStream = null;
let voiceMuted = false;
const seenChatMessages = new Set();
const voicePeers = new Map();
const voiceAudio = new Map();

function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.remove('hidden');clearTimeout(window.__playUnoRoomToast);window.__playUnoRoomToast=setTimeout(()=>el.classList.add('hidden'),3200);}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function avatarUrl(file){return `../assets/avatars/${encodeURIComponent(file || AVATARS[0])}`;}
function savedIdentity(){try{return JSON.parse(localStorage.getItem(`playuno_identity_${code}`)||'null')}catch{return null}}
async function api(url, options={}){const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});let data={};try{data=await response.json()}catch{}if(!response.ok)throw new Error(data.error||t('requestFailed',{n:response.status}));return data;}
function roomCapacity(){return Number(room?.maxPlayers)||Number(CONFIG.MAX_PLAYERS)||10;}
function renderVoiceList(){
  const box=$('voiceList'); if(!box||!room)return;
  box.innerHTML=room.players.map(player=>{
    const active=player.id===identity.playerId?Boolean(voiceStream):voicePeers.has(player.id);
    return `<div class="voice-user"><span class="voice-dot ${active?'on':''}"></span><span>${escapeHtml(player.name)}${player.id===identity.playerId?' · '+(window.PlayUnoI18n?.getLang?.()==='en'?'You':window.PlayUnoI18n?.getLang?.()==='de'?'Du':'Sen'):''}</span></div>`;
  }).join('');
}
function updateVoiceUI(){
  const joined=Boolean(voiceStream),status=$('voiceStatus'),join=$('voiceJoinBtn'),mute=$('voiceMuteBtn'),leave=$('voiceLeaveBtn');
  const me=room?.players?.find(player=>player.id===identity?.playerId);
  const appReady=Boolean(me?.downloaded);
  if(status){status.textContent=joined?(voiceMuted?t('voiceMuted'):t('voiceActive')):(appReady?t('voiceOff'):t('voiceNeeded'));status.classList.toggle('live',joined);}
  if(join){join.disabled=joined || !appReady; join.title=appReady?t('voiceJoin'):t('voiceNeeded');}
  if(mute){mute.disabled=!joined;mute.innerHTML=voiceMuted?'<i class="fa-solid fa-microphone-slash"></i>':'<i class="fa-solid fa-microphone"></i>';mute.title=voiceMuted?t('micOn'):t('micOff');}
  if(leave)leave.disabled=!joined; renderVoiceList();
}
function removeVoicePeer(peerId){
  const pc=voicePeers.get(peerId);if(pc)pc.close();voicePeers.delete(peerId);
  const audio=voiceAudio.get(peerId);if(audio){audio.pause();audio.srcObject=null;}voiceAudio.delete(peerId);renderVoiceList();
}
async function createVoicePeer(peerId,initiator){
  if(!socket||!window.RTCPeerConnection||voicePeers.has(peerId))return;
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
  voicePeers.set(peerId,pc);
  if(voiceStream)voiceStream.getTracks().forEach(track=>pc.addTrack(track,voiceStream));
  pc.onicecandidate=e=>{if(e.candidate)socket.emit('voice:ice',{to:peerId,candidate:e.candidate});};
  pc.ontrack=e=>{let audio=voiceAudio.get(peerId);if(!audio){audio=new Audio();audio.autoplay=true;audio.playsInline=true;voiceAudio.set(peerId,audio);}if(e.streams?.[0])audio.srcObject=e.streams[0];audio.play().catch(()=>{});};
  pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc.connectionState))removeVoicePeer(peerId);else renderVoiceList();};
  if(initiator){const offer=await pc.createOffer();await pc.setLocalDescription(offer);socket.emit('voice:offer',{to:peerId,offer:pc.localDescription});}
  renderVoiceList();
}
async function startVoice(){
  if(voiceStream)return;
  const me=room?.players?.find(player=>player.id===identity?.playerId);
  if(!me?.downloaded){showWarning(t('voiceNeeded'),t('voiceWarning'),true,false);return;}
  if(!navigator.mediaDevices?.getUserMedia){toast(t('voiceUnsupported'));return;}
  try{
    voiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    voiceMuted=false;socket?.emit('voice:join');
    for(const player of room.players)if(player.id!==identity.playerId && player.downloaded && identity.playerId<player.id)await createVoicePeer(player.id,true);
    updateVoiceUI();PlayUnoAudio?.play('success',.3);
  }catch{toast(t('micDenied'));PlayUnoAudio?.play('deny',.25);}
}
function stopVoice(){
  socket?.emit('voice:leave');voicePeers.forEach(pc=>pc.close());voicePeers.clear();voiceAudio.forEach(a=>{a.pause();a.srcObject=null;});voiceAudio.clear();
  voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;voiceMuted=false;updateVoiceUI();
}
function toggleVoiceMute(){if(!voiceStream)return;voiceMuted=!voiceMuted;voiceStream.getAudioTracks().forEach(t=>t.enabled=!voiceMuted);updateVoiceUI();PlayUnoAudio?.play('check',.22);}

function renderAvatars(){
  const box=$('profileAvatars'); if(!box)return;
  box.innerHTML=AVATARS.map(avatar=>`<button type="button" class="avatar-option ${avatar===profileAvatar?'selected':''}" data-avatar="${escapeHtml(avatar)}" aria-label="Avatar seç"><img src="${avatarUrl(avatar)}" alt="" draggable="false"><span class="avatar-check"><i class="fa-solid fa-check"></i></span></button>`).join('');
  box.querySelectorAll('.avatar-option').forEach(button=>button.addEventListener('click',()=>{box.querySelectorAll('.avatar-option').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');profileAvatar=button.dataset.avatar;PlayUnoAudio?.play('check',.35);}));
}

function renderPlayers(){
  const grid=$('players'); const me=room.players.find(p=>p.id===identity.playerId); const capacity=roomCapacity(); grid.innerHTML='';
  for(let index=0;index<capacity;index++){
    const player=room.players[index]; const card=document.createElement('div');
    if(!player){card.className='player-card empty-card';card.innerHTML=`<div class="player-avatar"><i class="fa-solid fa-user-plus"></i></div><span style="color:#625c68;font-size:9px;font-weight:800">${t('players')}</span>`;grid.appendChild(card);continue;}
    card.className='player-card';
    const hostText=player.isHost?`<span class="host">${window.PlayUnoI18n?.getLang?.()==='en'?'Room Owner':window.PlayUnoI18n?.getLang?.()==='de'?'Besitzer':'Oda Sahibi'}</span>`:(window.PlayUnoI18n?.getLang?.()==='en'?'Player':window.PlayUnoI18n?.getLang?.()==='de'?'Spieler':'Oyuncu');
    const readyText=player.isReady?`<span class="ready">${t('readyStatus')}</span>`:t('notReady');
    const youText=player.id===identity.playerId?' · Sen':'';
    card.innerHTML=`<div class="player-main"><div class="player-avatar"><img src="${avatarUrl(player.avatar)}" alt=""></div><div style="min-width:0;flex:1"><span class="player-name">${escapeHtml(player.name)}${youText}</span><span class="player-meta">${hostText} · ${readyText}</span></div></div><div class="player-actions">${me?.isHost&&player.id!==me.id?`<button class="kick-btn" type="button" data-kick="${escapeHtml(player.id)}" data-sound="deny"><i class="fa-solid fa-user-xmark"></i> ${window.PlayUnoI18n?.getLang?.()==='en'?'Remove Player':window.PlayUnoI18n?.getLang?.()==='de'?'Spieler entfernen':'Oyuncuyu Çıkar'}</button>`:''}</div>`;
    grid.appendChild(card);
  }
  grid.querySelectorAll('[data-kick]').forEach(button=>button.addEventListener('click',()=>kickPlayer(button.dataset.kick)));
  PlayUnoAudio?.bind(grid);
}

function render(){
  if(!room||!identity)return;
  const capacity=roomCapacity();
  $('roomCode').textContent=`#UNO-${room.code}`;
  $('roomCapacity').innerHTML=`<i class="fa-solid fa-users"></i> ${room.players.length} / ${capacity} ${t('players')}`;
  const select=$('modeSelect'); select.innerHTML=MODES.map(mode=>`<option value="${escapeHtml(mode)}">${escapeHtml(modeLabel(mode))}</option>`).join('');select.value=room.mode;
  const me=room.players.find(p=>p.id===identity.playerId);
  $('readyBtn').textContent=me?.isReady?t('notReady'):t('ready');$('readyBtn').classList.toggle('active',Boolean(me?.isReady));$('readyBtn').disabled=!me;
  $('startBtn').disabled=!me?.isHost;$('modeSelect').disabled=!me?.isHost;
  $('hostHint').textContent=me?.isHost?t('hostYou'):t('hostOther');
  const waiting=room.status==='waiting';$('roomStatus').className=`status-pill ${waiting?'':'ready'}`;$('roomStatus').innerHTML=waiting?`<i class="fa-solid fa-clock"></i> ${t('waiting')}`:`<i class="fa-solid fa-check"></i> ${t('readyStatus')}`;
  renderPlayers();
  renderVoiceList();
}

function renderChat(messages){const box=$('chat');box.innerHTML='';seenChatMessages.clear();(messages||[]).forEach(message=>appendChat(message,false));box.scrollTop=box.scrollHeight;}
function appendChat(message,scroll=true){
  if(message.id&&seenChatMessages.has(message.id))return;
  if(message.id){seenChatMessages.add(message.id);if(seenChatMessages.size>250)seenChatMessages.delete(seenChatMessages.values().next().value);}
  const box=$('chat'),element=document.createElement('div');element.className=`chat-message ${message.system?'chat-system':''}`;
  if(message.system)element.textContent=message.message;
  else{const photo=message.imageUrl?`<a class="chat-image-link" href="${escapeHtml(message.imageUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(message.imageUrl)}" alt="${escapeHtml(t('sharedPhoto'))}" loading="lazy"></a>`:'';element.innerHTML=`<b>${escapeHtml(message.name)}</b>${message.message?`<span>: ${escapeHtml(message.message)}</span>`:''}${photo}`;}
  box.appendChild(element);if(scroll)box.scrollTop=box.scrollHeight;if(!message.system)PlayUnoAudio?.play('message',.22);
}
async function uploadChatImage(){
  const input=$('chatImageInput'),button=$('chatImageBtn'),file=input.files?.[0];if(!file)return;
  if(file.size>5*1024*1024){toast(t('imageTooLarge'));input.value='';return;}
  button.disabled=true;toast(t('imageUploading'));
  try{
    const lang=window.PlayUnoI18n?.getLang?.()||'tr';
    const response=await fetch(`/api/rooms/${encodeURIComponent(code)}/chat-image?lang=${encodeURIComponent(lang)}`,{method:'POST',headers:{Authorization:`Bearer ${identity.token}`,'Content-Type':file.type},body:file});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error||t('requestFailed',{n:response.status}));
    appendChat(data.message);input.value='';
  }catch(error){toast(error.message||t('imageUploadFailed'));}
  finally{button.disabled=false;}
}
let warningLeavesRoom=false;
function showWarning(title,message,showDownload=true,leaveOnClose=false){warningLeavesRoom=leaveOnClose;$('warningTitle').textContent=title||t('warningStart');$('warningText').textContent=message||'';const button=$('warningDownloadBtn');button.classList.toggle('hidden',!showDownload);$('warningModal').classList.remove('hidden');PlayUnoAudio?.play('warning',.35);}
function closeWarning(){warningLeavesRoom=false;$('warningModal').classList.add('hidden');}
async function closeWarningAction(){if(warningLeavesRoom){warningLeavesRoom=false;$('warningModal').classList.add('hidden');await leaveRoom();return;}closeWarning();}
function closeProfileModal(){$('profileModal').classList.add('hidden');}


async function downloadAndMark(e){
  PlayUnoAudio?.play('download', 0.45);
  try{
    await api(`/api/rooms/${encodeURIComponent(code)}/downloaded`,{method:'POST',body:JSON.stringify({token:identity.token,lang:window.PlayUnoI18n?.getLang?.()||'tr'})});
    localStorage.setItem('playuno_downloaded','true');
  }catch(err){}
  const target = e?.currentTarget || e?.target;
  if (!target || target.tagName !== 'A') {
    const url = String(CONFIG.DOWNLOAD_URL || '/UnoPlay-Setup-100.zip').trim();
    window.location.href = url;
  }
}
async function toggleReady(){try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/ready`,{method:'POST',body:JSON.stringify({token:identity.token,lang:window.PlayUnoI18n?.getLang?.()||'tr'})});room=data.room;PlayUnoAudio?.play('check',.35);render();}catch(error){toast(error.message);}}
async function changeMode(mode){try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/mode`,{method:'POST',body:JSON.stringify({token:identity.token,mode})});room=data.room;PlayUnoAudio?.play('check',.25);render();}catch(error){toast(error.message);render();}}
async function startGame(){PlayUnoAudio?.play('start',.45);try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/start`,{method:'POST',body:JSON.stringify({token:identity.token,lang:window.PlayUnoI18n?.getLang?.()||'tr'})});if(data.blocked&&data.message)showWarning(data.title||'Oyuna Geçilemiyor',data.message);}catch(error){toast(error.message);PlayUnoAudio?.play('deny',.3);}}
async function kickPlayer(playerId){try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/kick`,{method:'POST',body:JSON.stringify({token:identity.token,playerId})});room=data.room;PlayUnoAudio?.play('deny',.3);render();}catch(error){toast(error.message);}}
async function sendChat(event){event.preventDefault();const input=$('chatInput');const message=input.value.trim();if(!message)return;try{await api(`/api/rooms/${encodeURIComponent(code)}/chat`,{method:'POST',body:JSON.stringify({token:identity.token,message})});input.value='';PlayUnoAudio?.play('click',.22);}catch(error){toast(error.message);}}
async function copyInvite(){const url=`${location.origin}/room/?room=${encodeURIComponent(code)}`;try{await navigator.clipboard.writeText(url);toast(t('copyDone'));PlayUnoAudio?.play('success',.35);}catch{window.prompt('Oda linki',url);}}
async function leaveRoom(){stopVoice();if(!identity||!code){location.href='/';return;}try{await api(`/api/rooms/${encodeURIComponent(code)}/leave`,{method:'POST',body:JSON.stringify({token:identity.token,lang:window.PlayUnoI18n?.getLang?.()||'tr'})});}catch{}localStorage.removeItem(`playuno_identity_${code}`);if(socket)socket.disconnect();location.href='/';}
function openProfileModal(){const me=room?.players.find(p=>p.id===identity.playerId);$('profileName').value=me?.name||'';profileAvatar=me?.avatar||AVATARS[0];renderAvatars();$('profileModal').classList.remove('hidden');PlayUnoAudio?.play('click',.25);}
async function saveProfile(){const name=$('profileName').value.trim();if(!name){toast(t('missingName'));$('profileName').focus();return;}try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/profile`,{method:'POST',body:JSON.stringify({token:identity.token,name,avatar:profileAvatar})});room=data.room;localStorage.setItem('playuno_name',name);closeProfileModal();PlayUnoAudio?.play('success',.35);render();}catch(error){toast(error.message);}}

function updateSoundButton(){const muted=PlayUnoAudio?.isMuted?.();const button=$('soundToggleBtn');if(!button)return;button.innerHTML=muted?`<i class="fa-solid fa-volume-xmark"></i><span>${t('openSound')}</span>`:`<i class="fa-solid fa-volume-high"></i><span>${t('closeSound')}</span>`;button.classList.toggle('muted',muted);}
function toggleSiteSound(){const muted=PlayUnoAudio.toggleMute();updateSoundButton();if(!muted)PlayUnoAudio.play('success',.3);}
function connectSocket(){if(!window.io){toast(t('requestFailed',{n:'realtime'}));return;}socket=window.io({auth:{roomCode:room.code,token:identity.token,lang:window.PlayUnoI18n?.getLang?.()||'tr'},transports:['websocket','polling']});socket.on('room:state',(data)=>{room=data.room;render();renderChat(data.messages||[]);renderVoiceList();});
  socket.on('room:chat',(message)=>appendChat(message));
  socket.on('voice:peer-joined',async({playerId})=>{const peer=room?.players?.find(p=>p.id===playerId);if(voiceStream&&peer?.downloaded&&identity.playerId<playerId)await createVoicePeer(playerId,true);});
  socket.on('voice:offer',async({from,offer})=>{if(!voiceStream)return;await createVoicePeer(from,false);const pc=voicePeers.get(from);if(!pc)return;await pc.setRemoteDescription(offer);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);socket.emit('voice:answer',{to:from,answer:pc.localDescription});});
  socket.on('voice:answer',async({from,answer})=>{const pc=voicePeers.get(from);if(pc)await pc.setRemoteDescription(answer);});
  socket.on('voice:ice',async({from,candidate})=>{const pc=voicePeers.get(from);if(pc)try{await pc.addIceCandidate(candidate);}catch{}});
  socket.on('voice:peer-left',({playerId})=>removeVoicePeer(playerId));socket.on('voice:blocked',(data)=>{stopVoice();showWarning(data.title,data.message,true,false);});socket.on('room:start-blocked',(data)=>showWarning(data.title,data.message,Boolean(data.showDownload),Boolean(data.leaveRoom)));socket.on('room:kicked',()=>{stopVoice();localStorage.removeItem(`playuno_identity_${code}`);showWarning(t('kicked'),t('kickedText'),false,false);});socket.on('connect_error',(error)=>toast(`${t('requestFailed',{n:error.message})}`));}

async function boot(){if(!code){location.href='/';return;}identity=savedIdentity();if(!identity){location.href=`../?room=${encodeURIComponent(code)}`;return;}try{const data=await api(`/api/rooms/${encodeURIComponent(code)}/state?lang=${encodeURIComponent(window.PlayUnoI18n?.getLang?.()||'tr')}`,{headers:{Authorization:`Bearer ${identity.token}`}});room=data.room;render();renderChat(data.messages||[]);connectSocket();}catch(error){localStorage.removeItem(`playuno_identity_${code}`);toast(t('roomNotFound'));setTimeout(()=>location.href='../',1000);}}

function bindEvents(){
  $('copyInviteBtn').addEventListener('click',copyInvite);$('leaveTopBtn').addEventListener('click',()=>leaveRoom());$('readyBtn').addEventListener('click',toggleReady);$('profileBtn').addEventListener('click',openProfileModal);$('profileCloseBtn').addEventListener('click',closeProfileModal);$('profileSaveBtn').addEventListener('click',saveProfile);$('modeSelect').addEventListener('change',event=>changeMode(event.target.value));$('startBtn').addEventListener('click',startGame);$('chatForm').addEventListener('submit',sendChat);$('chatImageBtn').addEventListener('click',()=>$('chatImageInput').click());$('chatImageInput').addEventListener('change',uploadChatImage);$('warningDownloadBtn').addEventListener('click',downloadAndMark);$('warningCloseBtn').addEventListener('click',closeWarningAction);$('soundToggleBtn').addEventListener('click',toggleSiteSound);$('voiceJoinBtn').addEventListener('click',startVoice);$('voiceMuteBtn').addEventListener('click',toggleVoiceMute);$('voiceLeaveBtn').addEventListener('click',stopVoice);
  document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target!==backdrop)return;if(backdrop.id==='warningModal')closeWarningAction();else if(backdrop.id==='profileModal')closeProfileModal();}));
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!$('warningModal').classList.contains('hidden'))closeWarningAction();else closeProfileModal();});
}

document.addEventListener('playuno:language',()=>{if(room)render();updateVoiceUI();updateSoundButton();renderAvatars();});

document.addEventListener('DOMContentLoaded',()=>{renderAvatars();updateSoundButton();bindEvents();PlayUnoAudio?.bind();boot();});
window.addEventListener('beforeunload',()=>{socket?.emit('voice:leave');});
