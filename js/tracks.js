/* ==========================================================================
   TRACKS.JS — track library grid for the Tracks page
   ========================================================================== */
(function () {
  const grid = document.getElementById('track-grid');
  const search = document.getElementById('song-search');
  const genre = document.getElementById('genre-filter');
  let searchTerm = '', genreTerm = 'all';

  function fmtTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function render() {
    let list = [...window.TRACKS];
    if (genreTerm !== 'all') list = list.filter(t => t.genre === genreTerm);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
    }
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No tracks found.</div>`;
      return;
    }
    list.forEach(track => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <div class="song-thumb">${track.title[0]}</div>
        <div class="s-title">${track.title}</div>
        <div class="s-artist">${track.artist}</div>
        <div class="track-card-row">
          <span class="genre-pill">${track.genre}</span>
          <span class="song-dur mono">${fmtTime(track.duration)}</span>
        </div>`;
      card.addEventListener('click', () => {
        localStorage.setItem('neon-play-request', track.id);
        window.location.href = 'player.html';
      });
      grid.appendChild(card);
    });
  }

  search?.addEventListener('input', () => { searchTerm = search.value; render(); });
  genre?.addEventListener('change', () => { genreTerm = genre.value; render(); });

  render();
})();
