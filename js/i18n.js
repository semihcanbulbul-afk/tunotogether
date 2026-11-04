(function(){
  const DICT = {
    language:'Language',home:'Home',modes:'Game Modes',rules:'Rules',community:'Community',download:'Download Desktop',createRoom:'Create Room',joinRoom:'Join Room',online:'ONLINE',crazy:'THE CRAZIEST UNO EXPERIENCE',compete:'TAKE THE',rise:'COMPETITION TO THE TOP!',heroText:"Create a room instantly, share the invite link, chat with friends and start the card chaos. In Play Uno, the table is yours.",activePlayers:'Active Players',openRooms:'Open Rooms',lowLatency:'Low Latency',playersPerRoom:'Players per room',gameModes:'Game modes',languages:'Languages',freeToPlay:'Free to Play',windowsApp:'Windows desktop',desktopKicker:'DESKTOP APP',desktopTitle:'Your table is ready. Get the game.',desktopDesc:'Download the UnoPlay setup in one click. Open the desktop app after installation and join your friends.',directDownload:'Direct download',imageUpload:'Attach a photo',imageUploading:'Uploading photo…',imageTooLarge:'Photos must be 5 MB or smaller.',imageUploadFailed:'Could not upload the photo. Try again.',sharedPhoto:'Photo shared in chat',changeTheme:'Change theme',themeMidnight:'Midnight',themeAurora:'Aurora',themeClassic:'Classic',stage:'PLAY UNO ON STAGE',feel:'FEEL THE GAME',trailerText:'Discover the pace, card chaos and table atmosphere of Play Uno.',playUno:'PLAY UNO',trailerTitle:'BUILD THE TABLE. INVITE FRIENDS. SHUFFLE THE CARDS.',trailerDesc:'Enter the lobby with one link, chat and move into the desktop game.',openSound:'Sound Off',closeSound:'Sound On',threeSteps:'THREE STEPS',how:'HOW IT WORKS',howDesc:'Start using the room system in seconds.',step1:'Create your room',step1d:'Choose your avatar, mode and player capacity.',step2:'Share the link',step2d:'Send the room code to friends and fill the lobby.',step3:'Start with the app',step3d:'Move to the desktop game when everyone is ready.',frames:'TABLE SNAPSHOTS',world:'THE PLAY UNO WORLD',table:'CHOOSE YOUR TABLE',modesTitle:'GAME MODES',modesDesc:'Pick a mode to open the room creation screen with your choice.',chooseCreate:'SELECT & CREATE',standardDesc:'Balanced matches with classic UNO rules.',brutalDesc:'+6, stacking and harsher penalties.',doubleDesc:'Switch to the dark side with double-sided cards.',partyDesc:'Crowded tables and high tempo.',fastDesc:'Race with very short turn timers.',tableRules:'TABLE RULES',rulesTitle:'RULES',rulesDesc:'A clear, simple and fun table setup for everyone in Play Uno rooms.',r1:'Match a color or number.',r1d:'Play a matching color, number or special card.',r2:'Remember to call UNO.',r2d:'Call UNO when you have one card left and alert the table.',r3:'Respect turn order.',r3d:'Make your move on your turn and keep the game flowing.',culture:'PLAYER CULTURE',communityTitle:'COMMUNITY',communityDesc:'Core principles for Play Uno tables.',respect:'Respectful chat',respectD:'Use chat without disturbing other players.',fair:'Fair play',fairD:'Avoid cheating, spam and intentional disruption.',invite:'Share your invite',inviteD:'Fill your table by sharing the room code or link.',newRoom:'Create New Room',createDesc:'Choose your name, avatar and game mode. Your room code will be created instantly.',username:'Username',chooseAvatar:'Choose your avatar',mode:'Game mode',playerCount:'Player count',capacity:'This room can hold up to {n} players.',creating:'Creating room...',created:'Room created.',joinDesc:'Use the room code or full room link sent by your friend.',roomCode:'Room code or link',roomCodePlaceholder:'Room code or room link',joining:'Joining room...',goRoom:'Enter Room',setupRoom:'Create Room',avatarSelect:'Choose avatar',missingName:'Enter a username.',selectPlayers:'Choose the player count.',enterRoom:'Enter the room code or link.',downloadConfig:'The download URL is not configured.',installerMissing:'The installer file is missing from the server.',installerRejected:'The installer failed the integrity check. Upload a verified build.',requestFailed:'Request failed ({n})',roomLobby:'Room Lobby',roomLobbyDesc:'Invite friends, choose your avatar and wait until everyone is ready.',roomCodeLabel:'ROOM CODE',inviteCopy:'Copy Invite',backHome:'Home',roomSetup:'Table Setup',roomSetupDesc:'When everyone is ready, the room owner can control the transition to the game.',players:'players',waiting:'WAITING',readyStatus:'READY',ready:'READY',notReady:'NOT READY',editProfile:'Edit My Profile',hostYou:'You are the room owner. Use Start Game when everyone is ready.',hostOther:'The room owner will show the required next step when starting.',start:'START GAME',roomRules:'Room Rules',roomRule1:'Room capacity is set by the player count chosen when the room is created.',roomRule2:'The room owner can change the mode and start the game.',roomRule3:'Starting the game checks that every player has the desktop app.',voice:'Voice Chat',voiceOff:'Microphone off',voiceNeeded:'Desktop app required',voiceActive:'Voice chat active',voiceMuted:'Microphone muted',voiceJoin:'Join Voice',micOn:'Unmute microphone',micOff:'Mute microphone',voiceLeave:'Leave voice chat',realtime:'REAL TIME',roomChat:'Room Chat',messagePlaceholder:'Write a message...',send:'Send message',profileEdit:'Edit Profile',profileDesc:'Change the name and avatar shown in the room.',save:'Save',warningStart:'Game Could Not Start',warningHost:'A player in the room has not downloaded the desktop app yet. The game can start after everyone downloads it.',warningPlayer:'The game cannot start until every player in the room has downloaded the desktop app. Download the app and then get ready again.',voiceWarning:'You need the Play Uno desktop app to use voice chat.',kicked:'Removed From Room',kickedText:'The room owner removed you from the room.',allDownloaded:'Everyone has downloaded the app. Open the Play Uno desktop app to continue.',minimumPlayers:'At least two players must be in the room to start.',everyoneReady:'Everyone in the room must be ready before starting.',copyDone:'Room link copied.',roomNotFound:'This room could not be found or your room identity is invalid.',voiceUnsupported:'Your browser does not support voice chat.',micDenied:'Microphone permission was not granted.',roomFull:'The room is full. This room was created for {n} players.',roomGone:'This room no longer exists.',noNewPlayers:'This room is no longer accepting new players.',invalidIdentity:'Invalid room identity.',onlyHost:'Only the room owner can change the mode.',invalidMode:'Invalid game mode.',onlyHostKick:'Only the room owner can remove players.',playerNotFound:'Player not found.',emptyMessage:'Message cannot be empty.',onlyHostStart:'Only the room owner can start the game.',capacityRange:'Room capacity must be between {min} and {max} players.',standard:'Standard',brutal:'Brutal',double:'Double Side',party:'Party',fast:'Fast'
  };

  try { localStorage.setItem('playuno_lang', 'en'); } catch {}
  const lang = 'en';

  function t(key, vars) {
    let value = DICT[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replaceAll(`{${k}}`, String(v));
      }
    }
    return value;
  }

  function setLanguage() {
    apply();
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.documentElement.lang = 'en';
  }

  function modeLabel(mode) {
    const map = {
      'Standart': 'standard', 'Standard': 'standard',
      'Acımasız': 'brutal', 'Brutal': 'brutal',
      'Çift Taraf': 'double', 'Double Side': 'double',
      'Parti': 'party', 'Party': 'party',
      'Hızlı': 'fast', 'Fast': 'fast'
    };
    return t(map[mode] || mode);
  }

  window.PlayUnoI18n = { t, setLanguage, apply, modeLabel, getLang: () => 'en' };
  document.addEventListener('DOMContentLoaded', () => { apply(); });
})();
