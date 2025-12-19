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
            mgr.setBackgroundColor(color);
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

    // Search Handlers
    handleSearchToggle() {
        control.showSearch = !control.showSearch;
        control.update();
        if (!control.showSearch) {
            controlEventHandler.clearSearchHighlight();
        }
    },

    clearSearchHighlight() {
        if (window.CSS && CSS.highlights) {
            CSS.highlights.clear();
        }
    },

    handleSearchInput(e) {
        const query = e.target.value.toLowerCase();
        control.searchQuery = query;
        
        if (!query) {
            control.searchResults = [];
            control.currentResultIndex = -1;
            const countEl = document.getElementById('proj-search-results-count');
            if(countEl) countEl.textContent = '';
            controlEventHandler.clearSearchHighlight();
            return;
        }

        const room = window.room;
        if (!room || !room.boxes) return;

        // Filter boxes with text content matching query
        control.searchResults = room.boxes.filter(box => {
            // If box has an element and rendered text content, use that
            if (box.element) {
                const textDiv = box.element.querySelector('.box-text');
                if (textDiv) {
                    return textDiv.textContent.toLowerCase().includes(query);
                }
            }
            // Fallback to raw text if element not rendered yet
            return box.text && box.text.toLowerCase().includes(query);
        });
        
        control.currentResultIndex = control.searchResults.length > 0 ? 0 : -1;
        
        // Update count
        controlEventHandler.updateSearchResultSelection();
    },

    handleSearchKeyDown(e) {
        if (control.searchResults.length === 0) return;

        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            control.currentResultIndex = (control.currentResultIndex + 1) % control.searchResults.length;
            controlEventHandler.updateSearchResultSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            control.currentResultIndex = (control.currentResultIndex - 1 + control.searchResults.length) % control.searchResults.length;
            controlEventHandler.updateSearchResultSelection();
        }
    },

    updateSearchResultSelection() {
        const count = control.searchResults.length;
        const countEl = document.getElementById('proj-search-results-count');
        if (!countEl) return;
        
        if (count === 0) {
            countEl.textContent = '0 results';
            return;
        }
        
        countEl.textContent = `${control.currentResultIndex + 1}/${count}`;
            
        const box = control.searchResults[control.currentResultIndex];
        if (box) controlEventHandler.centerAndSelectBox(box);
    },

    centerAndSelectBox(box) {
        const room = window.room;
        if (!room) return;

        // Exit edit mode if active
        if (room.editingBox) {
            room.finishEditing();
        }

        // Center box
        const boxCenterX = box.x + box.width / 2;
        const boxCenterY = box.y + box.height / 2;
        
        room.offset.x = (window.innerWidth / 2) - boxCenterX;
        room.offset.y = (window.innerHeight / 2) - boxCenterY;
        
        // Select box
        room.selectBox(box, false); // false = clear other selections
        
        // Redraw
        room.drawAll(false, false);

        // Highlight searched text
        if (control.searchQuery && box.element) {
            const textDiv = box.element.querySelector('.box-text');
            if (textDiv) {
                const query = control.searchQuery.toLowerCase();
                
                // Helper to find text node
                const findTextNode = (node) => {
                    if (node.nodeType === 3) {
                        const text = node.textContent.toLowerCase();
                        const idx = text.indexOf(query);
                        if (idx !== -1) return { node, idx };
                    } else if (node.nodeType === 1) {
                        for (let child of node.childNodes) {
                            const found = findTextNode(child);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const found = findTextNode(textDiv);
                if (found && window.CSS && CSS.highlights && window.Highlight) {
                    try {
                        const range = document.createRange();
                        range.setStart(found.node, found.idx);
                        range.setEnd(found.node, found.idx + control.searchQuery.length);
                        
                        const highlight = new Highlight(range);
                        CSS.highlights.set('search-result', highlight);
                    } catch (e) {
                        console.warn('Highlight failed:', e);
                    }
                } else if (!found) {
                     controlEventHandler.clearSearchHighlight();
                }
            }
        } else {
             controlEventHandler.clearSearchHighlight();
        }
    },

    handleGlobalKeyDown(e) {
        // Ctrl+F or Cmd+F
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            controlEventHandler.handleSearchToggle();
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
        
        // Check for scrollable target
        const scrollable = e.target.closest('.controls-bar');
        if (scrollable) {
            control.scrollTarget = scrollable;
            control.initialScrollLeft = scrollable.scrollLeft;
            control.dragStartX = e.clientX;
        } else {
            control.scrollTarget = null;
        }
        
        // Clear any existing timeout
        if (control.holdTimeout) clearTimeout(control.holdTimeout);

        control.holdTimeout = setTimeout(() => {
            if (control.triggeringMovement) {
                control.isDragging = true;
                control.scrollTarget = null; // Disable scrolling if we start dragging container
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
        } else if (control.scrollTarget) {
            const dx = e.clientX - control.dragStartX;
            control.scrollTarget.scrollLeft = control.initialScrollLeft - dx;
        }
    },

    handleMouseUp(e) {
        control.triggeringMovement = false;
        control.scrollTarget = null;
        if (control.holdTimeout) clearTimeout(control.holdTimeout);
        
        if (control.isDragging) {
            control.isDragging = false;
            document.body.style.cursor = '';
        }
    }
};
