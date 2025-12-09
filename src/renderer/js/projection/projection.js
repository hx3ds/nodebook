import { projectionEventHandlers as handlers } from './projectionEventHandlers.js';

export const projection = {
    element: null,
    
    // State
    playlist: [],
    currentIndex: -1, // -1 means stopped/void
    isPlaying: false,
    isMuted: false,
    volume: 1.0,
    loopMode: 'list', // 'single', 'list'
    
    // UI Logic is now in control
    // But we keep track of bg color for projection rendering
    bgColor: '#FFFDD0',
    scale: 1.0,
    panX: 0,
    panY: 0,

    // Interaction State
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    initialPan: { x: 0, y: 0 },
    holdTimeout: null,
    triggeringMovement: false,
    mouseDownEvent: null,
    
    videoElement: null,
    audioElement: null,
    projectionContent: null,

    init() {
        this.element = document.getElementById('projection-layer');
        this.renderProjection();
        this.setupEventListeners();
        this.restoreState();
        
        // Auto-save state every 5 seconds if playing
        setInterval(() => {
            if (this.isPlaying && (this.videoElement || this.audioElement)) {
                this.saveState();
            }
        }, 5000);
        
        // control is initialized by main.js
    },

    setupEventListeners() {
        // We attach mousedown to the specific element, but mousemove/up to window to handle dragging outside
        this.element.addEventListener('mousedown', handlers.handleMouseDown);
        window.addEventListener('mousemove', handlers.handleMouseMove);
        window.addEventListener('mouseup', handlers.handleMouseUp);
        this.element.addEventListener('contextmenu', handlers.handleContextMenu);
        
        // Touch events
        this.element.addEventListener('touchstart', handlers.handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handlers.handleTouchMove, { passive: false });
        window.addEventListener('touchend', handlers.handleTouchEnd);
    },
    
    // Helpers
    getCurrentMedia() {
        if (this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
            return this.playlist[this.currentIndex];
        }
        return null;
    },
    
    setScale(scale) {
        this.scale = scale;
        this.updateTransform();
    },

    setPan(x, y) {
        this.panX = x;
        this.panY = y;
        this.updateTransform();
    },

    setBackgroundColor(color) {
        this.bgColor = color;
        const container = this.element.querySelector('.projection-container');
        if (container) {
            container.style.backgroundColor = this.bgColor;
        }
    },

    resetPan() {
        this.setPan(0, 0);
    },

    updateTransform() {
        if (this.projectionContent) {
            this.projectionContent.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
        }
    },

    // Logic
    handleFiles(files) {
        const validFiles = Array.from(files).filter(file => {
            const type = file.type;
            const name = file.name.toLowerCase();
            return type.startsWith('video/') || 
                   type.startsWith('image/') || 
                   type.startsWith('audio/') ||
                   type === 'application/pdf' ||
                   type === 'text/html' ||
                   type === 'text/plain' ||
                   name.endsWith('.pdf') ||
                   name.endsWith('.html') ||
                   name.endsWith('.htm') ||
                   name.endsWith('.txt');
        });
        
        if (validFiles.length > 0) {
            // Revoke old
            this.playlist.forEach(item => URL.revokeObjectURL(item.url));
            
            this.playlist = validFiles.map(file => {
                let type = file.type;
                const name = file.name.toLowerCase();
                if (!type) {
                     if (name.endsWith('.pdf')) type = 'application/pdf';
                     else if (name.endsWith('.html') || name.endsWith('.htm')) type = 'text/html';
                     else if (name.endsWith('.txt')) type = 'text/plain';
                }
                return {
                    name: file.name,
                    type: type,
                    url: URL.createObjectURL(file),
                    path: file.path
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
            
            this.currentIndex = 0;
            this.isPlaying = true;
            this.updateProjection();
            this.saveState();
            
            if (window.control) window.control.update();
        }
    },

    saveState() {
        const state = {
            playlist: this.playlist.map(item => item.path).filter(p => p),
            currentIndex: this.currentIndex,
            currentTime: (this.videoElement && !this.videoElement.paused) ? this.videoElement.currentTime : 
                         (this.audioElement && !this.audioElement.paused) ? this.audioElement.currentTime :
                         (this.videoElement ? this.videoElement.currentTime : (this.audioElement ? this.audioElement.currentTime : 0)),
            loopMode: this.loopMode,
            volume: this.volume,
            isMuted: this.isMuted
        };
        localStorage.setItem('projectionState', JSON.stringify(state));
    },

    restoreState() {
        const saved = localStorage.getItem('projectionState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                
                if (state.playlist && Array.isArray(state.playlist)) {
                    this.playlist = state.playlist.map(path => {
                        const name = path.split(/[\\/]/).pop();
                        let type = 'application/octet-stream';
                        const ext = name.split('.').pop().toLowerCase();
                        
                        if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) type = 'video/' + (ext === 'mov' ? 'quicktime' : ext);
                        else if (['mp3', 'wav', 'ogg'].includes(ext)) type = 'audio/' + (ext === 'mp3' ? 'mpeg' : ext);
                        else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) type = 'image/' + (ext === 'svg' ? 'svg+xml' : ext);
                        else if (ext === 'pdf') type = 'application/pdf';
                        else if (ext === 'html' || ext === 'htm') type = 'text/html';
                        else if (ext === 'txt') type = 'text/plain';
                        
                        return {
                            name: name,
                            type: type,
                            url: 'file://' + path.replace(/\\/g, '/'), // Ensure forward slashes for URL
                            path: path
                        };
                    });
                }
                
                if (state.volume !== undefined) this.volume = state.volume;
                if (state.isMuted !== undefined) this.isMuted = state.isMuted;
                if (state.loopMode) this.loopMode = state.loopMode;
                
                if (this.playlist.length > 0 && state.currentIndex >= 0 && state.currentIndex < this.playlist.length) {
                    this.currentIndex = state.currentIndex;
                    this.isPlaying = false; // Start paused
                    this.updateProjection();
                    
                    const mediaEl = this.videoElement || this.audioElement;
                    if (mediaEl && state.currentTime) {
                        const restoreTime = () => {
                            mediaEl.currentTime = state.currentTime;
                        };
                        // Attempt to set immediately and on metadata
                        mediaEl.currentTime = state.currentTime;
                        mediaEl.addEventListener('loadedmetadata', restoreTime, { once: true });
                    }
                }
            } catch (e) {
                console.error('Failed to restore projection state:', e);
            }
        }
    },
    
    togglePlay() {
        const media = this.getCurrentMedia();
        if (media) {
            if (media.type.startsWith('video/') || media.type.startsWith('audio/')) {
                const el = this.videoElement || this.audioElement;
                if (el) {
                    if (el.paused) {
                        el.play();
                        this.isPlaying = true;
                    } else {
                        el.pause();
                        this.isPlaying = false;
                    }
                }
            } else {
                // Image or Document
                this.isPlaying = !this.isPlaying;
            }
        }
        this.saveState();
        if (window.control) window.control.update();
    },
    
    stopPlay() {
        this.isPlaying = false;
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.currentTime = 0;
        }
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.currentIndex = -1;
        this.updateProjection();
        this.saveState();
        if (window.control) window.control.update();
    },
    
    skip(seconds) {
        const el = this.videoElement || this.audioElement;
        if (el) {
            el.currentTime += seconds;
        }
    },
    
    nextMedia() {
        if (this.playlist.length === 0) return;
        let nextIndex = this.currentIndex + 1;
        
        if (this.currentIndex === -1) {
            nextIndex = 0;
        }
        
        if (nextIndex < this.playlist.length) {
            this.currentIndex = nextIndex;
        } else {
            this.currentIndex = 0; // Loop to start
        }
        this.isPlaying = true;
        this.updateProjection();
        this.saveState();
        if (window.control) window.control.update();
    },
    
    prevMedia() {
        if (this.playlist.length === 0) return;
        let prevIndex = this.currentIndex - 1;
        
        if (this.currentIndex === -1) {
            prevIndex = this.playlist.length - 1;
        }
        
        if (prevIndex >= 0) {
            this.currentIndex = prevIndex;
        } else {
            this.currentIndex = this.playlist.length - 1;
        }
        this.isPlaying = true;
        this.updateProjection();
        this.saveState();
        if (window.control) window.control.update();
    },
    
    handleEnded() {
        if (this.loopMode === 'single') {
            const media = this.getCurrentMedia();
            const el = this.videoElement || this.audioElement;
            if ((media.type.startsWith('video/') || media.type.startsWith('audio/')) && el) {
                el.play();
            }
        } else {
            this.nextMedia();
        }
    },
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.videoElement) this.videoElement.muted = this.isMuted;
        if (this.audioElement) this.audioElement.muted = this.isMuted;
        this.saveState();
        if (window.control) window.control.update();
    },
    
    toggleLoopMode() {
        this.loopMode = this.loopMode === 'single' ? 'list' : 'single';
        this.saveState();
        if (window.control) window.control.update();
    },
    
    setVolume(val) {
        this.volume = val;
        if (this.videoElement) this.videoElement.volume = this.volume;
        if (this.audioElement) this.audioElement.volume = this.volume;
        this.saveState();
        if (window.control) window.control.update();
    },
    
    // Rendering
    renderProjection() {
        this.element.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'projection-container';
        container.style.backgroundColor = this.bgColor;
        
        this.projectionContent = document.createElement('div');
        this.projectionContent.className = 'projection-content';
        
        container.appendChild(this.projectionContent);
        this.element.appendChild(container);
        this.updateProjection();
    },
    
    updateProjection() {
        // Clear content
        this.projectionContent.innerHTML = '';
        this.updateTransform();
        this.videoElement = null;
        this.audioElement = null;
        
        const media = this.getCurrentMedia();
        
        // Void Background
        if (!media || media.type.startsWith('audio/')) {
            if (this.bgColor === '#000000' || this.bgColor === '#1A1B1D') {
                const voidBg = document.createElement('div');
                voidBg.className = 'projection-void-bg';
                this.projectionContent.appendChild(voidBg);
            }
        }
        
        if (media) {
            if (media.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.className = 'projection-media';
                video.src = media.url;
                video.autoplay = this.isPlaying;
                video.playsInline = true;
                video.volume = this.volume;
                video.muted = this.isMuted;
                video.onended = () => this.handleEnded();
                video.ontimeupdate = () => {
                    if (window.control) window.control.updateSeek();
                };
                this.projectionContent.appendChild(video);
                this.videoElement = video;
            } else if (media.type.startsWith('audio/')) {
                const audio = document.createElement('audio');
                audio.src = media.url;
                audio.autoplay = this.isPlaying;
                audio.volume = this.volume;
                audio.muted = this.isMuted;
                audio.onended = () => this.handleEnded();
                audio.ontimeupdate = () => {
                    if (window.control) window.control.updateSeek();
                };
                this.projectionContent.appendChild(audio);
                this.audioElement = audio;
            } else if (media.type === 'application/pdf' || media.type === 'text/html' || media.type === 'text/plain') {
                const iframe = document.createElement('iframe');
                iframe.className = 'projection-media';
                iframe.src = media.url;
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.allow = "fullscreen";
                this.projectionContent.appendChild(iframe);
            } else {
                const img = document.createElement('img');
                img.className = 'projection-media';
                img.src = media.url;
                this.projectionContent.appendChild(img);
            }
        }
    }
};
