import { ref } from "node:process";

window.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
    const urlInput = document.getElementById('url-input') as HTMLInputElement;
    const statusDiv = document.getElementById('status') as HTMLDivElement;
    const libraryGrid = document.getElementById('library-grid') as HTMLDivElement; 
    const libraryGridVidoe = document.getElementById('library-grid-video') as HTMLDivElement;

    const navDownloader = document.getElementById('nav-downloader');
    const navLibrary = document.getElementById('nav-library');
    const navSettings = document.getElementById('nav-settings');
    const navMain = document.getElementById('nav-main');
    const navVideo = document.getElementById('nav-video');
    const menuBtn = document.getElementById('menu-btn');

    const sidebar = document.getElementById('sidebar')

    const pageDownloader = document.getElementById('page-downloader');
    const pageLibrary = document.getElementById('page-library');
    const pageSettings = document.getElementById('page-settings');
    const pageMain = document.getElementById('page-main');
    const pageVideo = document.getElementById('page-video');

    const formatSelect = document.getElementById('format-select') as HTMLSelectElement;
    const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;

    const allPages = [pageDownloader, pageLibrary, pageSettings, pageMain, pageVideo];
    const allLinks = [navDownloader, navLibrary, navSettings, navMain, navVideo];

    const player = document.getElementById('audio-player') as HTMLAudioElement;
    const masterPlayBtn = document.getElementById('master-play-btn');
    const progressBar = document.getElementById('progress-bar') as HTMLInputElement;
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const currentTimeText = document.getElementById('current-time');
    const totalTimeText = document.getElementById('total-duration');
    const skipForwardBtn = document.getElementById('skip-forward-btn');
    const skipNextBtn = document.getElementById('skip-next-btn');
    const skipBackwardsBtn = document.getElementById('skip-backwards-btn');
    const skipPreviousBtn = document.getElementById('skip-previous-btn');

    skipForwardBtn?.addEventListener('click', () => {
        if (player.src) {
            player.currentTime = Math.min(player.currentTime + 10, player.duration);
        }
    });

    skipBackwardsBtn?.addEventListener('click', () => {
        if (player.src) {
            player.currentTime = Math.max(player.currentTime - 10, 0);
        }
    });

    skipPreviousBtn?.addEventListener('click', () => {
        const win = window as any;
        const playlist: string[] = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0) return;

        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;

        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            } catch (e) {
                idx = -1;
            }
        }

        if (idx > 0) {
            const prevIdx = idx - 1;
            win.currentIndex = prevIdx;
            const prev = playlist[prevIdx];
            player.src = `local-file://${prev.replace(/\\/g, '/')}`;
            player.play().catch((err: any) => console.error('Playback failed:', err));
        } else {
            win.currentIndex = -1;
        }
    });

    skipNextBtn?.addEventListener('click', () => {
        const win = window as any;
        const playlist: string[] = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0) return;

        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;

        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            } catch (e) {
                idx = -1;
            }
        }

        if (idx >= 0 && idx < playlist.length - 1) {
            const nextIdx = idx + 1;
            win.currentIndex = nextIdx;
            const next = playlist[nextIdx];
            player.src = `local-file://${next.replace(/\\/g, '/')}`;
            player.play().catch((err: any) => console.error('Playback failed:', err));
        } else {
            win.currentIndex = -1;
        }
    });

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

    player.addEventListener('ended', () => {
        const win = window as any;
        const playlist: string[] = win.currentPlaylist || [];
        if (!playlist || playlist.length === 0) return;

        let idx = typeof win.currentIndex === 'number' ? win.currentIndex : -1;

        if (idx === -1) {
            try {
                const src = decodeURI(player.src || '').replace('local-file://', '');
                idx = playlist.findIndex(p => src.includes(p));
            } catch (e) {
                idx = -1;
            }
        }

        if (idx >= 0 && idx < playlist.length - 1) {
            const nextIdx = idx + 1;
            win.currentIndex = nextIdx;
            const next = playlist[nextIdx];
            player.src = `local-file://${next.replace(/\\/g, '/')}`;
            player.play().catch((err: any) => console.error('Playback failed:', err));
        } else {
            win.currentIndex = -1;
        }
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
        targetPage.style.display = 'flex';
        targetLink.classList.add('active');
    }

    navMain?.addEventListener('click', () => showPage(pageMain, navMain));
    navDownloader?.addEventListener('click', () => showPage(pageDownloader, navDownloader));
    navSettings?.addEventListener('click', () => showPage(pageSettings, navSettings));
    
    menuBtn?.addEventListener('click', () => {
        sidebar?.classList.toggle('collapsed');
    });

    navVideo?.addEventListener('click', async () => {
        try {
            if (libraryGridVidoe) libraryGridVidoe.innerHTML = "<p>Loading videos...</p>";
            const libraryData = await window.electronAPI.getLibrary();
            await renderVideoLibrary(libraryData.video || []); 
            renderVideoLibrary(libraryData.video || []);
        } catch (err) {
            console.error("Error loading video library:", err);
            if (libraryGridVidoe) libraryGridVidoe.innerHTML = "<p>Error loading video library.</p>";
        }
        showPage(pageVideo, navVideo);
    });

    if (qualitySelect) {
        
        qualitySelect.style.display = 'none';
    }

    formatSelect?.addEventListener('change', () => {
        const val = (formatSelect.value || '').toLowerCase();
        if (qualitySelect) {
            if (val === 'webm') {
                qualitySelect.style.display = '';
            } else {
                qualitySelect.style.display = 'none';
            }
        }
    });

    navLibrary?.addEventListener('click', async () => {
        if (libraryGrid && libraryGrid.children.length <= 1) {
            libraryGrid.innerHTML = "<p>Loading Library...</p>";
            try {
                const libraryData = await window.electronAPI.getLibrary();
                renderLibrary(libraryData.audio || []);
            } catch (err) {
                libraryGrid.innerHTML = "<p>Error loading library.</p>";
            }
        }
        showPage(pageLibrary, navLibrary);
    });

    downloadBtn?.addEventListener('click', () => {
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

    window.electronAPI.onDownloadStatus((status: string) => {
        statusDiv.innerText = status;
        downloadBtn.disabled = false;
        if (status === "Finished!") {
            urlInput.value = "";
            refreshLibrary();
        }
    });

    async function openPlaylist(playlistId: string, playlistName: string, playlistThumbPath?: string) {
        if (!libraryGrid) return;
        libraryGrid.style.display = "block"
        libraryGrid.innerHTML = "<p>Loading songs...</p>";

        try {
            const songs = await window.electronAPI.getSongs(playlistId);
            console.log("Enriched Songs from Main:", songs);

            const rawThumb = playlistThumbPath || (songs[0]?.thumb || songs[0]?.Thumb || '');

            let playlistThumb = 'default-cover.jpg';
            if(rawThumb) {
                playlistThumb = rawThumb.startsWith('data:') 
                    ? rawThumb 
                    : `local-file://${rawThumb.replace(/\\/g, '/')}`;
            }
            const formatTime = (seconds: number) => {
                if (!seconds) return "0:00";
                const mins = Math.floor(seconds/60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2,'0')}`;
            };
            console.log("Go returned this data:", songs);
            (window as any).currentPlaylist = songs.map((song: any) => (song.filename || song.Filename || '').replace(/\\/g, '/'));
            (window as any).currentIndex = -1;

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
                        } else if (songThumb) {
                            imgSrc = `local-file://${songThumb}`;
                        } else {
                            imgSrc = 'default-cover.jpg'
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

            document.getElementById('btn-back')?.addEventListener('click', () => {
                refreshLibrary(); 
            });

        } catch (err) {
            console.error(err);
            libraryGrid.innerHTML = "<p>Error loading songs.</p>";
        }
    }

    async function refreshLibrary() {
        if (!libraryGrid) return;
        libraryGrid.style.display = "grid";
        libraryGrid.innerHTML = "<p>Loading Library...</p>";
        try {
            const libraryData = await window.electronAPI.getLibrary();
            renderLibrary(libraryData.audio || []);
        }catch (err) {
            libraryGrid.innerHTML = "<p>Error loading library.</p>";
        }
    }

    function renderVideoLibrary(playlists: any[]) {
        if (!libraryGridVidoe) return;
        
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

            const menuBtn = card.querySelector('.playlist-dropdown-btn');
            menuBtn?.addEventListener('click', (e) => {
                togglePlaylistMenu(e as MouseEvent, playlist.id);
            });

            const deleteItem = card.querySelector('.menu-item.btn-delete-action');
            deleteItem?.addEventListener('click', (e) => {
                deletePlaylist(e as MouseEvent, playlist.id);
            });

            const renameItem = card.querySelector('.menu-item.btn-rename-action');
            renameItem?.addEventListener('click', (e) => {
                renamePlaylist(e as MouseEvent, playlist.id);
            });

            card.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target.closest('.playlist-dropdown-btn') || target.closest('.playlist-dropdown')) {
                    return; 
                }
                openVideoPlaylist(playlist.id, playlist.name, playlist.thumb);
            });
            
            libraryGridVidoe.appendChild(card);
        });
    }

    async function openVideoPlaylist(playlistId: string, playlistName: string, playlistThumbPath?: string) {
        if (!libraryGridVidoe) return;
        libraryGridVidoe.style.display = "block";
        libraryGridVidoe.innerHTML = "<p>Loading videos...</p>";

        try {
            const videos = await window.electronAPI.getSongs(playlistId);
            
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
                                
                                <button class="play-btn" onclick="playVideo('${vidPath.replace(/\\/g, '/')}')">▶</button>
                            </div>
                        `;
                    }).join('')}
                </div> 
            `;

            document.getElementById('btn-video-back')?.addEventListener('click', async () => {
                if (libraryGridVidoe) libraryGridVidoe.style.display = "grid";
                const libraryData = await window.electronAPI.getLibrary();
                renderVideoLibrary(libraryData.video || []);
            });

        } catch (err) {
            console.error(err);
            libraryGridVidoe.innerHTML = "<p>Error loading videos.</p>";
        }
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

            const menuBtn = card.querySelector('.playlist-dropdown-btn');
            menuBtn?.addEventListener('click', (e) => {
                togglePlaylistMenu(e as MouseEvent, playlist.id);
            });

            const deleteItem = card.querySelector('.menu-item.btn-delete-action');
            deleteItem?.addEventListener('click', (e) => {
                deletePlaylist(e as MouseEvent, playlist.id);
            });

            const renameItem = card.querySelector('.menu-item.btn-rename-action');
            renameItem?.addEventListener('click', (e) => {
                renamePlaylist(e as MouseEvent, playlist.id);
            });

            card.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target.closest('.playlist-dropdown-btn') || target.closest('.playlist-dropdown')) {
                    return; 
                }
                openPlaylist(playlist.id, playlist.name, playlist.thumb);
            });

            libraryGrid.appendChild(card);
        });
    }

    async function deletePlaylist(event: MouseEvent, id: string) {
        event.stopPropagation();
        if(confirm("Are you sure you want to delete this playlist?")) {
            console.log("Deleting playlist: ", id);
            try {
                await window.electronAPI.deletePlaylist(id); 
                await refreshLibrary();
                console.log("Playlist deleted successfully.");
            } catch (err) {
                console.error("Error deleting playlist:", err);
                alert("Failed to delete playlist. Please try again.");
            }
        }
    }

    async function renamePlaylist(event: MouseEvent, id: string) {
        event.stopPropagation();
        
        document.querySelectorAll('.playlist-dropdown').forEach((menu: any) => {
            menu.style.display = 'none';
        });

        
        const currentCard = (event.target as HTMLElement).closest('.playlist-card');
        const oldName = currentCard?.querySelector('h3')?.innerText || "";

        
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

        
        const input = modal.querySelector('#modal-rename-input') as HTMLInputElement;
        input.focus();
        input.select();

        
        modal.querySelector('#modal-cancel-btn')?.addEventListener('click', () => {
            modal.remove();
        });

        
        modal.querySelector('#modal-save-btn')?.addEventListener('click', async () => {
            const newName = input.value.trim();
            if (newName && newName !== oldName) {
                try {
                    modal.remove();
                    await window.electronAPI.renamePlaylist(id, newName);
                    await refreshLibrary();
                    console.log("Playlist renamed successfully.");
                } catch (err) {
                    console.error("Error renaming playlist:", err);
                    alert("Failed to rename playlist. Please try again.");
                }
            } else {
                modal.remove();
            }
        });
    }
    (window as any).renamePlaylist = renamePlaylist;
    (window as any).deletePlaylist = deletePlaylist;
});

interface QueueItem {
    id: string;
    title: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed';
}

let downloadQueue: QueueItem[] = [];

window.electronAPI.onDownloadStatusStream((update: QueueItem) => {
    const existingIndex = downloadQueue.findIndex(item => item.id === update.id);

    if (existingIndex > -1) {
        downloadQueue[existingIndex].status = update.status;
    } else {
        downloadQueue.push(update);
    }

    renderQueue();
});

function renderQueue() {
    const container = document.getElementById('queue-container');
    if (!container) return;

    container.innerHTML = downloadQueue.map(item => {
        let statusBadge = '';
        if (item.status === 'pending') statusBadge = '<span class="badge pending">Waiting</span>';
        if (item.status === 'downloading') statusBadge = '<span class="badge downloading">Downloading</span>';
        if (item.status === 'completed') statusBadge = '<span class="badge completed">Done</span>';
        
        return `
            <div class="queue-row ${item.status}">
                <span class="song-title">${item.title}</span>
                ${statusBadge}
            </div>
        `;
    }).join('');
}

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

(window as any).playVideo = (filename: string) => {
    const videoModal = document.getElementById('video-modal') as HTMLDivElement;
    const videoPlayer = document.getElementById('global-video-player') as HTMLVideoElement;
    const audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
    const masterPlayBtn = document.getElementById('master-play-btn');

    if (!videoModal || !videoPlayer) {
        console.error("Critical Error: Video player elements not found in DOM.");
        return;
    }

    if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
        if (masterPlayBtn) {
            masterPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    let cleanRelPath = filename.replace(/\\/g, '/');
    if (!cleanRelPath.startsWith('MyVideos/') && !cleanRelPath.startsWith('MyVideo/')) {
        cleanRelPath = `MyVideos/${cleanRelPath}`;
    }
    
    const cleanPath = `local-file://${cleanRelPath}`;
    console.log("Binding source link to media core engine:", cleanPath);

    videoPlayer.src = cleanPath;
    videoPlayer.load(); 

    videoModal.style.display = 'flex';

    videoPlayer.play().catch((err: any) => {
        console.error("Chromium core video execution engine failed to play track:", err);
    });

    const closeBtn = document.getElementById('close-video-btn');
    const closeHandler = () => {
        videoPlayer.pause();
        videoPlayer.src = "";
        videoModal.style.display = 'none';
        closeBtn?.removeEventListener('click', closeHandler);
    };

    closeBtn?.addEventListener('click', closeHandler);
};

window.addEventListener('click', (event: any) => {
    if (!event.target.matches('.playlist-dropdown-btn')) {
        document.querySelectorAll('.playlist-dropdown').forEach((menu: any) => {
            menu.style.display = 'none';
        });
    }
});

declare global {
    interface Window {
        electronAPI: {
            startDownload: (url: string, format: string, quality: string) => void;
            getLibrary: () => Promise<any>;
            getSongs: (playlistID: string) => Promise<any[]>;
            onDownloadStatus: (callback: (s: string) => void) => void;
            deletePlaylist: (id: string) => Promise<boolean> | void;
            renamePlaylist: (id: string, newName: string) => Promise<boolean> | void;
            onDownloadStatusStream: (callback: (update: any) => void) => void;
        }
    }
}

(window as any).playSong = (filename: string) => {
    const player = document.getElementById('audio-player') as HTMLAudioElement;
    let cleanRel = filename.replace(/\\/g, '/');
    if (!cleanRel.startsWith('MyMusic/')) {
        cleanRel = `MyMusic/${cleanRel}`;
    }
    const cleanPath = `local-file://${cleanRel}`;
    const win = window as any;

    if (!win.currentPlaylist) win.currentPlaylist = [];

    let idx = win.currentPlaylist.findIndex((p: string) => p === cleanRel || p.endsWith(cleanRel) || p.includes(cleanRel));
    if (idx === -1) {
        const fname = cleanRel.split('/').pop();
        idx = win.currentPlaylist.findIndex((p: string) => (p && p.split('/').pop()) === fname);
    }
    win.currentIndex = idx;

    if (player) {
        if (player.src.includes(encodeURI(cleanRel)) && !player.paused) {
            player.pause();
        } else {
            player.src = cleanPath;
            player.play().catch((err: any) => console.error("Playback failed:", err));
        }
    }
};