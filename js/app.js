const AVATARS = [
  'aria.svg','atlas.svg','dylan.svg','ethan.svg','iris.svg','leo.svg','luna.svg','man.svg','mason.svg','mia.svg',
  'moonbyte.svg','noah.svg','nova.svg','pixel.svg','raven.svg','selena.svg','violet.svg','woman.svg','zen.svg','custom.svg'
];

const MODES = ['Standart','Acımasız','Çift Taraf','Parti','Hızlı'];
const PLAYER_LIMITS = [2,3,4,5,6,7,8,9,10];
let createAvatar = AVATARS[0];
let joinAvatar = AVATARS[1];
let selectedMode = 'Standart';
let selectedMaxPlayers = 4;
const $ = (id) => document.getElementById(id);
const t = (key, vars) => window.PlayUnoI18n?.t(key, vars) || key;
const modeLabel = (mode) => window.PlayUnoI18n?.modeLabel(mode) || mode;

function toast(message) {
  const el = $('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(window.__playUnoToast);
  window.__playUnoToast = setTimeout(() => el.classList.add('hidden'), 3200);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function avatarMarkup(avatar, selected = false, type = 'create') {
  return `<button type="button" class="avatar-option ${selected ? 'selected' : ''}" data-avatar="${escapeHtml(avatar)}" data-avatar-type="${type}" aria-label="Avatar seç"><img src="assets/avatars/${encodeURIComponent(avatar)}" alt="" draggable="false"><span class="avatar-check"><i class="fa-solid fa-check"></i></span></button>`;
}

function fillAvatars(containerId, type) {
  const box = $(containerId);
  if (!box) return;
  const current = type === 'create' ? createAvatar : joinAvatar;
  box.innerHTML = AVATARS.map((avatar) => avatarMarkup(avatar, avatar === current, type)).join('');
  box.querySelectorAll('.avatar-option').forEach((button) => {
    button.addEventListener('click', () => {
      box.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      if (type === 'create') createAvatar = button.dataset.avatar;
      else joinAvatar = button.dataset.avatar;
      PlayUnoAudio?.play('check', 0.35);
    });
  });
}

function updateCapacityPreview() {
  const select = $('createMaxPlayers');
  const preview = $('capacityPreview');
  if (!select || !preview) return;
  const count = Number(select.value) || 4;
  preview.innerHTML = `<img src="assets/icons/users.svg" alt=""><span>${t('capacity',{n:count})}</span>`;
}

function fillPlayerLimits() {
  const select = $('createMaxPlayers');
  if (!select) return;
  select.innerHTML = PLAYER_LIMITS.map((count) => `<option value="${count}">${count} ${t('players')}</option>`).join('');
  select.value = String(selectedMaxPlayers);
  updateCapacityPreview();
}

function openCreateModal(mode = 'Standart') {
  selectedMode = MODES.includes(mode) ? mode : 'Standart';
  selectedMaxPlayers = Number(localStorage.getItem('playuno_max_players')) || 4;
  const select = $('createMode');
  select.innerHTML = MODES.map((item) => `<option value="${escapeHtml(item)}" ${item === selectedMode ? 'selected' : ''}>${escapeHtml(modeLabel(item))}</option>`).join('');
  fillPlayerLimits();
  $('createName').value = localStorage.getItem('playuno_name') || '';
  fillAvatars('createAvatars', 'create');
  $('createModal').classList.remove('hidden');
  PlayUnoAudio?.play('click', 0.28);
  setTimeout(() => $('createName').focus(), 30);
}

function openJoinModal() {
  const params = new URLSearchParams(location.search);
  $('joinCode').value = params.get('room') || '';
  $('joinName').value = localStorage.getItem('playuno_name') || '';
  fillAvatars('joinAvatars', 'join');
  $('joinModal').classList.remove('hidden');
  PlayUnoAudio?.play('click', 0.28);
  setTimeout(() => $('joinCode').focus(), 30);
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add('hidden');
}

function parseRoomCode(raw) {
  let value = String(raw || '').trim();
  try {
    const url = new URL(value);
    const fromUrl = url.searchParams.get('room');
    if (fromUrl) value = fromUrl;
    else {
      const last = url.pathname.split('/').filter(Boolean).pop();
      if (last) value = last;
    }
  } catch {
    const match = value.match(/[?&]room=([^&#]+)/i);
    if (match) value = decodeURIComponent(match[1]);
  }
  return value.replace(/^#?UNO-/i, '').trim().toUpperCase();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {...options, headers:{'Content-Type':'application/json',...(options.headers || {})}});
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || `İstek başarısız (${response.status})`);
  return data;
}

async function submitCreateRoom() {
  const button = $('createSubmitBtn');
  const name = $('createName').value.trim();
  const mode = $('createMode').value;
  const maxPlayers = Number($('createMaxPlayers').value);
  if (!name) { toast(t('missingName')); $('createName').focus(); return; }
  if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 10) { toast(t('selectPlayers')); return; }
  button.disabled = true; button.textContent = t('creating');
  try {
    const data = await requestJson('/api/rooms', {method:'POST', body:JSON.stringify({name, avatar:createAvatar, mode, maxPlayers, lang:window.PlayUnoI18n?.getLang?.()||'tr'})});
    localStorage.setItem('playuno_name', name);
    localStorage.setItem('playuno_max_players', String(maxPlayers));
    localStorage.setItem(`playuno_identity_${String(data.room.code).toUpperCase()}`, JSON.stringify(data.identity));
    PlayUnoAudio?.play('create', 0.45);
    location.href = `room/?room=${encodeURIComponent(data.room.code)}`;
  } catch (error) { toast(error.message); PlayUnoAudio?.play('deny', 0.3); }
  finally { button.disabled = false; button.textContent = t('setupRoom'); }
}

async function submitJoinRoom() {
  const button = $('joinSubmitBtn');
  const code = parseRoomCode($('joinCode').value);
  const name = $('joinName').value.trim();
  if (!code) { toast(t('enterRoom')); return; }
  if (!name) { toast(t('missingName')); $('joinName').focus(); return; }
  button.disabled = true; button.textContent = t('joining');
  try {
    const data = await requestJson(`/api/rooms/${encodeURIComponent(code)}/join`, {method:'POST',body:JSON.stringify({name,avatar:joinAvatar,lang:window.PlayUnoI18n?.getLang?.()||'tr'})});
    localStorage.setItem('playuno_name', name);
    localStorage.setItem(`playuno_identity_${String(data.room.code).toUpperCase()}`, JSON.stringify(data.identity));
    PlayUnoAudio?.play('join', 0.45);
    location.href = `room/?room=${encodeURIComponent(data.room.code)}`;
  } catch (error) { toast(error.message); PlayUnoAudio?.play('deny', 0.3); }
  finally { button.disabled = false; button.textContent = t('goRoom'); }
}

function downloadDesktopGame(e) {
  PlayUnoAudio?.play('download', 0.45);
  const target = e?.currentTarget || e?.target;
  if (!target || target.tagName !== 'A') {
    const url = String(window.PLAY_UNO_CONFIG?.DOWNLOAD_URL || '/UnoPlay-Setup-100.zip').trim();
    window.location.href = url;
  }
  return true;
}

function toggleSiteSound() {
  const muted = PlayUnoAudio.toggleMute();
  const button = $('soundToggleBtn');
  if (button) {
    button.innerHTML = muted ? '<i class="fa-solid fa-volume-xmark"></i><span>Ses Kapalı</span>' : '<i class="fa-solid fa-volume-high"></i><span>Ses Açık</span>';
    button.classList.toggle('muted', muted);
  }
  if (!muted) PlayUnoAudio.play('success', 0.3);
}

function setTrailerSound() {
  const video = $('trailerVideo');
  if (!video) return;
  video.muted = !video.muted;
  const btn = $('trailerSoundBtn');
  if (btn) btn.innerHTML = video.muted ? `<i class="fa-solid fa-volume-xmark"></i> ${t('openSound')}` : `<i class="fa-solid fa-volume-high"></i> ${t('closeSound')}`;
  PlayUnoAudio?.play('click', 0.2);
}

function bootParticles() {
  const canvas = $('particleCanvas'); if (!canvas) return;
  const context = canvas.getContext('2d'); let width=0,height=0;
  const particles = Array.from({length:42},()=>({x:Math.random(),y:Math.random(),size:Math.random()*1.8+.5,speed:Math.random()*.00035+.00012,alpha:Math.random()*.35+.08}));
  function resize(){width=canvas.width=window.innerWidth;height=canvas.height=window.innerHeight;}
  function frame(){context.clearRect(0,0,width,height);for(const p of particles){p.y-=p.speed;if(p.y<-.02)p.y=1.02;context.fillStyle=`rgba(250,204,21,${p.alpha})`;context.beginPath();context.arc(p.x*width,p.y*height,p.size,0,Math.PI*2);context.fill();}requestAnimationFrame(frame);}
  resize(); window.addEventListener('resize',resize); frame();
}

function bindEvents() {
  $('headerDownloadBtn')?.addEventListener('click', downloadDesktopGame);
  $('downloadSectionBtn')?.addEventListener('click', downloadDesktopGame);
  $('heroDownloadBtn')?.addEventListener('click', downloadDesktopGame);
  $('headerCreateBtn')?.addEventListener('click', () => openCreateModal());
  $('heroCreateBtn')?.addEventListener('click', () => openCreateModal());
  $('heroJoinBtn')?.addEventListener('click', openJoinModal);
  $('soundToggleBtn')?.addEventListener('click', toggleSiteSound);
  $('trailerSoundBtn')?.addEventListener('click', setTrailerSound);
  document.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => openCreateModal(card.dataset.mode)));
  $('createSubmitBtn')?.addEventListener('click', submitCreateRoom);
  $('joinSubmitBtn')?.addEventListener('click', submitJoinRoom);
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => {if(event.target===backdrop) backdrop.classList.add('hidden');}));
  $('createMode')?.addEventListener('change', (event) => {selectedMode=event.target.value; PlayUnoAudio?.play('check',.25);});
  $('createMaxPlayers')?.addEventListener('change', (event) => {selectedMaxPlayers=Number(event.target.value);updateCapacityPreview();PlayUnoAudio?.play('check',.25);});
  $('createName')?.addEventListener('keydown',(event)=>{if(event.key==='Enter')submitCreateRoom();});
  $('joinCode')?.addEventListener('keydown',(event)=>{if(event.key==='Enter')$('joinName').focus();});
  $('joinName')?.addEventListener('keydown',(event)=>{if(event.key==='Enter')submitJoinRoom();});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeModal('createModal');closeModal('joinModal');}});
}

window.openCreateModal=openCreateModal; window.openJoinModal=openJoinModal; window.closeModal=closeModal; window.submitCreateRoom=submitCreateRoom; window.submitJoinRoom=submitJoinRoom; window.downloadDesktopGame=downloadDesktopGame;

document.addEventListener('playuno:language',()=>{
  fillAvatars('createAvatars','create'); fillAvatars('joinAvatars','join'); fillPlayerLimits();
  const select=$('createMode'); if(select){select.innerHTML=MODES.map(item=>`<option value="${escapeHtml(item)}">${escapeHtml(modeLabel(item))}</option>`).join('');select.value=selectedMode;}
  const soundBtn=$('soundToggleBtn'); const muted=PlayUnoAudio?.isMuted?.(); if(soundBtn){soundBtn.innerHTML=muted?`<i class="fa-solid fa-volume-xmark"></i><span>${t('openSound')}</span>`:`<i class="fa-solid fa-volume-high"></i><span>${t('closeSound')}</span>`;}
});

document.addEventListener('DOMContentLoaded',()=>{
  fillAvatars('createAvatars','create'); fillAvatars('joinAvatars','join'); fillPlayerLimits();
  $('createMode').innerHTML=MODES.map(item=>`<option value="${escapeHtml(item)}">${escapeHtml(modeLabel(item))}</option>`).join(''); $('createMode').value=selectedMode;
  const muted=PlayUnoAudio?.isMuted?.(); const soundBtn=$('soundToggleBtn'); if(soundBtn){soundBtn.innerHTML=muted?`<i class="fa-solid fa-volume-xmark"></i><span>${t('openSound')}</span>`:`<i class="fa-solid fa-volume-high"></i><span>${t('closeSound')}</span>`;soundBtn.classList.toggle('muted',muted);}
  bindEvents(); PlayUnoAudio?.bind(); bootParticles();
});

function initLiveStats() {
  const playersEl = $('statActivePlayers');
  const roomsEl = $('statOpenRooms');
  if (!playersEl || !roomsEl) return;

  let basePlayers = 138 + Math.floor(Math.random() * 18);
  let baseRooms = 18 + Math.floor(Math.random() * 7);

  function animateCount(el, start, end, duration) {
    let startTime = null;
    function step(now) {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const val = Math.floor(progress * (end - start) + start);
      el.textContent = val.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = end.toLocaleString();
    }
    requestAnimationFrame(step);
  }

  animateCount(playersEl, 0, basePlayers, 1200);
  animateCount(roomsEl, 0, baseRooms, 1200);

  setInterval(() => {
    const deltaPlayers = Math.random() > 0.35 ? (Math.floor(Math.random() * 3) + 1) : -1;
    basePlayers = Math.max(120, basePlayers + deltaPlayers);
    playersEl.textContent = basePlayers.toLocaleString();

    if (Math.random() > 0.55) {
      const deltaRooms = Math.random() > 0.4 ? 1 : -1;
      baseRooms = Math.max(14, baseRooms + deltaRooms);
      roomsEl.textContent = baseRooms.toLocaleString();
    }
  }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  initLiveStats();
});
