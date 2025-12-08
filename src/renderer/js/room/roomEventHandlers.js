import { room } from './room.js';
import { explorer } from '../explorer/explorer.js';
import { panel } from '../panel/panel.js';

export const roomEventHandlers = {
    // Main event handlers
    handleDblClick(e) {
        const pos = room.getMousePos(e);
        const { owner, elementType } = room.getElementOwner(e.target, pos);
        switch (elementType) {
            case 'box-text-container':
            case 'box-arrow-container':
                registerEvent('editingBox')
                room.selectBox(owner, false);
                // Check if it's a book type box and open the link instead of editing
                if (owner.type === 'book' && owner.linkedNotePath) {
                    room.openBookLink(owner, explorer);
                } else {
                    room.startEditing(owner);
                }
                break;
            case 'box':
                registerEvent('expandingBox')
                e.stopPropagation();
                room.selectBox(owner, false);
                room.expandBox(owner);
                break;
            case 'arrow':
                // Double-clicking arrow does nothing currently
                break;
            case 'room':
                registerEvent('creatingBox')
                room.createBox(pos.x, pos.y);
                break;
        }
        room.inEvent = false;
    },

    handleMouseDown(e) {
        const pos = room.getMousePos(e);
        const { owner, elementType } = room.getElementOwner(e.target, pos);

        // Custom Double Click Detection
        const now = Date.now();
        if (e.button === 0 && (now - room.lastClickTime < 300) && room.lastClickOwner === owner) {
            room.lastClickTime = 0;
            room.lastClickOwner = null;
            roomEventHandlers.handleDblClick(e);
            return;
        }

        if (e.button === 0) {
            room.lastClickTime = now;
            room.lastClickOwner = owner;

            // Trigger movement/panning on hold
            room.triggeringMovement = true;
            room.holdTimeout = setTimeout(() => {
                if (room.triggeringMovement) {
                    if (['box', 'box-text-container', 'box-arrow-container'].includes(elementType)) {
                        registerEvent('movingBox');
                        room.dragOffset = {
                            x: pos.x - owner.x,
                            y: pos.y - owner.y
                        };
                    } else if (elementType === 'room') {
                        registerEvent('panning');
                        room.lastPanPos = { x: e.clientX, y: e.clientY };
                        room.element.style.cursor = 'grabbing';
                    }
                }
            }, 200);
        }

        // Always finish editing and hide context menu when starting a new interaction
        if (room.editingBox) {
            room.finishEditing();
        }
        room.hideContextMenu();

        const ctrlOrCmd = e.ctrlKey || e.metaKey;
        const ifAppend = !!(ctrlOrCmd);

        switch (e.button) {
            case 0: // Left click
                switch (elementType) {
                    case 'box-text-container':
                        registerEvent('selectingBox')
                        room.selectBox(owner, ifAppend);
                        break;
                    case 'box-arrow-container':
                        registerEvent('creatingArrow')
                        room.selectBox(owner, ifAppend);
                        room.connectingFrom = owner;
                        room.connectingTo = null;
                        break;
                    case 'box':
                        registerEvent('resizingBox')
                        room.selectBox(owner, ifAppend);
                        room.lastMousePos = pos;
                        room.resizingBox = owner;
                        break;
                    case 'arrow':
                        registerEvent('selectingArrow')
                        const arrow = room.findArrowAt(pos);
                        room.selectedArrow = arrow;
                        room.highlightArrow(arrow, true);
                        break;
                    case 'room':
                        registerEvent('selectingRoom');
                        if (!e.ctrlKey && !e.metaKey) room.resetSelection();
                        room.selectionStart = { x: pos.x, y: pos.y };
                        room.selectionRect = null;
                        break;
                }
                break;
            case 1: // Middle click
                switch (elementType) {
                    case 'box-text-container':
                    case 'box-arrow-container':
                    case 'box':
                        registerEvent('movingBox')
                        e.preventDefault();
                        e.stopPropagation();
                        room.selectBox(owner, ifAppend);
                        room.dragOffset = {
                            x: pos.x - owner.x,
                            y: pos.y - owner.y
                        };
                        break;
                    case 'room':
                        registerEvent('panning')
                        room.lastPanPos = { x: e.clientX, y: e.clientY };
                        room.element.style.cursor = 'grab';
                        break;
                }
                break;
            case 2: // Right click
                e.preventDefault();
                const menuPos = { x: e.clientX, y: e.clientY };
                switch (elementType) {
                    case 'box-text-container':
                    case 'box-arrow-container':
                    case 'box':
                        registerEvent('showingBoxContextMenu')
                        room.selectBox(owner, ifAppend);
                        room.showBoxContextMenu(menuPos.x, menuPos.y);
                        break;
                    case 'arrow':
                        registerEvent('showingArrowContextMenu')
                        const arrow = room.findArrowAt(pos);
                        room.selectedArrow = arrow;
                        room.highlightArrow(arrow, true);
                        room.showArrowContextMenu(menuPos.x, menuPos.y);
                        break;
                    case 'room':
                        registerEvent('showingRoomContextMenu')
                        room.showRoomContextMenu(menuPos.x, menuPos.y);
                        break;
                }
                break;
        }
    },

    handleMouseMove(e) {
        room.triggeringMovement = false;
        const pos = room.getMousePos(e);
        const { owner, elementType } = room.getElementOwner(e.target, pos);

        if (!room.inEvent) {
            room.updateCursorStyle(e.target);
            return;
        }

        switch (room.event) {
            case 'selectingBox':
                break;
            case 'creatingArrow':
                e.preventDefault();
                if (elementType === 'box' || elementType === 'box-text-container' || elementType === 'box-arrow-container') {
                    if (owner !== room.connectingFrom) {
                        room.connectingTo = owner;
                    }
                } else {
                    room.connectingTo = null;
                }
                room.updateConnectionPreview(pos);
                break;
            case 'resizingBox':
                const dw = pos.x - room.lastMousePos.x;
                const dh = pos.y - room.lastMousePos.y;
                const newWidth = Math.max(room.minBoxWidth, room.resizingBox.width + dw);
                const newHeight = Math.max(room.minBoxHeight, room.resizingBox.height + dh);
                room.resizingBox.width = newWidth;
                room.resizingBox.height = newHeight;
                room.drawBox(room.resizingBox, false);
                room.lastMousePos = pos;
                break;
            case 'selectingArrow':
                // Arrow selection movement not needed
                break;
            case 'selectingRoom':
                if (room.selectionStart) {
                    room.selectionRect = {
                        x: Math.min(room.selectionStart.x, pos.x),
                        y: Math.min(room.selectionStart.y, pos.y),
                        width: Math.abs(pos.x - room.selectionStart.x),
                        height: Math.abs(pos.y - room.selectionStart.y)
                    };
                    room.updateSelectionPreview();
                }
                break;
            case 'movingBox':
                e.preventDefault();
                e.stopPropagation();
                const boxesToMove = room.selectedBoxes.length > 0 ? room.selectedBoxes :
                    (room.selectedBox ? [room.selectedBox] : []);
                boxesToMove.forEach(box => {
                    box.x = pos.x - room.dragOffset.x;
                    box.y = pos.y - room.dragOffset.y;
                    room.drawBox(box, false);
                });
                // Update arrows connected to moving boxes in real-time
                room.drawArrows();
                break;
            case 'panning':
                const dx = e.clientX - room.lastPanPos.x;
                const dy = e.clientY - room.lastPanPos.y;
                room.offset.x += dx;
                room.offset.y += dy;
                room.lastPanPos = { x: e.clientX, y: e.clientY };
                room.element.style.cursor = 'grabbing';

                room.drawAll();
                room.updateSelectionPreview();
                break;
        }
    },

    handleMouseUp(e) {
        room.triggeringMovement = false;
        clearTimeout(room.holdTimeout);

        if (!room.inEvent) return;

        const { owner, elementType } = room.getElementOwner(e.target, room.getMousePos(e));

        switch (room.event) {
            case 'selectingBox':
                // Box selection is complete
                break;
            case 'creatingArrow':
                if (elementType === 'box' || elementType === 'box-text-container' || elementType === 'box-arrow-container') {
                    room.connectingTo = owner;
                }
                if (room.connectingFrom && room.connectingTo && room.connectingFrom !== room.connectingTo) {
                    room.createArrow(room.connectingFrom, room.connectingTo);
                }
                room.connectingFrom = null;
                room.connectingTo = null;
                if (room.previewConnection && room.previewConnection.parentElement) {
                    room.previewConnection.remove();
                    room.previewConnection = null;
                }
                room.updateConnectionPreview();
                break;
            case 'resizingBox':
                // Resizing is complete, save state
                if (room.resizingBox) {
                    room.pushHistory();
                    room.saveState();
                    room.resizingBox = null;
                }
                room.lastMousePos = null;
                break;
            case 'selectingArrow':
                // Arrow selection is complete
                break;
            case 'selectingRoom':
                if (room.selectionRect) {
                    const newlySelected = room.boxes.filter(box => {
                        return box.x < room.selectionRect.x + room.selectionRect.width &&
                            box.x + box.width > room.selectionRect.x &&
                            box.y < room.selectionRect.y + room.selectionRect.height &&
                            box.y + box.height > room.selectionRect.y;
                    });

                    // Add newly selected boxes that aren't already selected
                    newlySelected.forEach(box => {
                        if (!room.selectedBoxes.includes(box)) {
                            room.selectBox(box, true);
                        }
                    });

                    room.selectedBox = room.selectedBoxes.length > 0 ? room.selectedBoxes[room.selectedBoxes.length - 1] : null;
                }
                room.selectionStart = null;
                room.selectionRect = null;
                room.updateSelectionPreview();
                break;
            case 'movingBox':
                // Moving is complete, save state and redraw connected arrows
                room.pushHistory();
                room.saveState();
                room.drawArrows(); // Redraw arrows to update connections
                room.dragOffset = { x: 0, y: 0 };
                break;
            case 'panning':
                room.element.style.cursor = 'default';
                room.lastPanPos = { x: 0, y: 0 };
                break;
        }

        room.inEvent = false;
    },

    handleMouseLeave(e) {
        // Reset any ongoing operations when mouse leaves the room
        room.element.style.cursor = 'default';

        // Clean up previews
        room.updateConnectionPreview();
        room.updateSelectionPreview();

        // If we were in the middle of an event, clean it up properly
        if (room.inEvent) {
            switch (room.event) {
                case 'creatingArrow':
                    room.connectingFrom = null;
                    room.connectingTo = null;
                    break;
                case 'selectingRoom':
                    room.selectionStart = null;
                    room.selectionRect = null;
                    break;
                case 'resizingBox':
                    if (room.resizingBox) {
                        room.pushHistory();
                        room.saveState();
                        room.resizingBox = null;
                    }
                    break;
                case 'movingBox':
                    room.pushHistory();
                    room.saveState();
                    room.drawArrows();
                    break;
                case 'panning':
                    // Just reset cursor
                    break;
            }
        }

        // Clear event state
        room.inEvent = false;
        room.event = null;
    },

    handleContextMenu(e) {
        e.preventDefault();
        // Context menu is handled in handleMouseDown with right click
    },

    handleTouchStart(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            const target = document.elementFromPoint(cx, cy);
            if (!target) return;
            
            // Replicate room.getMousePos logic for touch center
            const rect = room.element.getBoundingClientRect();
            const pos = {
                x: (cx - rect.left) - room.offset.x,
                y: (cy - rect.top) - room.offset.y
            };

            const { owner, elementType } = room.getElementOwner(target, pos);

            if (elementType === 'box' || elementType === 'box-text-container' || elementType === 'box-arrow-container') {
                registerEvent('movingBox');
                room.selectBox(owner, false);
                room.dragOffset = {
                    x: pos.x - owner.x,
                    y: pos.y - owner.y
                };
            } else {
                registerEvent('panning');
                room.lastPanPos = { x: cx, y: cy };
                room.element.style.cursor = 'grabbing';
            }
        }
    },

    handleTouchMove(e) {
        if (!room.inEvent) return;
        
        if (e.touches.length === 2) {
            e.preventDefault();
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            if (room.event === 'panning') {
                const dx = cx - room.lastPanPos.x;
                const dy = cy - room.lastPanPos.y;
                room.offset.x += dx;
                room.offset.y += dy;
                room.lastPanPos = { x: cx, y: cy };
                room.element.style.cursor = 'grabbing';
                room.drawAll();
                room.updateSelectionPreview();
            } else if (room.event === 'movingBox') {
                const rect = room.element.getBoundingClientRect();
                const pos = {
                    x: (cx - rect.left) - room.offset.x,
                    y: (cy - rect.top) - room.offset.y
                };
                
                const boxesToMove = room.selectedBoxes.length > 0 ? room.selectedBoxes :
                    (room.selectedBox ? [room.selectedBox] : []);
                
                boxesToMove.forEach(box => {
                    box.x = pos.x - room.dragOffset.x;
                    box.y = pos.y - room.dragOffset.y;
                    room.drawBox(box, false);
                });
                room.drawArrows();
            }
        }
    },

    handleTouchEnd(e) {
        if (room.inEvent && e.touches.length < 2) {
             if (room.event === 'movingBox') {
                room.pushHistory();
                room.saveState();
                room.drawArrows();
                room.dragOffset = { x: 0, y: 0 };
             } else if (room.event === 'panning') {
                room.element.style.cursor = 'default';
                room.lastPanPos = { x: 0, y: 0 };
             }
             room.inEvent = false;
        }
    },

    handleKeyDown(e) {
        if (panel && panel.uiVisible) {
            return;
        }

        if (room.editingBox) {
            return;
        }

        const ctrlOrCmd = e.ctrlKey || e.metaKey;

        // Tab to switch to next box, Shift+Tab to switch to previous box
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                room.switchToPreviousBox();
            } else {
                room.switchToNextBox();
            }
            return;
        }

        // Ctrl+S or Cmd+S to save
        if (ctrlOrCmd && e.key === 's') {
            e.preventDefault();
            if (window.electronAPI && explorer.currentFilePath) {
                explorer.saveCurrentFile();
            }
            return;
        }

        // Ctrl+C or Cmd+C to copy
        if (ctrlOrCmd && e.key === 'c') {
            e.preventDefault();
            room.copy();
            return;
        }

        // Ctrl+X or Cmd+X to cut
        if (ctrlOrCmd && e.key === 'x') {
            e.preventDefault();
            room.cut();
            return;
        }

        // Ctrl+V or Cmd+V to paste
        if (ctrlOrCmd && e.key === 'v') {
            e.preventDefault();
            room.paste();
            return;
        }

        // Ctrl+Z or Cmd+Z to undo
        if (ctrlOrCmd && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            room.undo();
            return;
        }

        // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y to redo
        if ((ctrlOrCmd && e.shiftKey && e.key === 'Z') || (ctrlOrCmd && e.key === 'y')) {
            e.preventDefault();
            room.redo();
            return;
        }

        // Delete or Backspace to delete selected element
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (room.selectedBox || room.selectedArrow) {
                room.pushHistory();
                room.deleteSelectedElement();
            }
            return;
        }

        // Escape to deselect
        if (e.key === 'Escape') {
            const prevBox = room.selectedBox;
            const prevArrow = room.selectedArrow;

            room.selectedBox = null;
            room.selectedArrow = null;
            room.element.style.cursor = 'default';

            // Update selection states
            if (prevBox) room.highlightBox(prevBox, false);
            if (prevArrow) room.highlightArrow(prevArrow, false);
            return;
        }
    }
};

function registerEvent(event) {
    room.last_event = room.event;
    room.event = event;
    room.inEvent = true;
    console.log('last event:', room.last_event, '-> current event:', room.event);
    wrapEvent();
}

function wrapEvent() {
    // Handle cleanup when transitioning FROM last_event TO current event
    // This ensures proper cleanup regardless of what event we're transitioning to

    if (!room.last_event) return; // No cleanup needed on first event

    switch (room.last_event) {
        case 'selectingBox':
            // No special cleanup needed - selection state is maintained
            break;

        case 'creatingArrow':
            break;

        case 'resizingBox':
            // Save state when finishing resize (unless continuing resize)
            if (room.event !== 'resizingBox') {
                if (room.resizingBox) {
                    room.pushHistory();
                    room.saveState();
                    room.resizingBox = null;
                }
                room.lastMousePos = null;
            }
            break;

        case 'selectingArrow':
            // Arrow selection state is maintained, no cleanup needed
            break;

        case 'selectingRoom':
            // Clean up selection preview unless staying in room selection
            if (room.event !== 'selectingRoom') {
                room.selectionStart = null;
                room.selectionRect = null;
                room.updateSelectionPreview(); // Clear visual preview
            }
            break;

        case 'movingBox':
            // Save state when finishing move (unless continuing move)
            if (room.event !== 'movingBox') {
                room.pushHistory();
                room.saveState();
                room.dragOffset = { x: 0, y: 0 };
                room.drawArrows(); // Update arrow positions
            }
            break;

        case 'panning':
            // Reset cursor and pan state unless staying in pan
            if (room.event !== 'panning') {
                room.element.style.cursor = 'default';
                room.lastPanPos = { x: 0, y: 0 };
            }
            break;

        case 'editingBox':
            // Finish editing unless staying in edit mode
            if (room.event !== 'editingBox') {
                room.finishEditing();
            }
            break;

        case 'creatingBox':
            // Box creation completes immediately, no cleanup needed
            break;

        case 'showingBoxContextMenu':
        case 'showingArrowContextMenu':
        case 'showingRoomContextMenu':
            // Context menu state is handled by hideContextMenu(), no cleanup needed
            break;
    }

    // Handle initialization for new events
    // Most initialization is done in the event handlers themselves
    // This section ensures any cross-event setup is handled
    switch (room.event) {
        case 'selectingBox':
            // Ensure cursor is appropriate for selection
            if (room.last_event === 'panning') {
                room.element.style.cursor = 'default';
            }
            break;

        case 'creatingArrow':
            // Ensure any existing selections don't interfere
            if (room.last_event === 'editingBox') {
                room.finishEditing();
            }
            break;

        case 'resizingBox':
            // Ensure we're not in edit mode while resizing
            if (room.last_event === 'editingBox') {
                room.finishEditing();
            }
            room.element.style.cursor = 'nwse-resize';
            break;

        case 'selectingArrow':
            // Ensure cursor is appropriate
            room.element.style.cursor = 'default';
            break;

        case 'selectingRoom':
            // Clear any connection preview from arrow creation
            if (room.last_event === 'creatingArrow') {
                room.updateConnectionPreview();
            }
            break;

        case 'movingBox':
            // Ensure we're not editing while moving
            if (room.last_event === 'editingBox') {
                room.finishEditing();
            }
            room.element.style.cursor = 'grab';
            break;

        case 'panning':
            // Set panning cursor
            room.element.style.cursor = 'grab';
            break;

        case 'editingBox':
            // Ensure only one editing session at a time
            // Already handled in startEditing()
            break;

        case 'creatingBox':
            // Ensure we finish any ongoing edit before creating new box
            if (room.last_event === 'editingBox') {
                room.finishEditing();
            }
            break;

        case 'showingBoxContextMenu':
        case 'showingArrowContextMenu':
        case 'showingRoomContextMenu':
            // Finish editing before showing context menu
            if (room.last_event === 'editingBox') {
                room.finishEditing();
            }
            // Hide any other context menus
            room.hideContextMenu();
            break;
    }
}