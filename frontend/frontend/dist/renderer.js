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
    // --- 1. UI Elements ---
    const downloadBtn = document.getElementById('download-btn');
    const urlInput = document.getElementById('url-input');
    const statusDiv = document.getElementById('status');
    const libraryGrid = document.getElementById('library-grid');
    const navDownloader = document.getElementById('nav-downloader');
    const navLibrary = document.getElementById('nav-library');
    const navSettings = document.getElementById('nav-settings');
    const navMain = document.getElementById('nav-main');
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    const pageDownloader = document.getElementById('page-downloader');
    const pageLibrary = document.getElementById('page-library');
    const pageSettings = document.getElementById('page-settings');
    const pageMain = document.getElementById('page-main');
    const allPages = [pageDownloader, pageLibrary, pageSettings, pageMain];
    const allLinks = [navDownloader, navLibrary, navSettings, navMain];
    const player = document.getElementById('audio-player');
    const masterPlayBtn = document.getElementById('master-play-btn');
    const progressBar = document.getElementById('progress-bar');
    const volumeSlider = document.getElementById('volume-slider');
    const currentTimeText = document.getElementById('current-time');
    const totalTimeText = document.getElementById('total-duration');
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
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    // --- 2. Navigation Logic ---
    function showPage(targetPage, targetLink) {
        if (!targetPage || !targetLink)
            return;
        allPages.forEach(p => { if (p)
            p.style.display = 'none'; });
        allLinks.forEach(l => { if (l)
            l.classList.remove('active'); });
        targetPage.style.display = 'block';
        targetLink.classList.add('active');
    }
    navMain === null || navMain === void 0 ? void 0 : navMain.addEventListener('click', () => showPage(pageMain, navMain));
    navDownloader === null || navDownloader === void 0 ? void 0 : navDownloader.addEventListener('click', () => showPage(pageDownloader, navDownloader));
    navSettings === null || navSettings === void 0 ? void 0 : navSettings.addEventListener('click', () => showPage(pageSettings, navSettings));
    menuBtn === null || menuBtn === void 0 ? void 0 : menuBtn.addEventListener('click', () => {
        sidebar === null || sidebar === void 0 ? void 0 : sidebar.classList.toggle('collapsed');
    });
    // Special Logic for Library: Fetch data when clicking the tab
    navLibrary === null || navLibrary === void 0 ? void 0 : navLibrary.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
        // Only show the loading state if we don't have cards yet
        if (libraryGrid && libraryGrid.children.length <= 1) {
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            try {
                const playlists = yield window.electronAPI.getLibrary();
                renderLibrary(playlists);
            }
            catch (err) {
                libraryGrid.innerHTML = "<p>Error loading library.</p>";
            }
        }
        showPage(pageLibrary, navLibrary);
    }));
    // --- 3. Download Logic (Via Bridge) ---
    downloadBtn === null || downloadBtn === void 0 ? void 0 : downloadBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            statusDiv.innerText = "Please paste a link first!";
            return;
        }
        statusDiv.innerText = "Processing...";
        downloadBtn.disabled = true;
        // Use the bridge instead of child_process
        window.electronAPI.downloadSong(url);
    });
    // Listen for updates from the Main process
    window.electronAPI.onDownloadStatus((status) => {
        statusDiv.innerText = status;
        downloadBtn.disabled = false;
        if (status === "Finished!") {
            urlInput.value = ""; // Clear input on success
        }
    });
    function openPlaylist(playlistId, playlistName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!libraryGrid)
                return;
            libraryGrid.style.display = "block";
            // Show a loading state
            libraryGrid.innerHTML = "<p>Loading songs...</p>";
            try {
                const songs = yield window.electronAPI.getSongs(playlistId);
                console.log("Enriched Songs from Main:", songs);
                const formatTime = (seconds) => {
                    if (!seconds)
                        return "0:00";
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                };
                console.log("Go returned this data:", songs);
                // Clear and render the song view
                libraryGrid.innerHTML = `
                <div class="view-header">
                    <button id="btn-back" class="back-button">← Back to Playlists</button>
                    <h2>${playlistName}</h2>
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
                            <div class="song-row">
                                <div class="song-info">
                                    <img src="${imgSrc}" onerror="this.src='default-cover.jpg'" loading="lazy">
                                    <div class="song-metadata">
                                        <span class="song-name">${songName}</span>
                                        <span class="song-artist">${songArtist}</span>
                                    </div>
                                </div>
                                <button class="play-btn" onclick="playSong('${songPath.replace(/\\/g, '/')}')">▶ Play</button>
                            </div>
                        `;
                }).join('')}
                </div> 
            `;
                // Add the back button logic
                (_a = document.getElementById('btn-back')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
                    refreshLibrary(); // This calls your original playlist-grid view
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
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            const playlists = yield window.electronAPI.getLibrary();
            renderLibrary(playlists);
        });
    }
    // --- 4. Library Rendering ---
    function renderLibrary(playlists) {
        if (!libraryGrid)
            return;
        libraryGrid.style.display = "grid";
        libraryGrid.innerHTML = ""; // Clear loader
        if (!playlists || playlists.length === 0) {
            libraryGrid.innerHTML = "<p>No playlists found.</p>";
            return;
        }
        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            // Note: The 'src' assumes your Electron main process 
            // is serving the 'MyMusic' folder as static files
            card.innerHTML = `
                <div class="thumb-container">
                    <img src="local-file://${playlist.thumb}" alt="${playlist.name}" 
                         onerror="this.src='default-cover.jpg'">
                    <button class="playlist-dropdown-btn" onclick="togglePlaylistMenu(event, '${playlist.id}')">
                        &#8942;
                    </button>
                    <div id="menu-${playlist.id}" class="playlist-dropdown">
                        <div class="menu-item" onclick="deletePlaylist(event, '${playlist.id}')">Delete</div>
                        <div class="menu-item" onclick="renamePlaylist(event, '${playlist.id}')">Rename</div>
                    </div>
                </div>
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                </div>
            `;
            //To add more info you add it here
            card.addEventListener('click', (e) => {
                openPlaylist(playlist.id, playlist.name);
            });
            libraryGrid.appendChild(card);
        });
    }
});
function togglePlaylistMenu(event, id) {
    event.stopPropagation(); // Stops the playlist card from opening
    const targetMenuId = `menu-${id}`;
    // Close all other menus
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
window.deletePlaylist = deletePlaylist;
window.renamePlaylist = renamePlaylist;
// Fix 3: Removed leading dots in matches() and fixed typos
window.addEventListener('click', (event) => {
    if (!event.target.matches('.playlist-dropdown-btn')) {
        document.querySelectorAll('.playlist-dropdown').forEach((menu) => {
            menu.style.display = 'none';
        });
    }
});
function deletePlaylist(event, id) {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this playlist?")) {
        console.log("Deleting playlist: ", id);
        // window.electronAPI.deletePlaylist(id); 
    }
}
function renamePlaylist(event, id) {
    event.stopPropagation();
    console.log("Rename requested for:", id);
    // Logic for renaming goes here
}
window.playSong = (filename) => {
    const player = document.getElementById('audio-player');
    const cleanPath = `local-file://${filename.replace(/\\/g, '/')}`;
    if (player) {
        // If the same song is already playing, PAUSE it
        if (player.src.includes(encodeURI(filename.replace(/\\/g, '/'))) && !player.paused) {
            player.pause();
        }
        else {
            // Otherwise, play the new song
            player.src = cleanPath;
            player.play().catch(err => console.error("Playback failed:", err));
        }
    }
};
