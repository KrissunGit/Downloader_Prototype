"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
window.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn');
    const urlInput = document.getElementById('url-input');
    const statusDiv = document.getElementById('status');
    const libraryGrid = document.getElementById('library-grid');
    const libraryGridVidoe = document.getElementById('library-grid-video');
    const navDownloader = document.getElementById('nav-downloader');
    const navLibrary = document.getElementById('nav-library');
    const navSettings = document.getElementById('nav-settings');
    const navMain = document.getElementById('nav-main');
    const navVideo = document.getElementById('nav-video');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const pageDownloader = document.getElementById('page-downloader');
    const pageLibrary = document.getElementById('page-library');
    const pageSettings = document.getElementById('page-settings');
    const pageMain = document.getElementById('page-main');
    const pageVideo = document.getElementById('page-video');
    const formatSelect = document.getElementById('format-select');
    const qualitySelect = document.getElementById('quality-select');
    const allPages = [pageDownloader, pageLibrary, pageSettings, pageMain, pageVideo];
    const allLinks = [navDownloader, navLibrary, navSettings, navMain, navVideo];
    const player = document.getElementById('audio-player');
    const masterPlayBtn = document.getElementById('master-play-btn');
    const progressBar = document.getElementById('progress-bar');
    const volumeSlider = document.getElementById('volume-slider');
    const currentTimeText = document.getElementById('current-time');
    const totalTimeText = document.getElementById('total-duration');
    const skipForwardBtn = document.getElementById('skip-forward-btn');
    const skipNextBtn = document.getElementById('skip-next-btn');
    const skipBackwardsBtn = document.getElementById('skip-backwards-btn');
    const skipPreviousBtn = document.getElementById('skip-previous-btn');
    skipForwardBtn === null || skipForwardBtn === void 0 ? void 0 : skipForwardBtn.addEventListener('click', () => {
        if (player.src) {
            player.currentTime = Math.min(player.currentTime + 10, player.duration);
        }
    });
    skipBackwardsBtn === null || skipBackwardsBtn === void 0 ? void 0 : skipBackwardsBtn.addEventListener('click', () => {
        if (player.src) {
            player.currentTime = Math.max(player.currentTime - 10, 0);
        }
    });
    skipPreviousBtn === null || skipPreviousBtn === void 0 ? void 0 : skipPreviousBtn.addEventListener('click', () => {
        const win = window;
        const playlist = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0)
            return;
        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;
        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            }
            catch (e) {
                idx = -1;
            }
        }
        if (idx > 0) {
            const prevIdx = idx - 1;
            win.currentIndex = prevIdx;
            const prev = playlist[prevIdx];
            player.src = `local-file://${prev.replace(/\\/g, '/')}`;
            player.play().catch((err) => console.error('Playback failed:', err));
        }
        else {
            win.currentIndex = -1;
        }
    });
    skipNextBtn === null || skipNextBtn === void 0 ? void 0 : skipNextBtn.addEventListener('click', () => {
        const win = window;
        const playlist = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0)
            return;
        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;
        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            }
            catch (e) {
                idx = -1;
            }
        }
        if (idx >= 0 && idx < playlist.length - 1) {
            const nextIdx = idx + 1;
            win.currentIndex = nextIdx;
            const next = playlist[nextIdx];
            player.src = `local-file://${next.replace(/\\/g, '/')}`;
            player.play().catch((err) => console.error('Playback failed:', err));
        }
        else {
            win.currentIndex = -1;
        }
    });
    masterPlayBtn === null || masterPlayBtn === void 0 ? void 0 : masterPlayBtn.addEventListener('click', () => {
        if (player.paused) {
            player.play();
            masterPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        else {
            player.pause();
            masterPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    player.addEventListener('timeupdate', () => {
        const percent = (player.currentTime / player.duration) * 100;
        progressBar.value = percent.toString();
        if (currentTimeText)
            currentTimeText.innerText = formatTime(player.currentTime);
    });
    progressBar === null || progressBar === void 0 ? void 0 : progressBar.addEventListener('input', () => {
        const seekTo = player.duration * (parseFloat(progressBar.value) / 100);
        player.currentTime = seekTo;
    });
    volumeSlider === null || volumeSlider === void 0 ? void 0 : volumeSlider.addEventListener('input', () => {
        player.volume = parseFloat(volumeSlider.value) / 100;
    });
    player.addEventListener('loadedmetadata', () => {
        if (totalTimeText)
            totalTimeText.innerText = formatTime(player.duration);
    });
    player.addEventListener('ended', () => {
        const win = window;
        const playlist = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0)
            return;
        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;
        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            }
            catch (e) {
                idx = -1;
            }
        }
        if (idx >= 0 && idx < playlist.length - 1) {
            const nextIdx = idx + 1;
            win.currentIndex = nextIdx;
            const next = playlist[nextIdx];
            player.src = `local-file://${next.replace(/\\/g, '/')}`;
            player.play().catch((err) => console.error('Playback failed:', err));
        }
        else {
            // End of playlist or unknown index: reset index
            win.currentIndex = -1;
        }
    });
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    function showPage(targetPage, targetLink) {
        if (!targetPage || !targetLink)
            return;
        allPages.forEach(p => { if (p)
            p.style.display = 'none'; });
        allLinks.forEach(l => { if (l)
            l.classList.remove('active'); });
        targetPage.style.display = 'flex';
        targetLink.classList.add('active');
    }
    navMain === null || navMain === void 0 ? void 0 : navMain.addEventListener('click', () => showPage(pageMain, navMain));
    navDownloader === null || navDownloader === void 0 ? void 0 : navDownloader.addEventListener('click', () => showPage(pageDownloader, navDownloader));
    navSettings === null || navSettings === void 0 ? void 0 : navSettings.addEventListener('click', () => showPage(pageSettings, navSettings));
    menuBtn === null || menuBtn === void 0 ? void 0 : menuBtn.addEventListener('click', () => {
        sidebar === null || sidebar === void 0 ? void 0 : sidebar.classList.toggle('collapsed');
    });
    navVideo === null || navVideo === void 0 ? void 0 : navVideo.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (libraryGridVidoe)
                libraryGridVidoe.innerHTML = "<p>Loading videos...</p>";
            const libraryData = yield window.electronAPI.getLibrary();
            // Extract the video array explicitly from the new envelope object
            yield renderVideoLibrary(libraryData.video || []);
            renderVideoLibrary(libraryData.video || []);
        }
        catch (err) {
            console.error("Error loading video library:", err);
            if (libraryGridVidoe)
                libraryGridVidoe.innerHTML = "<p>Error loading video library.</p>";
        }
        showPage(pageVideo, navVideo);
    }));
    // Show quality only for webm (video) format
    if (qualitySelect) {
        // hide by default
        qualitySelect.style.display = 'none';
    }
    formatSelect === null || formatSelect === void 0 ? void 0 : formatSelect.addEventListener('change', () => {
        const val = (formatSelect.value || '').toLowerCase();
        if (qualitySelect) {
            if (val === 'webm') {
                qualitySelect.style.display = '';
            }
            else {
                qualitySelect.style.display = 'none';
            }
        }
    });
    navLibrary === null || navLibrary === void 0 ? void 0 : navLibrary.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        if (libraryGrid && libraryGrid.children.length <= 1) {
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            try {
                const libraryData = yield window.electronAPI.getLibrary();
                renderLibrary(libraryData.audio || []);
            }
            catch (err) {
                libraryGrid.innerHTML = "<p>Error loading library.</p>";
            }
        }
        showPage(pageLibrary, navLibrary);
    }));
    downloadBtn === null || downloadBtn === void 0 ? void 0 : downloadBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        const format = formatSelect.value;
        const quality = qualitySelect.value;
        if (!url) {
            statusDiv.innerText = "Please paste a link first!";
            return;
        }
        statusDiv.innerText = "Processing...";
        downloadBtn.disabled = true;
        window.electronAPI.startDownload(url, format, quality);
    });
    window.electronAPI.onDownloadStatus((status) => {
        statusDiv.innerText = status;
        downloadBtn.disabled = false;
        if (status === "Finished!") {
            urlInput.value = "";
            refreshLibrary();
        }
    });
    function openPlaylist(playlistId, playlistName, playlistThumbPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!libraryGrid)
                return;
            libraryGrid.style.display = "block";
            // Show a loading state
            libraryGrid.innerHTML = "<p>Loading songs...</p>";
            try {
                const songs = yield window.electronAPI.getSongs(playlistId);
                console.log("Enriched Songs from Main:", songs);
                const rawThumb = playlistThumbPath || (((_a = songs[0]) === null || _a === void 0 ? void 0 : _a.thumb) || ((_b = songs[0]) === null || _b === void 0 ? void 0 : _b.Thumb) || '');
                let playlistThumb = 'default-cover.jpg';
                if (rawThumb) {
                    playlistThumb = rawThumb.startsWith('data:')
                        ? rawThumb
                        : `local-file://${rawThumb.replace(/\\/g, '/')}`;
                }
                const formatTime = (seconds) => {
                    if (!seconds)
                        return "0:00";
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                };
                console.log("Go returned this data:", songs);
                // Store the current playlist paths (normalized with forward slashes)
                window.currentPlaylist = songs.map((song) => (song.filename || song.Filename || '').replace(/\\/g, '/'));
                window.currentIndex = -1;
                libraryGrid.innerHTML = `
                <div class="view-header">
                    <button id="btn-back" class="back-button">←</button>
                    <h2>${playlistName}</h2>
                    <img class="view-header-thumb" src="${playlistThumb}" onerror="this.src='default-cover.jpg'">
                </div>
                <div class="song-list">
                    ${songs.map(song => {
                    const songName = song.name || song.Name || "Unknown Song";
                    const songArtist = song.artist || song.Artist || "Unknown Artist";
                    const songPath = song.filename || song.Filename || "";
                    const songThumb = song.thumb || song.Thumb || "";
                    let imgSrc = "";
                    if (songThumb.startsWith('data:')) {
                        imgSrc = songThumb;
                    }
                    else if (songThumb) {
                        imgSrc = `local-file://${songThumb}`;
                    }
                    else {
                        imgSrc = 'default-cover.jpg';
                    }
                    return `
                            <div class="song-row" id="">
                                <div class="song-info">
                                    <img src="${imgSrc}" onerror="this.src='default-cover.jpg'" loading="lazy">
                                    <div class="song-metadata">
                                        <span class="song-name">${songName}</span>
                                        <span class="song-artist">${songArtist}</span>
                                    </div>
                                </div>
                                <button class="play-btn" onclick="playSong('${songPath.replace(/\\/g, '/')}')">▶</button>
                            </div>
                        `;
                }).join('')}
                </div> 
            `;
                (_c = document.getElementById('btn-back')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
                    refreshLibrary();
                });
            }
            catch (err) {
                console.error(err);
                libraryGrid.innerHTML = "<p>Error loading songs.</p>";
            }
        });
    }
    function refreshLibrary() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!libraryGrid)
                return;
            libraryGrid.style.display = "grid";
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            try {
                const libraryData = yield window.electronAPI.getLibrary();
                renderLibrary(libraryData.audio || []);
            }
            catch (err) {
                libraryGrid.innerHTML = "<p>Error loading library.</p>";
            }
        });
    }
    function renderVideoLibrary(playlists) {
        // FIXED: Ensure we exit if the specific video grid container doesn't exist
        if (!libraryGridVidoe)
            return;
        libraryGridVidoe.style.display = "grid";
        libraryGridVidoe.innerHTML = "";
        if (!playlists || playlists.length === 0) {
            libraryGridVidoe.innerHTML = "<p>No video playlists found.</p>";
            return;
        }
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = `
                <div class="thumb-container">
                    <img src="local-file://${playlist.thumb}" alt="${playlist.name}">
                    <button class="playlist-dropdown-btn">
                        &#8942;
                    </button>
                    <div id="menu-${playlist.id}" class="playlist-dropdown">
                        <div class="menu-item btn-delete-action">Delete</div>
                        <div class="menu-item btn-rename-action">Rename</div>
                    </div>
                </div>
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                </div>
            `;
            // 1. Safe Dropdown Toggle Listener
            const menuBtn = card.querySelector('.playlist-dropdown-btn');
            menuBtn === null || menuBtn === void 0 ? void 0 : menuBtn.addEventListener('click', (e) => {
                togglePlaylistMenu(e, playlist.id);
            });
            // 2. Dedicated Delete Click Handler
            const deleteItem = card.querySelector('.menu-item.btn-delete-action');
            deleteItem === null || deleteItem === void 0 ? void 0 : deleteItem.addEventListener('click', (e) => {
                deletePlaylist(e, playlist.id);
            });
            // 3. Dedicated Rename Click Handler
            const renameItem = card.querySelector('.menu-item.btn-rename-action');
            renameItem === null || renameItem === void 0 ? void 0 : renameItem.addEventListener('click', (e) => {
                renamePlaylist(e, playlist.id);
            });
            // 4. Main Card Action (Ignores dropdown clicks)
            card.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest('.playlist-dropdown-btn') || target.closest('.playlist-dropdown')) {
                    return;
                }
                // Future feature expansion: adjust this to open video tracks specifically
                openVideoPlaylist(playlist.id, playlist.name, playlist.thumb);
            });
            // FIXED: Appends onto your designated video wrapper element
            libraryGridVidoe.appendChild(card);
        });
    }
    function openVideoPlaylist(playlistId, playlistName, playlistThumbPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!libraryGridVidoe)
                return;
            libraryGridVidoe.style.display = "block";
            libraryGridVidoe.innerHTML = "<p>Loading videos...</p>";
            try {
                const videos = yield window.electronAPI.getSongs(playlistId); // Assuming this retrieves track records
                let playlistThumb = 'default-cover.jpg';
                if (playlistThumbPath) {
                    playlistThumb = playlistThumbPath.startsWith('data:')
                        ? playlistThumbPath
                        : `local-file://${playlistThumbPath.replace(/\\/g, '/')}`;
                }
                libraryGridVidoe.innerHTML = `
                <div class="view-header">
                    <button id="btn-video-back" class="back-button">←</button>
                    <h2>${playlistName}</h2>
                    <img class="view-header-thumb" src="${playlistThumb}" onerror="this.src='default-cover.jpg'">
                </div>
                <div class="song-list">
                    ${videos.map(vid => {
                    const vidName = vid.name || vid.Name || "Unknown Video";
                    const vidPath = vid.filename || vid.Filename || "";
                    return `
                            <div class="song-row">
                                <div class="song-info">
                                    <div class="song-metadata">
                                        <span class="song-name">${vidName}</span>
                                    </div>
                                </div>
                                <!-- Routes directly to a global window space player if needed -->
                                <button class="play-btn" onclick="playVideo('${vidPath.replace(/\\/g, '/')}')">▶</button>
                            </div>
                        `;
                }).join('')}
                </div> 
            `;
                (_a = document.getElementById('btn-video-back')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                    if (libraryGridVidoe)
                        libraryGridVidoe.style.display = "grid";
                    const libraryData = yield window.electronAPI.getLibrary();
                    renderVideoLibrary(libraryData.video || []);
                }));
            }
            catch (err) {
                console.error(err);
                libraryGridVidoe.innerHTML = "<p>Error loading videos.</p>";
            }
        });
    }
    function renderLibrary(playlists) {
        if (!libraryGrid)
            return;
        libraryGrid.style.display = "grid";
        libraryGrid.innerHTML = "";
        if (!playlists || playlists.length === 0) {
            libraryGrid.innerHTML = "<p>No playlists found.</p>";
            return;
        }
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            // REMOVED inline onclick attributes entirely
            card.innerHTML = `
                <div class="thumb-container">
                    <img src="local-file://${playlist.thumb}" alt="${playlist.name}">
                    <button class="playlist-dropdown-btn">
                        &#8942;
                    </button>
                    <div id="menu-${playlist.id}" class="playlist-dropdown">
                        <div class="menu-item btn-delete-action">Delete</div>
                        <div class="menu-item btn-rename-action">Rename</div>
                    </div>
                </div>
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                </div>
            `;
            // 1. Safe Dropdown Toggle Listener
            const menuBtn = card.querySelector('.playlist-dropdown-btn');
            menuBtn === null || menuBtn === void 0 ? void 0 : menuBtn.addEventListener('click', (e) => {
                togglePlaylistMenu(e, playlist.id);
            });
            // 2. Dedicated Delete Click Handler
            const deleteItem = card.querySelector('.menu-item.btn-delete-action');
            deleteItem === null || deleteItem === void 0 ? void 0 : deleteItem.addEventListener('click', (e) => {
                deletePlaylist(e, playlist.id);
            });
            // 3. Dedicated Rename Click Handler (This guarantees execution!)
            const renameItem = card.querySelector('.menu-item.btn-rename-action');
            renameItem === null || renameItem === void 0 ? void 0 : renameItem.addEventListener('click', (e) => {
                renamePlaylist(e, playlist.id);
            });
            // 4. Main Card Action (Ignores internal menu clicks)
            card.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest('.playlist-dropdown-btn') || target.closest('.playlist-dropdown')) {
                    return;
                }
                openPlaylist(playlist.id, playlist.name, playlist.thumb);
            });
            libraryGrid.appendChild(card);
        });
    }
    function deletePlaylist(event, id) {
        return __awaiter(this, void 0, void 0, function* () {
            event.stopPropagation();
            if (confirm("Are you sure you want to delete this playlist?")) {
                console.log("Deleting playlist: ", id);
                try {
                    yield window.electronAPI.deletePlaylist(id);
                    yield refreshLibrary();
                    console.log("Playlist deleted successfully.");
                }
                catch (err) {
                    console.error("Error deleting playlist:", err);
                    alert("Failed to delete playlist. Please try again.");
                }
            }
        });
    }
    function renamePlaylist(event, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            event.stopPropagation();
            // 1. Close the dropdown menu immediately so it doesn't get stuck open
            document.querySelectorAll('.playlist-dropdown').forEach((menu) => {
                menu.style.display = 'none';
            });
            // 2. Ask the user for a new name using a clean HTML custom popup 
            // (Or just use our updated bridge to do it natively)
            const currentCard = event.target.closest('.playlist-card');
            const oldName = ((_a = currentCard === null || currentCard === void 0 ? void 0 : currentCard.querySelector('h3')) === null || _a === void 0 ? void 0 : _a.innerText) || "";
            // Let's create a quick, reliable inline modal overlay so we don't rely on broken browser prompts
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '9999';
            modal.innerHTML = `
            <div style="background: #2b2b2b; color: #fff; padding: 20px; border-radius: 8px; width: 300px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <h3 style="margin-top: 0;">Rename Playlist</h3>
                <input type="text" id="modal-rename-input" value="${oldName}" style="width: 100%; padding: 8px; margin: 15px 0; border-radius: 4px; border: 1px solid #444; background: #1e1e1e; color: #fff; box-sizing: border-box;">
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="modal-cancel-btn" style="background: #444; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="modal-save-btn" style="background: #007acc; color: #fff; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">Save</button>
                </div>
            </div>
        `;
            document.body.appendChild(modal);
            // Auto-focus the input text box
            const input = modal.querySelector('#modal-rename-input');
            input.focus();
            input.select();
            // Handle Cancel Action
            (_b = modal.querySelector('#modal-cancel-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
                modal.remove();
            });
            // Handle Save Action
            (_c = modal.querySelector('#modal-save-btn')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
                const newName = input.value.trim();
                if (newName && newName !== oldName) {
                    try {
                        modal.remove();
                        yield window.electronAPI.renamePlaylist(id, newName);
                        yield refreshLibrary();
                        console.log("Playlist renamed successfully.");
                    }
                    catch (err) {
                        console.error("Error renaming playlist:", err);
                        alert("Failed to rename playlist. Please try again.");
                    }
                }
                else {
                    modal.remove();
                }
            }));
        });
    }
    window.renamePlaylist = renamePlaylist;
    window.deletePlaylist = deletePlaylist;
});
let downloadQueue = [];
window.electronAPI.onDownloadStatusStream((update) => {
    const existingIndex = downloadQueue.findIndex(item => item.id === update.id);
    if (existingIndex > -1) {
        downloadQueue[existingIndex].status = update.status;
    }
    else {
        downloadQueue.push(update);
    }
    renderQueue();
});
function renderQueue() {
    const container = document.getElementById('queue-container');
    if (!container)
        return;
    container.innerHTML = downloadQueue.map(item => {
        let statusBadge = '';
        if (item.status === 'pending')
            statusBadge = '<span class="badge pending">Waiting</span>';
        if (item.status === 'downloading')
            statusBadge = '<span class="badge downloading">Downloading</span>';
        if (item.status === 'completed')
            statusBadge = '<span class="badge completed">Done</span>';
        return `
            <div class="queue-row ${item.status}">
                <span class="song-title">${item.title}</span>
                ${statusBadge}
            </div>
        `;
    }).join('');
}
function togglePlaylistMenu(event, id) {
    event.stopPropagation();
    const targetMenuId = `menu-${id}`;
    document.querySelectorAll('.playlist-dropdown').forEach((menu) => {
        if (menu.id !== targetMenuId)
            menu.style.display = 'none';
    });
    const menu = document.getElementById(targetMenuId);
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}
window.togglePlaylistMenu = togglePlaylistMenu;
window.playVideo = (filename) => {
    // 1. Target the exact elements from your index.html file
    const videoModal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('global-video-player');
    const audioPlayer = document.getElementById('audio-player');
    const masterPlayBtn = document.getElementById('master-play-btn');
    if (!videoModal || !videoPlayer) {
        console.error("Critical Error: Video player elements not found in DOM.");
        return;
    }
    // 2. Shut down background music tracks so audio doesn't overlap
    if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
        if (masterPlayBtn) {
            masterPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
    // 3. Assemble the normalized local-file URL path string
    // Normalize and ensure the path uses the project's video folder (supports MyVideos and MyVideo)
    let cleanRelPath = filename.replace(/\\/g, '/');
    if (!cleanRelPath.startsWith('MyVideos/') && !cleanRelPath.startsWith('MyVideo/')) {
        cleanRelPath = `MyVideos/${cleanRelPath}`;
    }
    const cleanPath = `local-file://${cleanRelPath}`;
    console.log("Binding source link to media core engine:", cleanPath);
    // 4. Update the source stream layout and force reload the hardware decoder pipeline
    videoPlayer.src = cleanPath;
    videoPlayer.load();
    // 5. Open the modal overlay frame container
    videoModal.style.display = 'flex';
    // 6. Execute video playback
    videoPlayer.play().catch((err) => {
        console.error("Chromium core video execution engine failed to play track:", err);
    });
    // 7. Wire up the close button listener to clear memory buffers cleanly
    const closeBtn = document.getElementById('close-video-btn');
    const closeHandler = () => {
        videoPlayer.pause();
        videoPlayer.src = ""; // Flushes media buffers out of system memory
        videoModal.style.display = 'none';
        closeBtn === null || closeBtn === void 0 ? void 0 : closeBtn.removeEventListener('click', closeHandler);
    };
    closeBtn === null || closeBtn === void 0 ? void 0 : closeBtn.addEventListener('click', closeHandler);
};
window.addEventListener('click', (event) => {
    if (!event.target.matches('.playlist-dropdown-btn')) {
        document.querySelectorAll('.playlist-dropdown').forEach((menu) => {
            menu.style.display = 'none';
        });
    }
});
window.playSong = (filename) => {
    const player = document.getElementById('audio-player');
    let cleanRel = filename.replace(/\\/g, '/');
    if (!cleanRel.startsWith('MyMusic/')) {
        cleanRel = `MyMusic/${cleanRel}`;
    }
    const cleanPath = `local-file://${cleanRel}`;
    const win = window;
    if (!win.currentPlaylist)
        win.currentPlaylist = [];
    let idx = win.currentPlaylist.findIndex((p) => p === cleanRel || p.endsWith(cleanRel) || p.includes(cleanRel));
    if (idx === -1) {
        const fname = cleanRel.split('/').pop();
        idx = win.currentPlaylist.findIndex((p) => (p && p.split('/').pop()) === fname);
    }
    win.currentIndex = idx;
    if (player) {
        if (player.src.includes(encodeURI(cleanRel)) && !player.paused) {
            player.pause();
        }
        else {
            player.src = cleanPath;
            player.play().catch((err) => console.error("Playback failed:", err));
        }
    }
};
