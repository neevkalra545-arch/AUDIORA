// ============================================================
// audiora — Main Application Script
// Fixed & improved: playlist navigation, playback, likes, UI
// ============================================================

// API Config — always use backend server for consistency
var API_BASE_URL = 'http://localhost:3000/api';

// ── App State ────────────────────────────────────────────────
let currentTrack = null;
let isPlaying = false;
let isMuted = false;
let currentVolume = 80;
let queue = [];
let currentQueueIndex = -1;
let shuffleQueue = [];
let isShuffle = false;
let isRepeat = 'off'; // 'off' | 'one' | 'all'
let viewHistory = ['home'];
let currentHistoryIndex = 0;
let currentPlaylistId = null; // tracks which playlist is open

// LocalStorage Playlists & Liked Songs
let playlists = JSON.parse(localStorage.getItem('audiora_playlists')) || {};
let likedSongs = JSON.parse(localStorage.getItem('audiora_liked_songs')) || [];

// Progress polling timer
let progressTimer = null;
let isDraggingSeekbar = false;

// YouTube Player Instance
let ytPlayer = null;
let ytPlayerReady = false;
let currentVideoCandidates = [];
let currentVideoCandidateIndex = 0;

// Track Loading state (prevents race conditions)
let currentLoadId = 0;

// Karaoke Web Audio API State
let audioContext = null;
let micStream = null;
let micSource = null;
let currentEffectNode = null;
let outNode = null;

// ── YouTube IFrame API Setup ──────────────────────────────────
function initYouTubePlayer() {
    if (ytPlayer) return;
    if (!window.YT || !window.YT.Player) return;

    ytPlayer = new YT.Player('youtubePlayerDiv', {
        height: '200',
        width: '200',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0,
            'modestbranding': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

window.onYouTubeIframeAPIReady = function () {
    console.log('YouTube API callback triggered');
    initYouTubePlayer();
};

const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(tag);

if (window.YT && window.YT.Player) {
    initYouTubePlayer();
}

function onPlayerReady(event) {
    console.log('YouTube Player API Ready');
     ytPlayerReady = true;

    console.log("ytPlayer =", ytPlayer);
    console.log("playVideo =", typeof ytPlayer.playVideo);
    console.log("cueVideoById =", typeof ytPlayer.cueVideoById);

    ytPlayer.setVolume(currentVolume);
    updateVolumeSlider(currentVolume);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
        updatePlayerUI(true);
        startProgressPolling();
        clearPlaybackError();
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
        updatePlayerUI(false);
        stopProgressPolling();
    } else if (event.data === YT.PlayerState.ENDED) {
        isPlaying = false;
        stopProgressPolling();
        handleTrackEnded();
    }
}

function onPlayerError(event) {
    console.error('YouTube Player Error:', event.data);
    // 150/101 = embedding disabled; 100 = video not found; 2/5 = invalid params
    tryNextVideoCandidate();
}

// ── App Initialization ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    loadPlaylistsList();
    renderHomeContent();
    setupGreeting();

    // Search-related loaders must be off by default (shown only during active searches)
    // Force-hide on load (some CSS/JS may toggle visibility before DOMContentLoaded completes).
    const searchLoadingEl = document.getElementById('searchLoading');
    if (searchLoadingEl) {
        searchLoadingEl.classList.add('hidden');
        searchLoadingEl.style.display = 'none';
    }
    const lyricsPasteLoadingEl = document.getElementById('lyricsPasteLoading');
    if (lyricsPasteLoadingEl) {
        lyricsPasteLoadingEl.classList.add('hidden');
        lyricsPasteLoadingEl.style.display = 'none';
    }


    initLyricsPasteUI();
});

function setupGreeting() {
    const el = document.getElementById('greetingText');
    if (!el) return;
    const h = new Date().getHours();
    if (h < 12) el.innerText = 'Good Morning ☀️';
    else if (h < 18) el.innerText = 'Good Afternoon 🌤️';
    else el.innerText = 'Good Evening 🌙';
}

// ── Home Page Rendering ───────────────────────────────────────

/**
 * Main render function for the home page.
 * Renders playlist quick-grid and trending songs.
 */
function renderHomeContent() {
    renderHomePlaylistCards();
    renderTrendingSongs();
}

/**
 * Dynamically injects all 10 playlist cards into the quick-grid.
 */
function renderHomePlaylistCards() {
    const grid = document.getElementById('homePlaylistGrid');
    if (!grid) return;

    const db = window.MUSIC_DB;
    if (!db || !db.playlists) return;

    grid.innerHTML = db.playlists.map(pl => {
        const songCount = pl.songIds.length;
        return `
        <div class="quick-card playlist-quick-card" 
             data-playlist-id="${pl.id}" 
             role="button" tabindex="0"
             title="Open ${pl.name}">
            <div class="quick-art ${pl.gradient}">
                <i class="fa-solid ${pl.icon}"></i>
            </div>
            <div class="quick-card-info">
                <span class="quick-title">${pl.name}</span>
                <span class="quick-card-meta">${songCount} songs</span>
            </div>
            <button class="quick-play-btn" title="Play ${pl.name}" aria-label="Play ${pl.name}">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>`;
    }).join('');

    // Event bindings
    grid.querySelectorAll('.playlist-quick-card').forEach(card => {
        const id = card.getAttribute('data-playlist-id');

        card.addEventListener('click', (e) => {
            if (e.target.closest('.quick-play-btn')) return; // handled separately
            openPresetPlaylistView(id);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') openPresetPlaylistView(id);
        });

        const playBtn = card.querySelector('.quick-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playPresetPlaylist(id);
            });
        }
    });
}

/**
 * Renders the 25 trending songs grid on the home page.
 */
function renderTrendingSongs() {
    const container = document.getElementById('trendingSongsContainer');
    if (!container) return;

    const db = window.MUSIC_DB;
    if (!db || !db.songs || !db.songs.length) {
        container.innerHTML = '<div class="playlist-empty-state"><i class="fa-solid fa-music"></i><p>No songs available.</p></div>';
        return;
    }

    // Show skeleton loading first
    container.innerHTML = Array(8).fill(0).map(() => `
        <div class="music-card skeleton-card">
            <div class="card-img-wrapper skeleton-img"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `).join('');

    // Render real cards after a short delay for skeleton effect
    setTimeout(() => {
        container.innerHTML = db.songs.map(song => {
            const track = db.toTrack(song);
            const genreBadge = song.genre ? `<span class="genre-badge">${song.genre}</span>` : '';
            const liked = isLiked(track.id);
            return `
            <div class="music-card" data-song-id="${song.id}" role="button" tabindex="0">
                <div class="card-img-wrapper">
                    <img src="${song.thumbnail}" alt="${song.title}" class="card-img" loading="lazy" 
                         onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'">
                    <div class="card-overlay">
                        <button class="card-play-btn" aria-label="Play ${song.title}">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="card-like-btn ${liked ? 'liked' : ''}" aria-label="Like ${song.title}" data-song-id="${song.id}">
                            <i class="${liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                    </div>
                    ${genreBadge}
                </div>
                <span class="card-title">${song.title}</span>
                <span class="card-subtitle">${song.artist}</span>
                <span class="card-duration">${song.duration || ''}</span>
            </div>`;
        }).join('');

        // Bind events
        container.querySelectorAll('.music-card[data-song-id]').forEach(card => {
            const songId = card.getAttribute('data-song-id');
            const song = db.songs.find(s => s.id === songId);
            if (!song) return;
            const track = db.toTrack(song);

            const playHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Set queue to all songs, start from this one
                const allTracks = db.getAllTracks();
                const idx = allTracks.findIndex(t => t.id === songId);
                queue = allTracks;
                currentQueueIndex = idx >= 0 ? idx : 0;
                loadAndPlayTrack(queue[currentQueueIndex]);
            };

            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-like-btn')) return;
                playHandler(e);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') playHandler(e);
            });

            const playBtn = card.querySelector('.card-play-btn');
            if (playBtn) playBtn.addEventListener('click', playHandler);

            const likeBtn = card.querySelector('.card-like-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavoriteTrack(track);
                    // Update just this button
                    const nowLiked = isLiked(track.id);
                    likeBtn.className = `card-like-btn ${nowLiked ? 'liked' : ''}`;
                    likeBtn.querySelector('i').className = `${nowLiked ? 'fa-solid' : 'fa-regular'} fa-heart`;
                });
            }
        });
    }, 300);
}

// ── Preset Playlist Navigation (THE KEY FIX) ─────────────────

/**
 * Opens a preset playlist in the details view WITHOUT starting playback.
 * This is what playlist card clicks should do.
 */
function openPresetPlaylistView(playlistId) {
    loadPlaylistDetailsView('preset_' + playlistId);
}

/**
 * Plays a preset playlist immediately (for the play button on the card).
 */
function playPresetPlaylist(playlistId) {
    const db = window.MUSIC_DB;
    if (!db) return;
    const tracks = db.getPlaylistTracks(playlistId);
    if (!tracks.length) return;
    queue = tracks;
    currentQueueIndex = 0;
    currentPlaylistId = 'preset_' + playlistId;
    loadAndPlayTrack(queue[0]);
}

/**
 * Legacy function kept for backward compatibility with home quick-cards.
 * Now opens the playlist view instead of just playing.
 */
function loadRecommendedPlaylist(genreKey) {
    openPresetPlaylistView(genreKey);
}

function playLikedSongs() {
    if (likedSongs.length === 0) {
        showToast("You haven't liked any songs yet! Click ♥ on any song to save it.", 'info');
        return;
    }
    queue = [...likedSongs];
    currentQueueIndex = 0;
    currentPlaylistId = 'liked';
    loadAndPlayTrack(queue[0]);
}

// ── Playlist Details View ─────────────────────────────────────

/**
 * Extended to handle: 'liked', 'preset_<key>', and user-created playlists.
 */
function loadPlaylistDetailsView(playlistId) {
    switchView(`playlist-${playlistId}`);
    currentPlaylistId = playlistId;

    const bannerArt = document.getElementById('playlistBannerArt');
    const bannerName = document.getElementById('playlistBannerName');
    const bannerDesc = document.getElementById('playlistBannerDesc');
    const songCountMeta = document.getElementById('playlistMetaCount');
    const tracksContainer = document.getElementById('playlistTracksContainer');
    const deleteBtn = document.getElementById('deletePlaylistBtn');

    let plName = '';
    let plDesc = '';
    let tracks = [];
    let isPreset = false;

    bannerArt.className = 'playlist-banner-art';

    if (playlistId === 'liked') {
        // ── Liked Songs ──
        plName = 'Liked Songs';
        plDesc = 'Your favorite bookmarked tracks.';
        tracks = likedSongs;
        bannerArt.classList.add('liked-gradient');
        bannerArt.innerHTML = '<i class="fa-solid fa-heart"></i>';
        deleteBtn.style.display = 'none';

    } else if (playlistId.startsWith('preset_')) {
        // ── Preset Playlist (from MUSIC_DB) ──
        isPreset = true;
        const key = playlistId.replace('preset_', '');
        const db = window.MUSIC_DB;
        const pl = db ? db.getPlaylist(key) : null;

        if (!pl) {
            tracksContainer.innerHTML = '<div class="playlist-empty-state"><i class="fa-solid fa-face-frown"></i><p>Playlist not found.</p></div>';
            return;
        }

        plName = pl.name;
        plDesc = pl.desc;
        tracks = db.getPlaylistTracks(key);

        bannerArt.innerHTML = `<i class="fa-solid ${pl.icon}"></i>`;
        bannerArt.classList.add(pl.gradient);
        deleteBtn.style.display = 'none'; // Can't delete preset playlists

    } else {
        // ── User-created Playlist ──
        const pl = playlists[playlistId];
        if (!pl) return;
        plName = pl.name;
        plDesc = pl.desc;
        tracks = pl.tracks;
        bannerArt.innerHTML = '<i class="fa-solid fa-music"></i>';
        bannerArt.classList.add('playlist-gradient-3');
        deleteBtn.style.display = 'flex';
        deleteBtn.onclick = () => confirmDeletePlaylist(playlistId);
    }

    bannerName.innerText = plName;
    bannerDesc.innerText = plDesc;
    songCountMeta.innerText = `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}`;

    // Wire up Play All button
    const playPlBtn = document.getElementById('playPlaylistBtn');
    if (tracks.length > 0) {
        playPlBtn.onclick = () => {
            queue = [...tracks];
            currentQueueIndex = 0;
            loadAndPlayTrack(queue[0]);
        };

        tracksContainer.innerHTML = tracks.map((track, index) => {
            const isCurrentlyPlaying = currentTrack && currentTrack.id === track.id;
            return `
            <div class="track-list-item ${isCurrentlyPlaying ? 'now-playing-row' : ''}" 
                 data-track-index="${index}" 
                 data-playlist-id="${playlistId}"
                 role="button" tabindex="0">
                <span class="item-num">
                    ${isCurrentlyPlaying
                        ? '<span class="eq-mini"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></span>'
                        : (index + 1)}
                </span>
                <div class="item-title-info">
                    <img src="${track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80'}" 
                         class="item-art" alt="${track.title}"
                         onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80'">
                    <div class="item-details">
                        <span class="item-name">${track.title}</span>
                        <span class="item-artist">${track.artist}</span>
                    </div>
                </div>
                <span class="item-album">${track.album || ''}</span>
                <span class="item-duration">${track.duration || ''}</span>
                <div class="item-actions">
                    <button class="row-action-btn like-row-btn ${isLiked(track.id) ? 'liked' : ''}" 
                            data-track-id="${track.id}" 
                            title="${isLiked(track.id) ? 'Unlike' : 'Like'}">
                        <i class="${isLiked(track.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>
                    ${!isPreset ? `
                    <button class="row-action-btn" 
                            data-remove-playlist="${playlistId}" 
                            data-remove-track="${track.id}" 
                            title="Remove from playlist">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>` : ''}
                </div>
            </div>`;
        }).join('');

        // Bind row click events
        tracksContainer.querySelectorAll('.track-list-item').forEach(row => {
            const idx = parseInt(row.getAttribute('data-track-index'));
            const pid = row.getAttribute('data-playlist-id');

            row.addEventListener('click', (e) => {
                if (e.target.closest('.row-action-btn')) return;
                playPlaylistTrack(pid, idx, tracks);
            });
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') playPlaylistTrack(pid, idx, tracks);
            });

            // Like button in row
            const likeBtn = row.querySelector('.like-row-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavoriteTrack(tracks[idx]);
                    // Refresh the view to update all icons
                    loadPlaylistDetailsView(playlistId);
                });
            }

            // Remove button in row (user playlists only)
            const removeBtn = row.querySelector('[data-remove-playlist]');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const pid = removeBtn.getAttribute('data-remove-playlist');
                    const tid = removeBtn.getAttribute('data-remove-track');
                    removeTrackFromPlaylist(pid, tid);
                });
            }
        });

    } else {
        playPlBtn.onclick = null;
        tracksContainer.innerHTML = `
            <div class="playlist-empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>${isPreset ? 'This playlist is empty.' : 'This playlist is empty. Search songs and click "+" to add them here.'}</p>
            </div>`;
    }
}

function playPlaylistTrack(playlistId, index, tracks) {
    queue = [...tracks];
    currentQueueIndex = index;
    currentPlaylistId = playlistId;
    loadAndPlayTrack(queue[index]);
    // Highlight currently playing row
    setTimeout(() => refreshPlaylistRowHighlight(playlistId), 200);
}

/**
 * Refreshes the now-playing highlight in the current open playlist view.
 */
function refreshPlaylistRowHighlight(playlistId) {
    const container = document.getElementById('playlistTracksContainer');
    if (!container) return;
    container.querySelectorAll('.track-list-item').forEach((row, idx) => {
        const track = queue[idx];
        if (!track) return;
        const playing = currentTrack && currentTrack.id === track.id;
        row.classList.toggle('now-playing-row', playing);
        const numSpan = row.querySelector('.item-num');
        if (numSpan) {
            numSpan.innerHTML = playing
                ? '<span class="eq-mini"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></span>'
                : String(idx + 1);
        }
    });
}

// ── Audio Playback Engine ─────────────────────────────────────

async function loadAndPlayTrack(track) {
    const loadId = ++currentLoadId;
    currentTrack = track;
    isPlaying = false;
    currentVideoCandidates = [];
    currentVideoCandidateIndex = 0;

    // Update player bar immediately
    document.getElementById('playerSongTitle').innerText = 'Loading...';
    document.getElementById('playerArtistName').innerText = track.artist || '';
    document.getElementById('playerAlbumArt').src =
        track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80';
    document.title = `Loading... | Audiora`;

    // Like button state
    const favBtn = document.getElementById('favoriteToggleBtn');
    const liked = isLiked(track.id);
    favBtn.className = liked ? 'player-heart-btn liked' : 'player-heart-btn';
    favBtn.querySelector('i').className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

    const logoIcon = document.querySelector('.disc-logo');
    if (logoIcon) logoIcon.classList.add('spinning');

    clearPlaybackError();
    updateQueueSidebarUI();

    try {
        // Use youtubeQuery if available, otherwise build from artist + title
        const searchTerms = track.youtubeQuery
            || `${track.artist} ${track.title} official audio`;

        const res = await fetch(`${API_BASE_URL}/youtube?q=${encodeURIComponent(searchTerms)}`);
        if (loadId !== currentLoadId) return; // Race condition guard

        const data = await res.json();
        if (loadId !== currentLoadId) return;

        if (!data.success || !data.videos || !data.videos.length) {
            throw new Error('No YouTube candidates returned from backend');
        }

        currentVideoCandidates = data.videos;
        currentVideoCandidateIndex = 0;

        const firstVideo = currentVideoCandidates[0];
        currentTrack.videoId = firstVideo.videoId;

        playYouTubeVideo(firstVideo.videoId, track);

    } catch (error) {
        if (loadId !== currentLoadId) return;
        console.error('Playback error:', error);

        if (logoIcon) logoIcon.classList.remove('spinning');

        // Show user-friendly error with retry
        document.getElementById('playerSongTitle').innerText = track.title;
        document.getElementById('playerArtistName').innerText = track.artist;
        showPlaybackError(`Couldn't load "${track.title}". Backend may be offline. <button onclick="loadAndPlayTrack(currentTrack)" class="retry-btn">Retry</button>`);
    }
}

function playYouTubeVideo(videoId, track) {
    if (!ytPlayer && window.YT && window.YT.Player) {
        try { initYouTubePlayer(); } catch (e) { }
    }

    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        try {
            ytPlayer.loadVideoById(videoId);

            document.getElementById('playerSongTitle').innerText = track.title;
            document.getElementById('playerArtistName').innerText = track.artist;
            document.title = `${track.title} — ${track.artist} | Audiora`;

            fetchAndDisplayFullLyrics(track);
        } catch (e) {
            console.error('Error calling loadVideoById:', e);
            tryNextVideoCandidate();
        }
    } else {
        console.log('YouTube Player not ready. Retrying in 500ms...');
        setTimeout(() => playYouTubeVideo(videoId, track), 500);
    }
}

function tryNextVideoCandidate() {
    if (!currentTrack) return;

    currentVideoCandidateIndex++;

    if (currentVideoCandidateIndex >= currentVideoCandidates.length) {
        console.error('All candidate videos failed for this track');

        const logoIcon = document.querySelector('.disc-logo');
        if (logoIcon) logoIcon.classList.remove('spinning');

        document.getElementById('playerSongTitle').innerText = currentTrack.title;
        document.getElementById('playerArtistName').innerText = currentTrack.artist;
        showPlaybackError(`No playable source found for "${currentTrack.title}". YouTube may have restricted this video. <button onclick="nextSong()" class="retry-btn">Skip →</button>`);
        return;
    }

    const nextVideo = currentVideoCandidates[currentVideoCandidateIndex];
    console.log('Trying next YouTube candidate:', nextVideo.title, nextVideo.videoId);

    currentTrack.videoId = nextVideo.videoId;
    playYouTubeVideo(nextVideo.videoId, currentTrack);
}

function showPlaybackError(htmlMsg) {
    let bar = document.getElementById('playbackErrorBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'playbackErrorBar';
        bar.className = 'playback-error-bar';
        const playerBar = document.querySelector('.player-bar');
        if (playerBar) playerBar.insertAdjacentElement('beforebegin', bar);
    }
    bar.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${htmlMsg}
        <button onclick="clearPlaybackError()" class="error-dismiss-btn" aria-label="Dismiss">
            <i class="fa-solid fa-xmark"></i>
        </button>`;
    bar.classList.remove('hidden');
}

function clearPlaybackError() {
    const bar = document.getElementById('playbackErrorBar');
    if (bar) bar.classList.add('hidden');
}

function playSingleTrackDirectly(track) {
    queue = [track];
    currentQueueIndex = 0;
    loadAndPlayTrack(track);
}

function playTrackFromSearch(track, index, trackList) {
    queue = trackList;
    currentQueueIndex = index;
    loadAndPlayTrack(track);
}

// ── Playback Controls ─────────────────────────────────────────

function togglePlayPause() {

    console.log("Button clicked");
    console.log("isPlaying =", isPlaying);
    console.log("pause =", typeof ytPlayer.pauseVideo);
    console.log("play =", typeof ytPlayer.playVideo);

    if (!ytPlayerReady) {
        console.log("Player not ready");
        return;
    }

    if (isPlaying) {
        console.log("Pausing...");
        ytPlayer.pauseVideo();
    } else {
        console.log("Playing...");
        ytPlayer.playVideo();
    }
}
function updatePlayerUI(playingState) {
    const btn = document.getElementById('playPauseBtn');
    const logo = document.querySelector('.disc-logo');

    if (playingState) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (logo) logo.classList.add('spinning');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (logo) logo.classList.remove('spinning');
    }

    // Refresh highlighted row in playlist view if open
    if (currentPlaylistId) {
        refreshPlaylistRowHighlight(currentPlaylistId);
    }
}

function previousSong() {
    if (queue.length === 0) return;

    if (isRepeat === 'one') {
        ytPlayer.seekTo(0, true);
        ytPlayer.playVideo();
        return;
    }

    currentQueueIndex--;
    if (currentQueueIndex < 0) {
        currentQueueIndex = isRepeat === 'all' ? queue.length - 1 : 0;
    }
    loadAndPlayTrack(queue[currentQueueIndex]);
}

function nextSong() {
    if (queue.length === 0) return;

    if (isRepeat === 'one') {
        ytPlayer.seekTo(0, true);
        ytPlayer.playVideo();
        return;
    }

    currentQueueIndex++;
    if (currentQueueIndex >= queue.length) {
        if (isRepeat === 'all') {
            currentQueueIndex = 0;
        } else {
            currentQueueIndex = queue.length - 1;
            isPlaying = false;
            updatePlayerUI(false);
            return;
        }
    }

    loadAndPlayTrack(queue[currentQueueIndex]);
}

function handleTrackEnded() {
    nextSong();
}

function toggleShuffle() {
    const btn = document.getElementById('shuffleBtn');
    isShuffle = !isShuffle;

    if (!window.__audioraOriginalQueue) window.__audioraOriginalQueue = null;

    if (isShuffle) {
        btn.classList.add('active');
        if (!window.__audioraOriginalQueue) window.__audioraOriginalQueue = [...queue];
        shuffleQueue = [...queue];
        if (currentQueueIndex >= 0) {
            const current = shuffleQueue.splice(currentQueueIndex, 1)[0];
            shuffleArray(shuffleQueue);
            shuffleQueue.unshift(current);
            currentQueueIndex = 0;
        } else {
            shuffleArray(shuffleQueue);
        }
        queue = shuffleQueue;
    } else {
        btn.classList.remove('active');
        const restored = window.__audioraOriginalQueue;
        if (restored && Array.isArray(restored)) queue = [...restored];
        if (currentTrack) {
            const idx = queue.findIndex(t => t.id === currentTrack.id);
            currentQueueIndex = idx >= 0 ? idx : 0;
        } else {
            currentQueueIndex = queue.length ? 0 : -1;
        }
        window.__audioraOriginalQueue = null;
    }

    updateQueueSidebarUI();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function toggleRepeat() {
    const btn = document.getElementById('repeatBtn');

    if (isRepeat === 'off') {
        isRepeat = 'all';
        btn.classList.add('active');
        btn.querySelector('i').className = 'fa-solid fa-repeat';
        btn.title = 'Repeat All (on)';
    } else if (isRepeat === 'all') {
        isRepeat = 'one';
        btn.classList.add('active');
        btn.querySelector('i').className = 'fa-solid fa-repeat-1';
        btn.title = 'Repeat One (on)';
    } else {
        isRepeat = 'off';
        btn.classList.remove('active');
        btn.querySelector('i').className = 'fa-solid fa-repeat';
        btn.title = 'Repeat (off)';
    }
}

// ── Volume ────────────────────────────────────────────────────

function updateVolumeUI() {
    const slider = document.getElementById('volumeSlider');
    const fill = document.getElementById('volumeBarFill');
    const icon = document.getElementById('volumeIcon');

    slider.value = isMuted ? 0 : currentVolume;
    fill.style.width = `${isMuted ? 0 : currentVolume}%`;

    if (isMuted || currentVolume == 0) {
        icon.className = 'fa-solid fa-volume-xmark';
    } else if (currentVolume < 40) {
        icon.className = 'fa-solid fa-volume-low';
    } else {
        icon.className = 'fa-solid fa-volume-high';
    }
}

function updateVolumeSlider(val) {
    document.getElementById('volumeSlider').value = val;
    document.getElementById('volumeBarFill').style.width = `${val}%`;
}

// ── Progress Bar Polling ──────────────────────────────────────

function startProgressPolling() {
    stopProgressPolling();
    progressTimer = setInterval(() => {
        if (!ytPlayer || isDraggingSeekbar) return;
        try {
            const current = ytPlayer.getCurrentTime() || 0;
            const total = ytPlayer.getDuration() || 0;
            if (total > 0) {
                const pct = (current / total) * 100;
                document.getElementById('progressBar').value = pct;
                document.getElementById('progressBarFill').style.width = `${pct}%`;
                document.getElementById('currentTimeLabel').innerText = formatTime(current);
                document.getElementById('totalTimeLabel').innerText = formatTime(total);
            }
        } catch (e) { /* player may not be fully ready */ }
    }, 300);
}

function stopProgressPolling() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

function updateProgressBarFill(pct) {
    document.getElementById('progressBarFill').style.width = `${pct}%`;
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Liked Songs (Favorites) ───────────────────────────────────

/**
 * Core toggle — works on any track object.
 * Returns true if now liked, false if unliked.
 */
function toggleFavoriteTrack(track) {
    const idx = likedSongs.findIndex(t => t.id === track.id);
    if (idx >= 0) {
        likedSongs.splice(idx, 1);
    } else {
        likedSongs.push(track);
    }
    localStorage.setItem('audiora_liked_songs', JSON.stringify(likedSongs));
    loadPlaylistsList(); // Update sidebar count
    return idx < 0; // true = now liked
}

function isLiked(trackId) {
    return likedSongs.some(t => t.id === trackId);
}

function toggleFavoriteCurrentTrack() {
    if (!currentTrack) return;
    const nowLiked = toggleFavoriteTrack(currentTrack);
    const favBtn = document.getElementById('favoriteToggleBtn');
    favBtn.className = nowLiked ? 'player-heart-btn liked' : 'player-heart-btn';
    favBtn.querySelector('i').className = nowLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    showToast(nowLiked ? `Added "${currentTrack.title}" to Liked Songs ♥` : `Removed from Liked Songs`, nowLiked ? 'success' : 'info');
}

/**
 * Legacy function used in search result rows.
 * FIX: Removed the bad `executeSearch()` call that re-ran search on every like.
 */
function toggleFavoriteDirectly(id, title, artist, thumbnail, url) {
    const track = { id, title, artist, thumbnail, url };
    const nowLiked = toggleFavoriteTrack(track);

    showToast(nowLiked ? `Added "${title}" to Liked Songs ♥` : `Removed "${title}" from Liked Songs`, nowLiked ? 'success' : 'info');

    // Only update the heart icons in the current view, NOT re-run the search
    document.querySelectorAll(`[data-like-id="${id}"]`).forEach(btn => {
        btn.className = `row-action-btn like-btn ${nowLiked ? 'liked' : ''}`;
        btn.querySelector('i').className = `${nowLiked ? 'fa-solid' : 'fa-regular'} fa-heart`;
    });
}

// ── Toast Notification ────────────────────────────────────────

function showToast(message, type = 'info') {
    let toast = document.getElementById('audioraToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'audioraToast';
        toast.className = 'bs-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `bs-toast bs-toast-${type} visible`;

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// ── Playlists CRUD ────────────────────────────────────────────

function loadPlaylistsList() {
    const container = document.getElementById('playlistsContainer');
    if (!container) return;

    const keys = Object.keys(playlists);

    if (keys.length === 0) {
        container.innerHTML = `<div style="padding:12px;font-size:0.8rem;color:var(--text-muted);text-align:center;">No custom playlists yet</div>`;
        return;
    }

    container.innerHTML = keys.map((id, idx) => {
        const pl = playlists[id];
        const colorIdx = (idx % 5) + 1;
        return `
        <div class="lib-item" data-playlist-id="${id}">
            <div class="playlist-art playlist-gradient-${colorIdx}">
                <i class="fa-solid fa-music"></i>
            </div>
            <div class="playlist-details">
                <span class="playlist-name">${pl.name}</span>
                <span class="playlist-meta">${pl.tracks.length} tracks</span>
            </div>
        </div>`;
    }).join('');

    // Bind clicks
    container.querySelectorAll('.lib-item').forEach(item => {
        const id = item.getAttribute('data-playlist-id');
        item.addEventListener('click', () => loadPlaylistDetailsView(id));
    });
}

function openCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').classList.remove('hidden');
    document.getElementById('newPlaylistName').focus();
}

function closeCreatePlaylistModal() {
    document.getElementById('createPlaylistModal').classList.add('hidden');
    document.getElementById('newPlaylistName').value = '';
    document.getElementById('newPlaylistDesc').value = '';
}

function confirmCreatePlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    const desc = document.getElementById('newPlaylistDesc').value.trim();
    if (!name) {
        showToast('Playlist name is required!', 'error');
        return;
    }

    const id = 'pl_' + Date.now();
    playlists[id] = {
        name,
        desc: desc || 'Custom playlist created on Audiora',
        tracks: []
    };

    localStorage.setItem('audiora_playlists', JSON.stringify(playlists));
    loadPlaylistsList();
    closeCreatePlaylistModal();
    loadPlaylistDetailsView(id);
}

function confirmDeletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
        delete playlists[playlistId];
        localStorage.setItem('audiora_playlists', JSON.stringify(playlists));
        loadPlaylistsList();
        switchView('home');
    }
}

function removeTrackFromPlaylist(playlistId, trackId) {
    if (playlistId === 'liked') {
        likedSongs = likedSongs.filter(t => t.id !== trackId);
        localStorage.setItem('audiora_liked_songs', JSON.stringify(likedSongs));
        if (currentTrack && currentTrack.id === trackId) {
            const favBtn = document.getElementById('favoriteToggleBtn');
            favBtn.className = 'player-heart-btn';
            favBtn.querySelector('i').className = 'fa-regular fa-heart';
        }
    } else {
        const pl = playlists[playlistId];
        if (pl) {
            pl.tracks = pl.tracks.filter(t => t.id !== trackId);
            localStorage.setItem('audiora_playlists', JSON.stringify(playlists));
        }
    }
    loadPlaylistDetailsView(playlistId);
    loadPlaylistsList();
}

// ── Add Song to Playlist Modal ────────────────────────────────

let tempTrackToAdd = null;

function showAddToPlaylistModal(id, title, artist, thumbnail, url) {
    tempTrackToAdd = { id, title, artist, thumbnail, url };
    const modal = document.getElementById('playlistModal');
    const container = document.getElementById('modalPlaylistsList');
    const keys = Object.keys(playlists);

    if (keys.length === 0) {
        container.innerHTML = `
            <div style="padding:16px;text-align:center;color:var(--text-secondary);">
                <p style="margin-bottom:15px;font-size:0.9rem;">You don't have any playlists yet!</p>
                <button class="confirm-modal-btn" onclick="closePlaylistSelectorModal();openCreatePlaylistModal();">
                    Create a Playlist
                </button>
            </div>`;
    } else {
        container.innerHTML = keys.map(plId => {
            const pl = playlists[plId];
            return `
            <div class="modal-playlist-item" data-modal-pl-id="${plId}">
                <div class="playlist-art playlist-gradient-1" style="width:36px;height:36px;font-size:0.9rem;">
                    <i class="fa-solid fa-music"></i>
                </div>
                <span class="playlist-name" style="font-size:0.85rem;">${pl.name}</span>
            </div>`;
        }).join('');

        container.querySelectorAll('.modal-playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                addTrackToPlaylistSelected(item.getAttribute('data-modal-pl-id'));
            });
        });
    }
    modal.classList.remove('hidden');
}

function closePlaylistSelectorModal() {
    document.getElementById('playlistModal').classList.add('hidden');
    tempTrackToAdd = null;
}

function addTrackToPlaylistSelected(playlistId) {
    if (!tempTrackToAdd) return;
    const pl = playlists[playlistId];
    if (pl) {
        if (pl.tracks.find(t => t.id === tempTrackToAdd.id)) {
            showToast(`"${tempTrackToAdd.title}" is already in this playlist!`, 'info');
        } else {
            pl.tracks.push(tempTrackToAdd);
            localStorage.setItem('audiora_playlists', JSON.stringify(playlists));
            showToast(`Added "${tempTrackToAdd.title}" to ${pl.name}!`, 'success');
        }
    }
    closePlaylistSelectorModal();
    loadPlaylistsList();
}

// ── Queue Panel ───────────────────────────────────────────────

function toggleQueuePanel() {
    const panel = document.getElementById('queuePanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) updateQueueSidebarUI();
}

function updateQueueSidebarUI() {
    const nowPlaying = document.getElementById('queueNowPlayingTrack');
    const list = document.getElementById('queueItemsList');

    if (!currentTrack) {
        nowPlaying.innerHTML = '<div style="padding:10px;font-size:0.8rem;color:var(--text-muted)">No track playing</div>';
        list.innerHTML = '';
        return;
    }

    nowPlaying.innerHTML = `
        <img src="${currentTrack.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=40&q=80'}" 
             class="queue-item-art" alt="${currentTrack.title}">
        <div class="queue-item-details">
            <span class="queue-item-name">${currentTrack.title}</span>
            <span class="queue-item-artist">${currentTrack.artist}</span>
        </div>
        <div class="playing-equalizer">
            <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
        </div>`;

    const nextUp = queue.slice(currentQueueIndex + 1);
    if (nextUp.length === 0) {
        list.innerHTML = '<div style="padding:20px;font-size:0.8rem;color:var(--text-muted);text-align:center;">End of queue</div>';
    } else {
        list.innerHTML = nextUp.map((track, i) => {
            const actualIdx = currentQueueIndex + 1 + i;
            return `
            <div class="queue-item" data-queue-idx="${actualIdx}">
                <img src="${track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=40&q=80'}" 
                     class="queue-item-art" alt="${track.title}">
                <div class="queue-item-details">
                    <span class="queue-item-name">${track.title}</span>
                    <span class="queue-item-artist">${track.artist}</span>
                </div>
                <button class="queue-remove-btn" data-remove-idx="${actualIdx}" title="Remove from queue">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`;
        }).join('');

        list.querySelectorAll('.queue-item').forEach(item => {
            const idx = parseInt(item.getAttribute('data-queue-idx'));
            item.addEventListener('click', (e) => {
                if (e.target.closest('.queue-remove-btn')) return;
                currentQueueIndex = idx;
                loadAndPlayTrack(queue[idx]);
            });
        });

        list.querySelectorAll('.queue-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-remove-idx'));
                queue.splice(idx, 1);
                updateQueueSidebarUI();
            });
        });
    }
}

// ── View Navigation ───────────────────────────────────────────

function switchView(viewName) {
    if (viewHistory[currentHistoryIndex] !== viewName) {
        viewHistory = viewHistory.slice(0, currentHistoryIndex + 1);
        viewHistory.push(viewName);
        currentHistoryIndex = viewHistory.length - 1;
    }
    switchViewSilently(viewName);
}

function switchViewSilently(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewName) item.classList.add('active');
    });

    document.getElementById('likedSongsShortcut').classList.remove('active-item');
    document.querySelectorAll('.lib-item').forEach(i => i.classList.remove('active-item'));

    if (viewName.startsWith('playlist-')) {
        const pid = viewName.replace('playlist-', '');
        if (pid === 'liked') {
            document.getElementById('likedSongsShortcut').classList.add('active-item');
        } else {
            const item = document.querySelector(`.lib-item[data-playlist-id="${pid}"]`);
            if (item) item.classList.add('active-item');
        }
        viewName = 'playlist';
    }

    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`${viewName}View`);
    if (target) target.classList.add('active');
}

// ── UI Event Handlers ─────────────────────────────────────────

function initUI() {
    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.getAttribute('data-view'));
        });
    });

    // Liked Songs shortcut
    document.getElementById('likedSongsShortcut').addEventListener('click', () => {
        loadPlaylistDetailsView('liked');
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    const searchTriggerBtn = document.getElementById('searchTriggerBtn');
    const searchClearBtn = document.getElementById('searchClearBtn');

    if (searchTriggerBtn && searchInput) {
        searchTriggerBtn.addEventListener('click', executeSearch);
        searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') executeSearch(); });
    }

    if (searchClearBtn && searchInput) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            document.getElementById('searchResultsLayout').classList.add('hidden');
            document.getElementById('searchCategories').classList.remove('hidden');
        });
    }

    // Player controls
    document.getElementById('playPauseBtn').addEventListener('click', togglePlayPause);
    document.getElementById('prevBtn').addEventListener('click', previousSong);
    document.getElementById('nextBtn').addEventListener('click', nextSong);
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
    document.getElementById('favoriteToggleBtn').addEventListener('click', toggleFavoriteCurrentTrack);

    // Lyrics, Queue, Karaoke
    document.getElementById('lyricsToggleBtn').addEventListener('click', () => switchView('lyrics'));
    document.getElementById('queueToggleBtn').addEventListener('click', toggleQueuePanel);
    document.getElementById('closeQueueBtn').addEventListener('click', toggleQueuePanel);

    const karaokeBtn = document.getElementById('karaokeToggleBtn');
    if (karaokeBtn) karaokeBtn.addEventListener('click', toggleKaraokePanel);
    const closeKarBtn = document.getElementById('closeKaraokeBtn');
    if (closeKarBtn) closeKarBtn.addEventListener('click', toggleKaraokePanel);
    const micBtn = document.getElementById('micEnableBtn');
    if (micBtn) micBtn.addEventListener('click', enableMicrophone);
    const effectSelect = document.getElementById('voiceEffectSelect');
    if (effectSelect) effectSelect.addEventListener('change', changeVoiceEffect);

    // Seek bar
    const progressBar = document.getElementById('progressBar');
    progressBar.addEventListener('input', () => {
        isDraggingSeekbar = true;
        updateProgressBarFill(progressBar.value);
    });
    progressBar.addEventListener('change', () => {
        isDraggingSeekbar = false;
        if (ytPlayer && currentTrack) {
            const duration = ytPlayer.getDuration() || 0;
            ytPlayer.seekTo((progressBar.value / 100) * duration, true);
        }
    });

    // Volume
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeMuteBtn = document.getElementById('volumeMuteBtn');

    volumeSlider.addEventListener('input', () => {
        currentVolume = volumeSlider.value;
        isMuted = false;
        if (ytPlayer) { ytPlayer.setVolume(currentVolume); ytPlayer.unMute(); }
        updateVolumeUI();
    });

    volumeMuteBtn.addEventListener('click', () => {
        if (!ytPlayer) return;
        if (isMuted) {
            ytPlayer.unMute();
            ytPlayer.setVolume(currentVolume);
            isMuted = false;
        } else {
            ytPlayer.mute();
            isMuted = true;
        }
        updateVolumeUI();
    });

    // Create Playlist Modal
    document.getElementById('createPlaylistBtn').addEventListener('click', openCreatePlaylistModal);
    document.getElementById('closeCreateModal').addEventListener('click', closeCreatePlaylistModal);
    document.getElementById('cancelCreateBtn').addEventListener('click', closeCreatePlaylistModal);
    document.getElementById('confirmCreateBtn').addEventListener('click', confirmCreatePlaylist);

    // Close Playlist Selector Modal
    document.getElementById('closePlaylistModal').addEventListener('click', closePlaylistSelectorModal);

    // History navigation
    document.getElementById('navBack').addEventListener('click', () => {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            switchViewSilently(viewHistory[currentHistoryIndex]);
        }
    });
    document.getElementById('navForward').addEventListener('click', () => {
        if (currentHistoryIndex < viewHistory.length - 1) {
            currentHistoryIndex++;
            switchViewSilently(viewHistory[currentHistoryIndex]);
        }
    });
}

// ── Search ────────────────────────────────────────────────────

async function executeSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    if (!query) return;

    document.getElementById('searchCategories').classList.add('hidden');
    document.getElementById('searchResultsLayout').classList.add('hidden');
    const loadingEl = document.getElementById('searchLoading');
    loadingEl.classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.results && data.results.length > 0) {
            displaySearchResults(data.results);
            fetchAndDisplayLyricsPreview(data.results[0]);
        } else {
            displaySearchEmptyState();
        }
    } catch (error) {
        console.error('Search failed:', error);
        displaySearchEmptyState('Error querying music servers. Is the backend running?');
    } finally {
        loadingEl.classList.add('hidden');
    }
}

function triggerPresetSearch(presetQuery) {
    document.getElementById('searchInput').value = presetQuery;
    executeSearch();
}

function displaySearchResults(songs) {
    const layout = document.getElementById('searchResultsLayout');
    const container = document.getElementById('searchResultsContainer');
    layout.classList.remove('hidden');

    container.innerHTML = songs.map((song, index) => `
        <div class="track-row" data-song-idx="${index}" role="button" tabindex="0">
            <div class="track-art-wrapper">
                <img src="${song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&q=80'}" 
                     class="track-row-art" alt="${song.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&q=80'">
                <div class="track-row-play"><i class="fa-solid fa-play"></i></div>
            </div>
            <div class="track-row-details">
                <span class="track-row-title">${song.title}</span>
                <span class="track-row-artist">${song.artist}</span>
            </div>
            <div class="track-row-actions">
                <button class="row-action-btn" 
                        data-action="playlist" 
                        data-song-id="${song.id}" 
                        data-song-title="${(song.title || '').replace(/"/g, '&quot;')}"
                        data-song-artist="${(song.artist || '').replace(/"/g, '&quot;')}"
                        data-song-thumb="${song.thumbnail}"
                        data-song-url="${song.url || ''}"
                        title="Add to Playlist">
                    <i class="fa-solid fa-circle-plus"></i>
                </button>
                <button class="row-action-btn like-btn ${isLiked(song.id) ? 'liked' : ''}" 
                        data-action="like"
                        data-song-id="${song.id}"
                        data-song-title="${(song.title || '').replace(/"/g, '&quot;')}"
                        data-song-artist="${(song.artist || '').replace(/"/g, '&quot;')}"
                        data-song-thumb="${song.thumbnail}"
                        data-song-url="${song.url || ''}"
                        data-like-id="${song.id}"
                        title="${isLiked(song.id) ? 'Unlike' : 'Like'}">
                    <i class="${isLiked(song.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </div>
        </div>`).join('');

    container.querySelectorAll('.track-row').forEach(row => {
        const idx = parseInt(row.getAttribute('data-song-idx'));
        row.addEventListener('click', (e) => {
            if (e.target.closest('.row-action-btn')) return;
            playTrackFromSearch(songs[idx], idx, songs);
        });
        row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') playTrackFromSearch(songs[idx], idx, songs);
        });

        // Action buttons
        const plBtn = row.querySelector('[data-action="playlist"]');
        if (plBtn) {
            plBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showAddToPlaylistModal(
                    plBtn.dataset.songId, plBtn.dataset.songTitle,
                    plBtn.dataset.songArtist, plBtn.dataset.songThumb, plBtn.dataset.songUrl
                );
            });
        }
        const likeBtn = row.querySelector('[data-action="like"]');
        if (likeBtn) {
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavoriteDirectly(
                    likeBtn.dataset.songId, likeBtn.dataset.songTitle,
                    likeBtn.dataset.songArtist, likeBtn.dataset.songThumb, likeBtn.dataset.songUrl
                );
            });
        }
    });
}

function displaySearchEmptyState(msg = "We couldn't find any songs matching that query. Try another search!") {
    const layout = document.getElementById('searchResultsLayout');
    const container = document.getElementById('searchResultsContainer');
    layout.classList.remove('hidden');
    container.innerHTML = `<div class="playlist-empty-state"><i class="fa-solid fa-face-frown"></i><p>${msg}</p></div>`;
    document.getElementById('bestLyricCard').innerHTML = `
        <div class="card-empty-state"><i class="fa-solid fa-quote-right"></i><p>No preview available</p></div>`;
}

async function fetchAndDisplayLyricsPreview(song) {
    const card = document.getElementById('bestLyricCard');
    card.innerHTML = `
        <div class="lyrics-match-header">
            <img src="${song.thumbnail}" class="match-art" alt="${song.title}"
                 onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80'">
            <div class="match-info"><h4>${song.title}</h4><p>${song.artist}</p></div>
        </div>
        <div class="search-loader"><div class="music-spinner paste-lyrics-spinner">
            <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        </div></div>`;

    try {
        const artist = song.artistForLyrics || song.artist;
        const title = song.titleForLyrics || song.title;
        const res = song.url
            ? await fetch(`${API_BASE_URL}/lyrics?url=${encodeURIComponent(song.url)}`)
            : await fetch(`${API_BASE_URL}/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (data.success && data.lyrics) {
            const snippet = data.lyrics.split('\n').slice(0, 8).join('\n') + '...';
            card.innerHTML = `
                <div class="lyrics-match-header" role="button" tabindex="0" data-preview-song="${encodeURIComponent(JSON.stringify(song))}">
                    <img src="${song.thumbnail}" class="match-art" alt="${song.title}"
                         onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80'">
                    <div class="match-info"><h4>${song.title}</h4><p>${song.artist}</p></div>
                </div>
                <div class="lyric-text-excerpt">${snippet}</div>`;
            const header = card.querySelector('[data-preview-song]');
            if (header) {
                header.addEventListener('click', () => playSingleTrackDirectly(song));
                header.addEventListener('keydown', e => { if (e.key === 'Enter') playSingleTrackDirectly(song); });
            }
        } else throw new Error();
    } catch (e) {
        card.innerHTML = `
            <div class="lyrics-match-header">
                <img src="${song.thumbnail}" class="match-art" alt="${song.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=60&q=80'">
                <div class="match-info"><h4>${song.title}</h4><p>${song.artist}</p></div>
            </div>
            <div class="lyric-text-excerpt lyric-text-unavailable">
                Lyrics preview not available, but you can still play it!
            </div>`;
    }
}

// ── Paste Lyrics Search ───────────────────────────────────────

function initLyricsPasteUI() {
    const pasteBtn = document.getElementById('lyricsPasteBtn');
    if (!pasteBtn) return;

    const textarea = document.getElementById('lyricsPasteInput');
    const loadingEl = document.getElementById('lyricsPasteLoading');
    const resultsWrap = document.getElementById('lyricsPasteResults');
    const resultsContainer = document.getElementById('lyricsPasteResultsContainer');
    const feedbackEl = document.getElementById('lyricsPasteFeedback');

    function setFeedback(msg, type = 'info') {
        if (!feedbackEl) return;
        feedbackEl.classList.remove('hidden');
        feedbackEl.textContent = msg;
        feedbackEl.dataset.type = type;
    }

    function clearFeedback() {
        if (!feedbackEl) return;
        feedbackEl.classList.add('hidden');
        feedbackEl.textContent = '';
    }

    async function runPasteLyricsSearch() {
        const snippet = (textarea?.value || '').trim();
        if (!snippet) { setFeedback('Paste a lyrics snippet to search.', 'error'); return; }
        if (snippet.length < 6) { setFeedback('Snippet is too short. Try at least 6 characters.', 'error'); return; }

        clearFeedback();
        resultsWrap.classList.add('hidden');
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (resultsContainer) resultsContainer.innerHTML = '';

        try {
            const res = await fetch(`${API_BASE_URL}/lyrics/search?q=${encodeURIComponent(snippet)}`);
            const data = await res.json();

            if (!data.success || !data.results || !data.results.length) {
                resultsContainer.innerHTML = `<div class="playlist-empty-state"><i class="fa-solid fa-face-frown"></i><p>No matches found. Try a different phrase.</p></div>`;
                resultsWrap.classList.remove('hidden');
                return;
            }

            const top = data.results.slice(0, 7);
            resultsContainer.innerHTML = '';
            top.forEach((song, idx) => {
                const row = document.createElement('div');
                row.className = 'track-row track-row-clickable';
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.innerHTML = `
                    <div class="track-art-wrapper">
                        <img src="${song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&q=80'}" class="track-row-art" alt="${song.title}"
                             onerror="this.src='https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=50&q=80'">
                        <div class="track-row-play"><i class="fa-solid fa-play"></i></div>
                    </div>
                    <div class="track-row-details">
                        <span class="track-row-title">${song.title}</span>
                        <span class="track-row-artist">${song.artist}</span>
                    </div>
                    <div class="track-row-actions">
                        <span class="paste-lyrics-match">Match #${idx + 1}</span>
                    </div>`;
                row.addEventListener('click', () => playSingleTrackDirectly(song));
                row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') playSingleTrackDirectly(song); });
                resultsContainer.appendChild(row);
            });

            resultsWrap.classList.remove('hidden');
        } catch (e) {
            console.error('Lyrics paste search failed:', e);
            resultsContainer.innerHTML = `<div class="playlist-empty-state"><i class="fa-solid fa-face-frown"></i><p>Search failed. Is the backend running?</p></div>`;
            resultsWrap.classList.remove('hidden');
            setFeedback('Something went wrong while searching.', 'error');
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }

    pasteBtn.addEventListener('click', runPasteLyricsSearch);
    if (textarea) {
        textarea.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pasteBtn.click(); }
        });
    }
}

// ── Full Lyrics Fetching ──────────────────────────────────────

async function fetchAndDisplayFullLyrics(track) {
    const textContainer = document.getElementById('lyricsTextContainer');
    textContainer.innerHTML = `<div class="lyrics-placeholder"><div class="bar"></div><p>Decoding lyrics...</p></div>`;

    document.getElementById('lyricsSongTitle').innerText = track.title;
    document.getElementById('lyricsSongArtist').innerText = track.artist;
    document.getElementById('lyricsSongArt').src = track.thumbnail
        || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80';
    document.getElementById('lyricsAmbientBg').style.backgroundImage =
        `linear-gradient(180deg, hsl(${Math.floor(Math.random() * 360)}, 60%, 20%) 0%, var(--bg-base) 100%)`;

    try {
        const artist = track.artistForLyrics || track.artist;
        const title = track.titleForLyrics || track.title;
        const res = track.url
            ? await fetch(`${API_BASE_URL}/lyrics?url=${encodeURIComponent(track.url)}`)
            : await fetch(`${API_BASE_URL}/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
        const data = await res.json();

        if (data.success && data.lyrics) {
            const lines = data.lyrics.split('\n');
            textContainer.innerHTML = lines.map(line => {
                if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                    return `<div class="lyric-line" style="color:var(--accent);font-size:1.1rem;font-weight:600;margin-top:15px;">${line}</div>`;
                }
                return `<div class="lyric-line">${line || '&nbsp;'}</div>`;
            }).join('');
        } else throw new Error();
    } catch (e) {
        textContainer.innerHTML = `<div class="lyrics-placeholder"><i class="fa-solid fa-file-excel"></i><p>Could not load lyrics for this track.</p></div>`;
    }
}

// ── Karaoke ───────────────────────────────────────────────────

function toggleKaraokePanel() {
    const p = document.getElementById('karaokePanel');
    if (!p) return;
    p.classList.toggle('hidden');
}

async function enableMicrophone() {
    const errorEl = document.getElementById('micError');
    const micControls = document.getElementById('micControls');
    const micBtn = document.getElementById('micEnableBtn');

    if (errorEl) errorEl.classList.add('hidden');

    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        micSource = audioContext.createMediaStreamSource(micStream);
        outNode = audioContext.createGain();
        outNode.connect(audioContext.destination);
        currentEffectNode = audioContext.createGain();
        micSource.connect(currentEffectNode);
        currentEffectNode.connect(outNode);
        if (micBtn) micBtn.classList.add('hidden');
        if (micControls) micControls.classList.remove('hidden');
    } catch (err) {
        console.error('Mic access denied or failed', err);
        if (errorEl) {
            errorEl.textContent = 'Microphone access denied. Please allow permissions in your browser.';
            errorEl.classList.remove('hidden');
            errorEl.style.display = 'flex';
        }
    }
}

function changeVoiceEffect() {
    if (!audioContext || !micSource) return;
    const val = document.getElementById('voiceEffectSelect').value;
    micSource.disconnect();
    if (currentEffectNode) currentEffectNode.disconnect();

    if (val === 'normal') {
        currentEffectNode = audioContext.createGain();
        micSource.connect(currentEffectNode);
        currentEffectNode.connect(outNode);
    } else if (val === 'reverb') {
        currentEffectNode = audioContext.createDelay();
        currentEffectNode.delayTime.value = 0.2;
        const feedback = audioContext.createGain();
        feedback.gain.value = 0.3;
        micSource.connect(currentEffectNode);
        currentEffectNode.connect(feedback);
        feedback.connect(currentEffectNode);
        currentEffectNode.connect(outNode);
        const dry = audioContext.createGain();
        micSource.connect(dry);
        dry.connect(outNode);
    } else if (val === 'robot') {
        const osc = audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 50;
        currentEffectNode = audioContext.createGain();
        currentEffectNode.gain.value = 0.0;
        micSource.connect(currentEffectNode);
        osc.connect(currentEffectNode.gain);
        osc.start();
        currentEffectNode.connect(outNode);
    } else if (val === 'echo') {
        currentEffectNode = audioContext.createDelay();
        currentEffectNode.delayTime.value = 0.4;
        const feedback = audioContext.createGain();
        feedback.gain.value = 0.6;
        micSource.connect(currentEffectNode);
        currentEffectNode.connect(feedback);
        feedback.connect(currentEffectNode);
        currentEffectNode.connect(outNode);
        const dry = audioContext.createGain();
        micSource.connect(dry);
        dry.connect(outNode);
    } else if (val === 'telephone') {
        currentEffectNode = audioContext.createBiquadFilter();
        currentEffectNode.type = 'bandpass';
        currentEffectNode.frequency.value = 1000;
        currentEffectNode.Q.value = 1.5;
        micSource.connect(currentEffectNode);
        currentEffectNode.connect(outNode);
    }
}