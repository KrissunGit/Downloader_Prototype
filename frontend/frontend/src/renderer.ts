window.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
    const urlInput = document.getElementById('url-input') as HTMLInputElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const libraryGrid = document.getElementById('library-grid') as HTMLDivElement; 

    const navDownloader = document.getElementById('nav-downloader');
    const navLibrary = document.getElementById('nav-library');
    const navSettings = document.getElementById('nav-settings');
    const navMain = document.getElementById('nav-main');
    const menuBtn = document.getElementById('menu-btn');

    const sidebar = document.getElementById('sidebar')

    const pageDownloader = document.getElementById('page-downloader');
    const pageLibrary = document.getElementById('page-library');
    const pageSettings = document.getElementById('page-settings');
    const pageMain = document.getElementById('page-main');

    const allPages = [pageDownloader, pageLibrary, pageSettings, pageMain];
    const allLinks = [navDownloader, navLibrary, navSettings, navMain];

    const player = document.getElementById('audio-player') as HTMLAudioElement;
    const masterPlayBtn = document.getElementById('master-play-btn');
    const progressBar = document.getElementById('progress-bar') as HTMLInputElement;
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const currentTimeText = document.getElementById('current-time');
    const totalTimeText = document.getElementById('total-duration');

    masterPlayBtn?.addEventListener('click', () => {
        if (player.paused) {
            player.play();
            masterPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            player.pause();
            masterPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    player.addEventListener('timeupdate', () => {
        const percent = (player.currentTime / player.duration) * 100;
        progressBar.value = percent.toString();
        if (currentTimeText) currentTimeText.innerText = formatTime(player.currentTime);
    });

    progressBar?.addEventListener('input', () => {
        const seekTo = player.duration * (parseFloat(progressBar.value) / 100);
        player.currentTime = seekTo;
    });

    volumeSlider?.addEventListener('input', () => {
        player.volume = parseFloat(volumeSlider.value) / 100;
    });

    player.addEventListener('loadedmetadata', () => {
        if (totalTimeText) totalTimeText.innerText = formatTime(player.duration);
    });

    function formatTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function showPage(targetPage: HTMLElement | null, targetLink: HTMLElement | null) {
        if (!targetPage || !targetLink) return;
        allPages.forEach(p => { if (p) p.style.display = 'none'; });
        allLinks.forEach(l => { if (l) l.classList.remove('active'); });
        targetPage.style.display = 'block';
        targetLink.classList.add('active');
    }

    navMain?.addEventListener('click', () => showPage(pageMain, navMain));
    navDownloader?.addEventListener('click', () => showPage(pageDownloader, navDownloader));
    navSettings?.addEventListener('click', () => showPage(pageSettings, navSettings));
    menuBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
    });

    navLibrary?.addEventListener('click', async () => {
        if (libraryGrid && libraryGrid.children.length <= 1) {
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            
            try {
                const playlists = await window.electronAPI.getLibrary();
                renderLibrary(playlists);
            } catch (err) {
                libraryGrid.innerHTML = "<p>Error loading library.</p>";
            }
        }
        showPage(pageLibrary, navLibrary);
    });

    downloadBtn?.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            statusDiv.innerText = "Please paste a link first!";
            return;
        }

        statusDiv.innerText = "Processing...";
        downloadBtn.disabled = true;
        
        window.electronAPI.downloadSong(url);
    });

    window.electronAPI.onDownloadStatus((status: string) => {
        statusDiv.innerText = status;
        downloadBtn.disabled = false;
        if (status === "Finished!") {
            urlInput.value = "";
        }
    });

    async function openPlaylist(playlistId: string, playlistName: string) {
        if (!libraryGrid) return;
        libraryGrid.style.display = "block"
        // Show a loading state
        libraryGrid.innerHTML = "<p>Loading songs...</p>";

        try {
            const songs = await window.electronAPI.getSongs(playlistId);
            console.log("Enriched Songs from Main:", songs);
            const formatTime = (seconds: number) => {
                if (!seconds) return "0:00";
                const mins = Math.floor(seconds/60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2,'0')}`;
            };
            console.log("Go returned this data:", songs);
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
                        } else if (songThumb) {
                            imgSrc = `local-file://${songThumb}`;
                        } else {
                            imgSrc = 'default-cover.jpg'
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

            document.getElementById('btn-back')?.addEventListener('click', () => {
                refreshLibrary(); 
            });

        } catch (err) {
            console.error(err);
            libraryGrid.innerHTML = "<p>Error loading songs.</p>";
        }
    }

    async function refreshLibrary() {
        libraryGrid.innerHTML = "<p>Loading Library...</p>";
        const playlists = await window.electronAPI.getLibrary();
        renderLibrary(playlists);
    }

    function renderLibrary(playlists: any[]) {
        if (!libraryGrid) return;
        libraryGrid.style.display = "grid"; 
        libraryGrid.innerHTML = ""; 

        if (!playlists || playlists.length === 0) {
            libraryGrid.innerHTML = "<p>No playlists found.</p>";
            return;
        }

        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card';
            
            card.innerHTML = `
                <div class="thumb-container">
                    <img src="local-file://${playlist.thumb}" alt="${playlist.name}" 
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


            card.addEventListener('click',(e) => {
                openPlaylist(playlist.id, playlist.name);
            });

            libraryGrid.appendChild(card);
        });
    }
});

function togglePlaylistMenu(event: MouseEvent, id: string) {
    event.stopPropagation(); 
    
    const targetMenuId = `menu-${id}`;
    
    document.querySelectorAll('.playlist-dropdown').forEach((menu: any) => {
        if (menu.id !== targetMenuId) menu.style.display = 'none';
    });

    const menu = document.getElementById(targetMenuId);
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

(window as any).togglePlaylistMenu = togglePlaylistMenu;
(window as any).deletePlaylist = deletePlaylist;
(window as any).renamePlaylist = renamePlaylist;

window.addEventListener('click', (event: any) => {
    if (!event.target.matches('.playlist-dropdown-btn')) {
        document.querySelectorAll('.playlist-dropdown').forEach((menu: any) => {
            menu.style.display = 'none';
        });
    }
});

function deletePlaylist(event: MouseEvent, id: string) {
    event.stopPropagation();
    if(confirm("Are you sure you want to delete this playlist?")) {
        console.log("Deleting playlist: ", id);
        // window.electronAPI.deletePlaylist(id); 
    }
}

function renamePlaylist(event: MouseEvent, id: string) {
    event.stopPropagation();
    console.log("Rename requested for:", id);
}

declare global {
    interface Window {
        electronAPI: {
            downloadSong: (url: string) => void;
            getLibrary: () => Promise<any>;
            getSongs: (playlistID: string) => Promise<any[]>;
            onDownloadStatus: (callback: (s: string) => void) => void;
        }
    }
}

(window as any).playSong = (filename: string) => {
    const player = document.getElementById('audio-player') as HTMLAudioElement;
    const cleanPath = `local-file://${filename.replace(/\\/g, '/')}`;

    if (player) {
        if (player.src.includes(encodeURI(filename.replace(/\\/g, '/'))) && !player.paused) {
            player.pause();
        } else {
            player.src = cleanPath;
            player.play().catch(err => console.error("Playback failed:", err));
        }
    }
};