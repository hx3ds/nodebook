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
                    url: URL.createObjectURL(file)
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
            
            this.currentIndex = 0;
            this.isPlaying = true;
            this.updateProjection();
            
            if (window.control) window.control.update();
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
        if (window.control) window.control.update();
    },
    
    toggleLoopMode() {
        this.loopMode = this.loopMode === 'single' ? 'list' : 'single';
        if (window.control) window.control.update();
    },
    
    setVolume(val) {
        this.volume = val;
        if (this.videoElement) this.videoElement.volume = this.volume;
        if (this.audioElement) this.audioElement.volume = this.volume;
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
