import { controlEventHandler as handlers } from './controlEventHandler.js';

export const control = {
    element: null,
    
    // UI State
    showPlaylist: false,
    showSeek: false,
    showVolume: false,
    showBg: false,
    showScale: false,
    showSearch: false,
    
    // Search State
    searchResults: [],
    currentResultIndex: -1,
    searchQuery: '',

    // Interaction State
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    initialPos: { x: 0, y: 0 },
    holdTimeout: null,
    triggeringMovement: false,
    mouseDownEvent: null,
    
    // Scroll State
    scrollTarget: null,
    initialScrollLeft: 0,
    dragStartX: 0,

    init() {
        this.element = document.getElementById('controls-layer');
        // Initialize position
        this.element.style.top = '6px';
        this.element.style.right = '6px';
        this.element.style.bottom = 'auto';
        this.element.style.left = 'auto';
        
        this.setupEvents();
        this.update();
    },
    
    // Helper
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },
    
    setupEvents() {
        document.getElementById('proj-file-input').addEventListener('change', handlers.handleFileChange);
        document.getElementById('proj-prev').addEventListener('click', handlers.handlePrev);
        document.getElementById('proj-back5').addEventListener('click', handlers.handleBack5);
        document.getElementById('proj-play').addEventListener('click', handlers.handlePlay);
        document.getElementById('proj-fwd5').addEventListener('click', handlers.handleFwd5);
        document.getElementById('proj-next').addEventListener('click', handlers.handleNext);
        document.getElementById('proj-stop').addEventListener('click', handlers.handleStop);
        
        document.getElementById('proj-seek-toggle').addEventListener('click', handlers.handleSeekToggle);
        document.getElementById('proj-loop').addEventListener('click', handlers.handleLoopToggle);
        document.getElementById('proj-playlist-toggle').addEventListener('click', handlers.handlePlaylistToggle);
        document.getElementById('proj-vol-toggle').addEventListener('click', handlers.handleVolumeToggle);
        document.getElementById('proj-bg-toggle').addEventListener('click', handlers.handleBgToggle);
        document.getElementById('proj-scale-toggle').addEventListener('click', handlers.handleScaleToggle);
        document.getElementById('proj-room-toggle').addEventListener('click', handlers.handleRoomToggle);
        document.getElementById('proj-panel-toggle').addEventListener('click', handlers.handlePanelToggle);
        document.getElementById('proj-search-toggle').addEventListener('click', handlers.handleSearchToggle);
        document.getElementById('proj-search-input').addEventListener('input', handlers.handleSearchInput);
        document.getElementById('proj-search-input').addEventListener('keydown', handlers.handleSearchKeyDown);
        
        // Seek Input
        document.getElementById('proj-seek-input').addEventListener('input', handlers.handleSeekInput);
        
        // Volume Input
        document.getElementById('proj-vol-input').addEventListener('input', handlers.handleVolumeInput);
        
        // Scale Input
        document.getElementById('proj-scale-input').addEventListener('input', handlers.handleScaleInput);
        
        // Mute Btn
        document.getElementById('proj-mute-btn').addEventListener('click', handlers.handleMute);

        // Color Pickers
        const colorBtns = document.querySelectorAll('.color-btn');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', handlers.handleColorSelect);
        });

        // Dragging Events for Controls Layer
        // We attach mousedown to the specific element, but mousemove/up to window to handle dragging outside
        // Note: controls-layer has pointer-events: none, but its children have pointer-events: auto.
        // We need to enable pointer-events on controls-layer for this to work, or attach to a handle.
        // The user wants to click and hold "controls overlay", implying the empty space or the container itself.
        // Currently css has #controls-layer { pointer-events: none; } and .controls-container { pointer-events: none; }
        // but children like buttons have auto.
        // To support dragging the whole container, we need to capture events on the container.
        // Let's make .controls-container interactive for dragging, but ensure buttons still work.
        
        const container = document.querySelector('.controls-container');
        if (container) {
            container.style.pointerEvents = 'auto'; // Enable events on the container for dragging
            container.addEventListener('mousedown', handlers.handleMouseDown);
            // Prevent default drag behavior to avoid issues
            container.addEventListener('dragstart', (e) => e.preventDefault());
        }

        window.addEventListener('mousemove', handlers.handleMouseMove);
        window.addEventListener('mouseup', handlers.handleMouseUp);
        window.addEventListener('keydown', handlers.handleGlobalKeyDown);
    },
    
    update() {
        const projection = window.projection;
        if (!projection) return;
        
        const playIcon = document.getElementById('proj-play-icon');
        if (playIcon) {
            if (projection.isPlaying) {
                playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />`; // Pause
            } else {
                playIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />`; // Play
            }
        }
        
        // Loop Badge
        const loopBadge = document.getElementById('proj-loop-badge');
        if (loopBadge) {
            if (projection.loopMode === 'all') {
                loopBadge.textContent = 'ALL';
                loopBadge.style.color = '#bc13fe';
                loopBadge.style.borderColor = 'rgba(188, 19, 254, 0.5)';
            } else {
                loopBadge.textContent = 'ONE';
                loopBadge.style.color = '#00f3ff';
                loopBadge.style.borderColor = 'rgba(0, 243, 255, 0.5)';
            }
        }
        
        // Volume Icon
        const volIcon = document.getElementById('proj-vol-icon');
        const muteIcon = document.getElementById('proj-mute-icon');
        let vIcon = '';
        if (projection.isMuted || projection.volume === 0) {
            vIcon = `<path stroke-linecap="round" stroke-linejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />`;
        } else {
            vIcon = `<path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />`;
        }
        if (volIcon) volIcon.innerHTML = vIcon;
        if (muteIcon) muteIcon.innerHTML = vIcon;
        
        const seekBar = document.getElementById('proj-seek-bar');
        const seekToggle = document.getElementById('proj-seek-toggle');
        if (seekBar) {
            if (this.showSeek) {
                seekBar.classList.remove('hidden');
                if (seekToggle) seekToggle.classList.add('active');
            } else {
                seekBar.classList.add('hidden');
                if (seekToggle) seekToggle.classList.remove('active');
            }
        }
        
        const volBar = document.getElementById('proj-vol-bar');
        const volToggle = document.getElementById('proj-vol-toggle');
        if (volBar) {
            if (this.showVolume) {
                volBar.classList.remove('hidden');
                if (volToggle) volToggle.classList.add('active');
            } else {
                volBar.classList.add('hidden');
                if (volToggle) volToggle.classList.remove('active');
            }
        }
        
        const volInput = document.getElementById('proj-vol-input');
        if (volInput) {
            volInput.value = projection.volume;
        }

        const bgBar = document.getElementById('proj-bg-bar');
        const bgToggle = document.getElementById('proj-bg-toggle');
        if (bgBar) {
            if (this.showBg) {
                bgBar.classList.remove('hidden');
                if (bgToggle) bgToggle.classList.add('active');
            } else {
                bgBar.classList.add('hidden');
                if (bgToggle) bgToggle.classList.remove('active');
            }
        }

        const scaleBar = document.getElementById('proj-scale-bar');
        const scaleToggle = document.getElementById('proj-scale-toggle');
        if (scaleBar) {
            if (this.showScale) {
                scaleBar.classList.remove('hidden');
                if (scaleToggle) scaleToggle.classList.add('active');
            } else {
                scaleBar.classList.add('hidden');
                if (scaleToggle) scaleToggle.classList.remove('active');
            }
        }
        
        const scaleInput = document.getElementById('proj-scale-input');
        const scaleValue = document.getElementById('proj-scale-value');
        if (scaleInput && projection.scale !== undefined) {
            // Only update input value if user is not dragging it? 
            // For now, simple update is fine as long as we don't have external scale changes often
            // scaleInput.value = projection.scale; 
            // Actually, we shouldn't overwrite if user is dragging, but here update() is called on init or state change.
            // Let's rely on event handler to update UI value during drag.
        }

        const searchBar = document.getElementById('proj-search-bar');
        const searchToggle = document.getElementById('proj-search-toggle');
        if (searchBar) {
            if (this.showSearch) {
                searchBar.classList.remove('hidden');
                if (searchToggle) searchToggle.classList.add('active');
                // Focus input when shown
                const input = document.getElementById('proj-search-input');
                if (input && document.activeElement !== input) {
                    setTimeout(() => input.focus(), 50);
                }
            } else {
                searchBar.classList.add('hidden');
                if (searchToggle) searchToggle.classList.remove('active');
            }
        }
        if (scaleValue && projection.scale !== undefined) {
            scaleValue.textContent = Math.round(projection.scale * 100) + '%';
        }

        // Update Playlist Toggle State
        const playlistToggle = document.getElementById('proj-playlist-toggle');
        if (playlistToggle) {
            if (this.showPlaylist) {
                playlistToggle.classList.add('active');
            } else {
                playlistToggle.classList.remove('active');
            }
        }
        
        // Update Panel Toggle State
        const panelToggle = document.getElementById('proj-panel-toggle');
        if (panelToggle && window.panel) {
            if (window.panel.uiVisible) panelToggle.classList.add('active');
            else panelToggle.classList.remove('active');
        }

        // Update Room Toggle State
        const roomToggle = document.getElementById('proj-room-toggle');
        if (roomToggle && window.room) {
            if (window.room.visible) roomToggle.classList.add('active');
            else roomToggle.classList.remove('active');
        }
        
        this.renderPlaylist();
    },
    
    resetPosition() {
        if (this.element) {
            this.element.style.top = '6px';
            this.element.style.right = '6px';
            this.element.style.bottom = 'auto';
            this.element.style.left = 'auto';
            this.element.style.transform = 'none';
        }
    },
    
    updateSeek() {
        const projection = window.projection;
        if (!projection) return;
        
        const el = projection.videoElement || projection.audioElement;
        const seekInput = document.getElementById('proj-seek-input');
        const timeCurr = document.getElementById('proj-time-current');
        const timeTotal = document.getElementById('proj-time-total');
        
        if (el && !isNaN(el.duration)) {
            const percent = (el.currentTime / el.duration) * 100;
            if (seekInput) seekInput.value = percent;
            if (timeCurr) timeCurr.textContent = this.formatTime(el.currentTime);
            if (timeTotal) timeTotal.textContent = this.formatTime(el.duration);
        } else {
            if (seekInput) seekInput.value = 0;
            if (timeCurr) timeCurr.textContent = '0:00';
            if (timeTotal) timeTotal.textContent = '0:00';
        }
    },
    
    renderPlaylist() {
        // Find existing or create
        let playlistEl = document.getElementById('proj-playlist-overlay');
        const projection = window.projection;
        
        // Ensure toggle button state is updated
        const playlistToggle = document.getElementById('proj-playlist-toggle');
        if (playlistToggle) {
            if (this.showPlaylist) {
                playlistToggle.classList.add('active');
            } else {
                playlistToggle.classList.remove('active');
            }
        }
        
        if (!this.showPlaylist) {
            if (playlistEl) playlistEl.style.display = 'none';
            return;
        }
        
        if (playlistEl) playlistEl.style.display = 'flex';
        
        if (!projection) return;
        
        if (projection.playlist.length === 0) {
            playlistEl.innerHTML = `
                <div class="playlist-header">
                    <div class="playlist-title">PLAYLIST <span class="playlist-count">(0)</span></div>
                    <button class="control-btn" id="proj-pl-close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="playlist-empty">NO MEDIA LOADED</div>
            `;
        } else {
            playlistEl.innerHTML = `
                <div class="playlist-header">
                    <div class="playlist-title">PLAYLIST <span class="playlist-count">(${projection.playlist.length})</span></div>
                    <button class="control-btn" id="proj-pl-close">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="16" height="16">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="playlist-items">
                    ${projection.playlist.map((item, idx) => {
                        const type = (item.type || 'unknown').split('/')[0];
                        let icon = '';
                        if (type === 'image') {
                            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="playlist-item-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>`;
                        } else if (type === 'video') {
                            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="playlist-item-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>`;
                        } else if (type === 'audio') {
                            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="playlist-item-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>`;
                        } else {
                            icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="playlist-item-icon"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;
                        }

                        return `
                        <div class="playlist-item ${idx === projection.currentIndex ? 'active' : ''}" data-idx="${idx}">
                            ${icon}
                            <div class="playlist-item-info">
                                <div class="playlist-item-name" title="${item.name}">${item.name}</div>
                                <div class="playlist-item-type">${type}</div>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
        }
        
        // Events
        playlistEl.querySelector('#proj-pl-close').addEventListener('click', handlers.handlePlaylistClose);
        
        playlistEl.querySelectorAll('.playlist-item').forEach(el => {
            el.addEventListener('click', handlers.handlePlaylistItemClick);
        });
    }
};
