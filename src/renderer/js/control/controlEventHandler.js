import { control } from './control.js';

export const controlEventHandler = {
    handleFileChange(e) {
        if (window.projection) {
            window.projection.handleFiles(e.target.files);
        }
    },
    
    handlePrev() {
        if (window.projection) {
            window.projection.prevMedia();
        }
    },
    
    handleBack5() {
        if (window.projection) {
            window.projection.skip(-5);
        }
    },
    
    handlePlay() {
        if (window.projection) {
            window.projection.togglePlay();
        }
    },
    
    handleFwd5() {
        if (window.projection) {
            window.projection.skip(5);
        }
    },
    
    handleNext() {
        if (window.projection) {
            window.projection.nextMedia();
        }
    },
    
    handleStop() {
        if (window.projection) {
            window.projection.stopPlay();
        }
    },
    
    handleSeekToggle() {
        control.showSeek = !control.showSeek;
        control.update();
    },
    
    handleLoopToggle() {
        if (window.projection) {
            window.projection.toggleLoopMode();
        }
    },
    
    handlePlaylistToggle() {
        control.showPlaylist = !control.showPlaylist;
        control.renderPlaylist();
    },
    
    handleVolumeToggle() {
        control.showVolume = !control.showVolume;
        control.update();
    },
    
    handleBgToggle() {
        control.showBg = !control.showBg;
        control.update();
    },
    
    handleScaleToggle() {
        control.showScale = !control.showScale;
        control.update();
    },

    handleColorSelect(e) {
        const color = e.currentTarget.dataset.color;
        const mgr = window.projection;
        if (mgr && color) {
            mgr.bgColor = color;
            mgr.renderProjection();
        }
    },
    
    handlePanelToggle() {
        const panel = window.panel;
        if (!panel) return;
        
        panel.uiVisible = !panel.uiVisible;
        if (panel.element) {
            panel.element.style.display = panel.uiVisible ? 'flex' : 'none';
        }
        control.update();
    },
    
    handleRoomToggle() {
        const room = window.room;
        if (!room) return;
        
        room.visible = !room.visible;
        if (room.element) {
            room.element.style.display = room.visible ? 'block' : 'none';
        }
        control.update();
    },
    
    handleSeekInput(e) {
        const mgr = window.projection;
        if (!mgr) return;
        
        const el = mgr.videoElement || mgr.audioElement;
        if (el) {
            const time = (parseFloat(e.target.value) / 100) * el.duration;
            el.currentTime = time;
        }
    },
    
    handleVolumeInput(e) {
        const mgr = window.projection;
        if (mgr) {
            mgr.setVolume(parseFloat(e.target.value));
        }
    },
    
    handleScaleInput(e) {
        const mgr = window.projection;
        if (mgr) {
            const val = parseFloat(e.target.value);
            mgr.setScale(val);
            control.update();
        }
    },
    
    handleMute() {
        if (window.projection) {
            window.projection.toggleMute();
        }
    },
    
    // Playlist specific
    handlePlaylistClose() {
        control.showPlaylist = false;
        control.renderPlaylist();
    },
    
    handlePlaylistItemClick(e) {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const mgr = window.projection;
        if (mgr) {
            mgr.currentIndex = idx;
            mgr.isPlaying = true;
            mgr.updateProjection();
            control.update();
        }
    },

    // Dragging Logic
    handleMouseDown(e) {
        // Only allow left click
        if (e.button !== 0) return;
        
        // Don't trigger if clicking on a button or input (unless it's the container background)
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.playlist-container')) {
             return;
        }

        control.triggeringMovement = true;
        control.mouseDownEvent = e;
        
        // Clear any existing timeout
        if (control.holdTimeout) clearTimeout(control.holdTimeout);

        control.holdTimeout = setTimeout(() => {
            if (control.triggeringMovement) {
                control.isDragging = true;
                control.dragStart.x = control.mouseDownEvent.clientX;
                control.dragStart.y = control.mouseDownEvent.clientY;
                
                // Get current position (computed or inline)
                const rect = control.element.getBoundingClientRect();
                control.initialPos.x = rect.left;
                control.initialPos.y = rect.top;
                
                // Switch to fixed positioning based on top/left to make movement easier
                control.element.style.right = 'auto';
                control.element.style.bottom = 'auto';
                control.element.style.left = rect.left + 'px';
                control.element.style.top = rect.top + 'px';
                
                document.body.style.cursor = 'grabbing';
            }
        }, 200); // 200ms hold
    },

    handleMouseMove(e) {
        control.triggeringMovement = false;
        if (control.isDragging) {
            const dx = e.clientX - control.dragStart.x;
            const dy = e.clientY - control.dragStart.y;
            
            control.element.style.left = (control.initialPos.x + dx) + 'px';
            control.element.style.top = (control.initialPos.y + dy) + 'px';
        }
    },

    handleMouseUp(e) {
        control.triggeringMovement = false;
        if (control.holdTimeout) clearTimeout(control.holdTimeout);
        
        if (control.isDragging) {
            control.isDragging = false;
            document.body.style.cursor = '';
        }
    }
};
