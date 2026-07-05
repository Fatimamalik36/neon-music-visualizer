/* ==========================================================================
   PLAYER.JS — playlist UI + transport controls for the Player page
   ========================================================================== */
(function () {
  const engine = window.neonAudio;
  const LS_FAV = 'neon-viz-favorites';
  const LS_RECENT = 'neon-viz-recent';

  let currentIndex = -1;
  let currentList = [...window.TRACKS];
  let shuffleOn = false;
  let repeatOn = false;
  let activeTab = 'all';
  let searchTerm = '';
  let genreTerm = 'all';
  let seekDragging = false;

  const favorites = new Set(JSON.parse(localStorage.getItem(LS_FAV) || '[]'));
  let recent = JSON.parse(localStorage.getItem(LS_RECENT) || '[]');

  const els = {
    list: document.getElementById('song-list'),
    search: document.getElementById('song-search'),
    genre: document.getElementById('genre-filter'),
    tabs: document.querySelectorAll('.tab-btn'),
    title: document.getElementById('track-title'),
    artist: document.getElementById('track-artist'),
    playBtn: document.getElementById('btn-play'),
    playIcon: document.getElementById('play-icon'),
    prevBtn: document.getElementById('btn-prev'),
    nextBtn: document.getElementById('btn-next'),
    shuffleBtn: document.getElementById('btn-shuffle'),
    repeatBtn: document.getElementById('btn-repeat'),
    seek: document.getElementById('seek-bar'),
    vol: document.getElementById('vol-bar'),
    curTime: document.getElementById('time-current'),
    durTime: document.getElementById('time-duration'),
    miniEq: document.getElementById('mini-eq'),
    albumArt: document.getElementById('album-art'),
    albumCanvas: document.getElementById('album-canvas'),
    dropZone: document.getElementById('upload-drop'),
    fileInput: document.getElementById('file-input'),
  };

  const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  const ICON_PAUSE = '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>';

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function saveFavs() { localStorage.setItem(LS_FAV, JSON.stringify([...favorites])); }
  function pushRecent(id) {
    recent = [id, ...recent.filter(r => r !== id)].slice(0, 8);
    localStorage.setItem(LS_RECENT, JSON.stringify(recent));
  }

  /* -------------------------------------------------------------------- */
  /*  Filtering                                                            */
  /* -------------------------------------------------------------------- */
  function filteredTracks() {
    let list = [...window.TRACKS];
    if (activeTab === 'recent') list = recent.map(id => list.find(t => t.id === id)).filter(Boolean);
    if (activeTab === 'favorites') list = list.filter(t => favorites.has(t.id));
    if (genreTerm !== 'all') list = list.filter(t => t.genre === genreTerm);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    return list;
  }

  function renderList() {
    currentList = filteredTracks();
    els.list.innerHTML = '';
    if (!currentList.length) {
      els.list.innerHTML = `<div class="empty-state">No tracks match — try a different search or filter.</div>`;
      return;
    }
    currentList.forEach((track) => {
      const isPlaying = window.TRACKS[currentIndex] && window.TRACKS[currentIndex].id === track.id;
      const card = document.createElement('div');
      card.className = 'song-card' + (isPlaying ? ' playing' : '');
      card.innerHTML = `
        <div class="song-thumb">${track.title[0]}</div>
        <div class="song-meta">
          <div class="s-title">${track.title}</div>
          <div class="s-artist">${track.artist} · ${track.genre}</div>
        </div>
        <span class="song-dur mono">${fmtTime(track.duration)}</span>
        <button class="song-fav ${favorites.has(track.id) ? 'active' : ''}" title="Favorite">
          <svg viewBox="0 0 24 24" fill="${favorites.has(track.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
        </button>
        <button class="song-play-mini" title="Play"><svg viewBox="0 0 24 24" fill="currentColor">${ICON_PLAY}</svg></button>`;
      card.querySelector('.song-fav').addEventListener('click', (e) => {
        e.stopPropagation();
        favorites.has(track.id) ? favorites.delete(track.id) : favorites.add(track.id);
        saveFavs();
        renderList();
        showToast(favorites.has(track.id) ? 'Added to favorites' : 'Removed from favorites');
      });
      card.addEventListener('click', () => loadTrack(window.TRACKS.findIndex(t => t.id === track.id), true));
      els.list.appendChild(card);
    });
  }

  /* -------------------------------------------------------------------- */
  /*  Track loading / transport                                            */
  /* -------------------------------------------------------------------- */
  async function loadTrack(index, autoplay) {
    if (index < 0 || index >= window.TRACKS.length) return;
    currentIndex = index;
    const track = window.TRACKS[index];
    els.title.textContent = track.title;
    els.artist.textContent = track.artist;
    pushRecent(track.id);
    renderList();
    showToast(`Loading "${track.title}"…`);
    const buffer = await engine.generateDemoBuffer(track);
    els.durTime.textContent = fmtTime(buffer.duration);
    els.seek.max = Math.floor(buffer.duration);
    if (autoplay) {
      engine.playBuffer(buffer, 0);
      setPlayingUI(true);
      showToast(`Now playing "${track.title}"`);
    } else {
      engine.buffer = buffer;
      engine.offset = 0;
    }
    engine.onEnded = handleTrackEnd;
  }

  function handleTrackEnd() {
    if (repeatOn) { loadTrack(currentIndex, true); return; }
    goNext();
  }

  function goNext() {
    if (!window.TRACKS.length) return;
    let next;
    if (shuffleOn) {
      next = Math.floor(Math.random() * window.TRACKS.length);
    } else {
      next = (currentIndex + 1) % window.TRACKS.length;
    }
    loadTrack(next, true);
  }
  function goPrev() {
    if (!window.TRACKS.length) return;
    const prev = (currentIndex - 1 + window.TRACKS.length) % window.TRACKS.length;
    loadTrack(prev, true);
  }

  function setPlayingUI(isPlaying) {
    els.playIcon.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
    els.miniEq.classList.toggle('paused', !isPlaying);
    els.albumArt.classList.toggle('spinning', isPlaying);
  }

  function togglePlay() {
    if (currentIndex === -1) { loadTrack(0, true); return; }
    if (engine.playing) {
      engine.pause();
      setPlayingUI(false);
    } else {
      engine.resume();
      setPlayingUI(true);
    }
  }

  /* -------------------------------------------------------------------- */
  /*  UI wiring                                                            */
  /* -------------------------------------------------------------------- */
  els.playBtn.addEventListener('click', togglePlay);
  els.nextBtn.addEventListener('click', goNext);
  els.prevBtn.addEventListener('click', goPrev);
  els.shuffleBtn.addEventListener('click', () => {
    shuffleOn = !shuffleOn;
    els.shuffleBtn.classList.toggle('toggled', shuffleOn);
    showToast(shuffleOn ? 'Shuffle on' : 'Shuffle off');
  });
  els.repeatBtn.addEventListener('click', () => {
    repeatOn = !repeatOn;
    els.repeatBtn.classList.toggle('toggled', repeatOn);
    showToast(repeatOn ? 'Repeat on' : 'Repeat off');
  });

  els.seek.addEventListener('mousedown', () => seekDragging = true);
  els.seek.addEventListener('touchstart', () => seekDragging = true);
  els.seek.addEventListener('input', () => { els.curTime.textContent = fmtTime(+els.seek.value); });
  function releaseSeek() {
    if (seekDragging) { engine.seek(+els.seek.value); seekDragging = false; }
  }
  els.seek.addEventListener('change', releaseSeek);
  els.seek.addEventListener('mouseup', releaseSeek);
  els.seek.addEventListener('touchend', releaseSeek);

  els.vol.addEventListener('input', () => engine.setVolume(els.vol.value / 100));

  els.search.addEventListener('input', () => { searchTerm = els.search.value; renderList(); });
  els.genre.addEventListener('change', () => { genreTerm = els.genre.value; renderList(); });
  els.tabs.forEach(tab => tab.addEventListener('click', () => {
    els.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    renderList();
  }));

  /* -- File upload / drag & drop ------------------------------------------ */
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  ['dragover', 'dragenter'].forEach(evt => els.dropZone.addEventListener(evt, (e) => { e.preventDefault(); els.dropZone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(evt => els.dropZone.addEventListener(evt, (e) => { e.preventDefault(); els.dropZone.classList.remove('drag'); }));
  els.dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  async function handleFile(file) {
    if (!file || !file.type.startsWith('audio')) { if (file) showToast('Please drop a valid audio file'); return; }
    showToast(`Decoding "${file.name}"…`);
    const arrayBuffer = await file.arrayBuffer();
    try {
      const buffer = await engine.decodeFile(arrayBuffer);
      currentIndex = -1;
      els.title.textContent = file.name.replace(/\.[^.]+$/, '');
      els.artist.textContent = 'Uploaded track';
      els.durTime.textContent = fmtTime(buffer.duration);
      els.seek.max = Math.floor(buffer.duration);
      engine.playBuffer(buffer, 0);
      engine.onEnded = () => setPlayingUI(false);
      setPlayingUI(true);
      showToast('Playing your track');
    } catch (err) {
      showToast('Could not decode that file');
    }
  }

  /* -- Keyboard shortcuts --------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowLeft') goPrev();
    if (e.code === 'ArrowRight') goNext();
  });

  /* -- Album art canvas: animated audio-reactive rings --------------------- */
  function drawAlbumArt() {
    const canvas = els.albumCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = els.albumArt.clientWidth;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    function frame() {
      const cw = canvas.width / dpr, ch = canvas.height / dpr;
      ctx.clearRect(0, 0, cw, ch);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim();
      const g = ctx.createLinearGradient(0, 0, cw, ch);
      g.addColorStop(0, accent2); g.addColorStop(1, accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);

      let bands = { bass: 0.2, mid: 0.2, treble: 0.2 };
      if (engine.playing) bands = engine.getBandEnergies();

      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      for (let i = 0; i < 3; i++) {
        const r = 30 + i * 26 + bands.bass * 46;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.5 - i * 0.14})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      requestAnimationFrame(frame);
    }
    frame();
  }

  /* -- Playback progress loop ---------------------------------------------- */
  function progressLoop() {
    if (currentIndex !== -1 || (engine.mode === 'buffer' && engine.buffer)) {
      if (!seekDragging) {
        const t = engine.getCurrentTime();
        els.seek.value = t;
        els.curTime.textContent = fmtTime(t);
      }
    }
    requestAnimationFrame(progressLoop);
  }

  /* -------------------------------------------------------------------- */
  renderList();
  drawAlbumArt();
  progressLoop();

  // Handoff from Tracks page: play a specific track requested via localStorage
  const requestedId = localStorage.getItem('neon-play-request');
  if (requestedId) {
    localStorage.removeItem('neon-play-request');
    const idx = window.TRACKS.findIndex(t => t.id === requestedId);
    if (idx !== -1) loadTrack(idx, true);
  }

  window.addEventListener('neon-theme-change', () => {}); // canvas reads live var each frame
})();
