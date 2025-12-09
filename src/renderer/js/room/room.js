import { roomEventHandlers as handlers } from './roomEventHandlers.js';

export const room = {
    event: null,
    last_event: null,
    inEvent: false,
    isDirty: false,
    visible: true,

    element: null,
    offset: { x: 0, y: 0 },

    previewConnection: null,
    previewSelection: { connectionLine: null, selectionRect: null },

    boxes: [],
    selectedBox: null,
    selectedBoxes: [],
    editingBox: null,
    resizingBox: null,
    minBoxWidth: 16,
    minBoxHeight: 16,

    selectedArrow: null,
    connectingFrom: null,
    connectingTo: null,

    dragOffset: { x: 0, y: 0 },
    lastMousePos: { x: 0, y: 0 },

    selectionStart: null,
    selectionRect: null,
    lastPanPos: { x: 0, y: 0 },
    
    // Double click detection
    lastClickTime: 0,
    lastClickOwner: null,

    tagNames: {
        '#ef4444': 'Red',
        '#f59e0b': 'Orange',
        '#10b981': 'Green',
        '#3b82f6': 'Blue',
        '#8b5cf6': 'Purple',
        '#ec4899': 'Pink',
        '#6366f1': 'Indigo',
        '#06b6d4': 'Cyan'
    },

    clipboard: null,
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,
    
    // Submenu hover state
    submenuTimeout: null,
    currentSubmenu: null,
    submenuHideDelay: 300, // milliseconds

    init() {
        this.element = document.getElementById('room');
        this.arrowSpaceElement = document.getElementById('arrowSpace');
        this.loadTagNames();
        this.setupEventListeners();
        this.setupSubmenuHandlers();
        this.pushHistory(); // Initial state
        
        // Apply initial visibility
        if (this.element) {
            this.element.style.display = this.visible ? 'block' : 'none';
        }
    },

    generateUUID() {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    },

    getAllArrows() {
        const arrows = [];
        this.boxes.forEach(box => {
            if (box.arrows) {
                arrows.push(...box.arrows);
            }
        });
        return arrows;
    },

    createBox(x, y) {
        const box = {
            id: Date.now() + Math.random(),
            x: x - 75,
            y: y - 40,
            width: 160,
            height: 80,
            originalWidth: 160,
            originalHeight: 80,
            text: '',
            selected: false,
            expanded: false,
            tag: null,
            type: 'text',
            linkedNotePath: null,
            scrollOffset: 0,
            arrows: []
        };
        this.boxes.push(box);
        room.drawBox(box, true);
        room.pushHistory();
        room.saveState();
        return box;
    },

    findBoxAt(x, y) {
        for (let i = this.boxes.length - 1; i >= 0; i--) {
            const box = this.boxes[i];
            if (x >= box.x && x <= box.x + box.width &&
                y >= box.y && y <= box.y + box.height) {
                return box;
            }
        }
        return null;
    },

    createArrow(source, target) {
        const arrow = { source, target, tag: null };
        source.arrows.push(arrow);
        room.drawArrow(arrow);
        room.pushHistory();
        room.saveState();
    },

    getBoxSide(box, dx, dy) {
        const angle = Math.atan2(dy, dx);
        const halfWidth = box.width / 2;
        const halfHeight = box.height / 2;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        if (Math.abs(cos) > Math.abs(sin * halfWidth / halfHeight)) {
            return cos > 0 ? 'right' : 'left';
        } else {
            return sin > 0 ? 'bottom' : 'top';
        }
    },

    getBoxEdgePoint(box, dx, dy) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        const angle = Math.atan2(dy, dx);

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const halfWidth = box.width / 2;
        const halfHeight = box.height / 2;

        let edgeX, edgeY;

        if (Math.abs(cos) > Math.abs(sin * halfWidth / halfHeight)) {
            edgeX = centerX + Math.sign(cos) * halfWidth;
            edgeY = centerY + Math.sign(cos) * halfWidth * Math.tan(angle);
        } else {
            edgeX = centerX + Math.sign(sin) * halfHeight / Math.tan(angle);
            edgeY = centerY + Math.sign(sin) * halfHeight;
        }

        return { x: edgeX, y: edgeY };
    },

    calculateArrowPath(arrow) {
        const source = arrow.source;
        const target = arrow.target;

        const hasReverseArrow = target.arrows && target.arrows.some(a =>
            a.target === source
        );

        const sourceCenter = {
            x: source.x + source.width / 2,
            y: source.y + source.height / 2
        };
        const targetCenter = {
            x: target.x + target.width / 2,
            y: target.y + target.height / 2
        };

        const dx = targetCenter.x - sourceCenter.x;
        const dy = targetCenter.y - sourceCenter.y;

        const sourceEdge = this.getBoxEdgePoint(source, dx, dy);
        const targetEdge = this.getBoxEdgePoint(target, -dx, -dy);

        const sourceSide = this.getBoxSide(source, dx, dy);
        const targetSide = this.getBoxSide(target, -dx, -dy);

        const distance = Math.sqrt(
            (targetEdge.x - sourceEdge.x) ** 2 +
            (targetEdge.y - sourceEdge.y) ** 2
        );

        const handleDistance = Math.min(distance * 0.35, 80);

        const offset = hasReverseArrow ? Math.min(distance * 0.15, 15) : 0;

        const perpX = distance > 0 ? -dy / distance : 0;
        const perpY = distance > 0 ? dx / distance : 0;

        let cp1x, cp1y, cp2x, cp2y;

        switch (sourceSide) {
            case 'right':
                cp1x = sourceEdge.x + handleDistance;
                cp1y = sourceEdge.y;
                break;
            case 'left':
                cp1x = sourceEdge.x - handleDistance;
                cp1y = sourceEdge.y;
                break;
            case 'bottom':
                cp1x = sourceEdge.x;
                cp1y = sourceEdge.y + handleDistance;
                break;
            case 'top':
                cp1x = sourceEdge.x;
                cp1y = sourceEdge.y - handleDistance;
                break;
        }

        switch (targetSide) {
            case 'right':
                cp2x = targetEdge.x + handleDistance;
                cp2y = targetEdge.y;
                break;
            case 'left':
                cp2x = targetEdge.x - handleDistance;
                cp2y = targetEdge.y;
                break;
            case 'bottom':
                cp2x = targetEdge.x;
                cp2y = targetEdge.y + handleDistance;
                break;
            case 'top':
                cp2x = targetEdge.x;
                cp2y = targetEdge.y - handleDistance;
                break;
        }

        if (offset > 0) {
            cp1x += perpX * offset;
            cp1y += perpY * offset;
            cp2x += perpX * offset;
            cp2y += perpY * offset;
        }

        return {
            x1: sourceEdge.x,
            y1: sourceEdge.y,
            cp1x: cp1x,
            cp1y: cp1y,
            cp2x: cp2x,
            cp2y: cp2y,
            x2: targetEdge.x,
            y2: targetEdge.y
        };
    },

    populateTagMenu(containerId, tagNames, selectedItem, setTagCallback) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear existing buttons
        container.innerHTML = '';

        // Determine if this is for boxes or arrows based on container id
        const isBoxMenu = containerId === 'tagColors';

        // Create buttons for all tags in tagNames
        Object.entries(tagNames).forEach(([color, name]) => {
            const button = document.createElement('button');
            button.setAttribute('data-color', color);
            button.onclick = () => setTagCallback(color);

            // Add right-click handler to edit/remove custom tags
            button.oncontextmenu = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Get current tag object
                const currentTag = { color, name };
                
                // Show custom tag dialog for editing
                const result = await room.showCustomTagDialog(currentTag, true);
                
                if (result === 'remove') {
                    // Remove from tagNames dictionary
                    delete room.tagNames[color];
                    room.saveTagNames();
                    
                    // If the selected item has this tag, remove it
                    if (selectedItem && selectedItem.tag && selectedItem.tag.color === color) {
                        selectedItem.tag = null;
                        if (isBoxMenu) {
                            room.drawBox(selectedItem, false);
                        } else {
                            room.drawArrow(selectedItem);
                        }
                        room.saveState();
                    }
                    
                    // Repopulate the menu
                    if (isBoxMenu) {
                        room.populateTagColors(room.tagNames, room.selectedBox);
                    } else {
                        room.populateArrowColors(room.tagNames, room.selectedArrow);
                    }
                } else if (result) {
                    // Update the tag in tagNames dictionary
                    // If color changed, remove old entry
                    if (result.color !== color) {
                        delete room.tagNames[color];
                    }
                    room.tagNames[result.color] = result.name;
                    room.saveTagNames();
                    
                    // If the selected item has this tag, update it
                    if (selectedItem && selectedItem.tag && selectedItem.tag.color === color) {
                        selectedItem.tag = {
                            color: result.color,
                            name: result.name
                        };
                        if (isBoxMenu) {
                            room.drawBox(selectedItem, false);
                        } else {
                            room.drawArrow(selectedItem);
                        }
                        room.saveState();
                    }
                    
                    // Repopulate the menu
                    if (isBoxMenu) {
                        room.populateTagColors(room.tagNames, room.selectedBox);
                    } else {
                        room.populateArrowColors(room.tagNames, room.selectedArrow);
                    }
                }
            };

            const tagDot = document.createElement('span');
            tagDot.className = 'tag-dot-menu';
            tagDot.style.background = color;

            const tagName = document.createElement('span');
            tagName.textContent = name;

            button.appendChild(tagDot);
            button.appendChild(tagName);

            // Add 'selected' class if this matches the current tag
            if (selectedItem && selectedItem.tag && selectedItem.tag.color === color) {
                button.classList.add('selected');
            }

            container.appendChild(button);
        });
    },

    populateTagColors(tagNames, selectedBox) {
        this.populateTagMenu('tagColors', tagNames, selectedBox, (color) => room.setBoxTag(room.selectedBox, color));
    },

    populateArrowColors(tagNames, selectedArrow) {
        this.populateTagMenu('arrowTagColors', tagNames, selectedArrow, (color) => room.setArrowTag(room.selectedArrow, color));
    },

    setBoxTag(box, color) {
        if (!box) return;
        if (color === null) {
            box.tag = null;
        } else {
            const existingTag = box.tag;
            const defaultName = this.tagNames[color] || '';
            box.tag = {
                color: color,
                name: existingTag && existingTag.color === color ? existingTag.name : defaultName
            };
        }
        room.drawBox(box, false);
        room.pushHistory();
        room.saveState();
        this.hideContextMenu();
    },

    setBoxType(box, type) {
        if (!box) return;

        if (type === 'text') {
            box.type = 'text';
            box.linkedNotePath = null;
        } else if (type === 'markdown') {
            box.type = 'markdown';
            box.linkedNotePath = null;
        } else if (type === 'html') {
            box.type = 'html';
            box.linkedNotePath = null;
        }

        // Remove old element and redraw fresh to apply type changes and event listeners
        if (box.element) {
            box.element.remove();
            box.element = null;
        }
        room.drawBox(box, true);
        room.pushHistory();
        room.saveState();
        this.hideContextMenu();
    },

    async setBoxAsBookLink(box, explorer) {
        if (!box || !window.electronAPI) {
            alert('Book links are only available in the desktop application');
            this.hideContextMenu();
            return;
        }

        if (!explorer.rootPath) {
            alert('Please open a folder first to browse for notes');
            this.hideContextMenu();
            return;
        }

        try {
            const result = await window.electronAPI.showOpenDialog({
                properties: ['openFile'],
                defaultPath: explorer.rootPath,
                filters: [
                    { name: 'JSON Notes', extensions: ['json'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const selectedPath = result.filePaths[0];

                let displayPath = selectedPath;
                if (selectedPath.startsWith(explorer.rootPath)) {
                    displayPath = selectedPath.substring(explorer.rootPath.length);
                    if (displayPath.startsWith('\\') || displayPath.startsWith('/')) {
                        displayPath = displayPath.substring(1);
                    }
                }

                box.type = 'book';
                box.linkedNotePath = selectedPath;

                if (!box.text || box.text.trim() === '') {
                    const fileName = displayPath.split(/[\/\\]/).pop().replace('.json', '');
                    box.text = fileName;
                }

                room.drawBox(box, false);
                room.pushHistory();
                room.saveState();
            }
        } catch (error) {
            console.error('Error selecting file:', error);
            alert('Failed to select file: ' + error.message);
        }

        this.hideContextMenu();
    },

    async openBookLink(box, explorer) {
        if (!box || box.type !== 'book' || !box.linkedNotePath) {
            return;
        }

        if (!window.electronAPI) {
            alert('Book links are only available in the desktop application');
            return;
        }

        try {
            await explorer.openFile(box.linkedNotePath);
        } catch (error) {
            console.error('Error opening book link:', error);
            alert('Failed to open linked note: ' + error.message);
        }
    },

    setArrowTag(arrow, color) {
        if (!arrow) return;
        if (color === null) {
            arrow.tag = null;
        } else {
            const existingTag = arrow.tag;
            const defaultName = this.tagNames[color] || '';
            arrow.tag = {
                color: color,
                name: existingTag && existingTag.color === color ? existingTag.name : defaultName
            };
        }
        room.drawArrow(arrow);
        room.pushHistory();
        room.saveState();
        this.hideContextMenu();
    },

    async addCustomBoxTag(box) {
        if (!box) return;
        this.hideContextMenu();
        
        const result = await this.showCustomTagDialog(box.tag);
        if (result) {
            // Add to tagNames dictionary for future use
            this.tagNames[result.color] = result.name;
            this.saveTagNames();
            
            box.tag = {
                color: result.color,
                name: result.name
            };
            room.drawBox(box, false);
            room.pushHistory();
            room.saveState();
        }
    },

    async addCustomArrowTag(arrow) {
        if (!arrow) return;
        this.hideContextMenu();
        
        const result = await this.showCustomTagDialog(arrow.tag);
        if (result) {
            // Add to tagNames dictionary for future use
            this.tagNames[result.color] = result.name;
            this.saveTagNames();
            
            arrow.tag = {
                color: result.color,
                name: result.name
            };
            room.drawArrow(arrow);
            room.pushHistory();
            room.saveState();
        }
    },

    showCustomTagDialog(existingTag, showRemoveButton = false) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('customTagDialog');
            const overlay = document.getElementById('customTagDialogOverlay');
            const nameInput = document.getElementById('customTagName');
            const colorPicker = document.getElementById('customTagColorPicker');
            const colorInput = document.getElementById('customTagColorInput');
            const confirmBtn = document.getElementById('customTagDialogConfirm');
            const cancelBtn = document.getElementById('customTagDialogCancel');
            const removeBtn = document.getElementById('customTagDialogRemove');

            // Set initial values
            if (existingTag) {
                nameInput.value = existingTag.name || '';
                colorPicker.value = existingTag.color || '#3b82f6';
                colorInput.value = existingTag.color || '#3b82f6';
            } else {
                nameInput.value = '';
                colorPicker.value = '#3b82f6';
                colorInput.value = '#3b82f6';
            }

            // Show or hide the remove button
            if (showRemoveButton && existingTag) {
                removeBtn.style.display = 'block';
            } else {
                removeBtn.style.display = 'none';
            }

            // Sync color picker and input
            const syncColorPicker = () => {
                colorInput.value = colorPicker.value;
            };
            const syncColorInput = () => {
                const value = colorInput.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    colorPicker.value = value;
                }
            };

            colorPicker.addEventListener('input', syncColorPicker);
            colorInput.addEventListener('input', syncColorInput);

            const cleanup = () => {
                dialog.style.display = 'none';
                colorPicker.removeEventListener('input', syncColorPicker);
                colorInput.removeEventListener('input', syncColorInput);
            };

            const handleConfirm = () => {
                const name = nameInput.value.trim();
                const color = colorInput.value.trim();
                
                if (!name || !color) {
                    alert('Please enter both a name and a color');
                    return;
                }
                
                if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    alert('Please enter a valid hex color (e.g., #3b82f6)');
                    return;
                }

                cleanup();
                resolve({ name, color });
            };

            const handleRemove = () => {
                cleanup();
                resolve('remove');
            };

            const handleCancel = () => {
                cleanup();
                resolve(null);
            };

            confirmBtn.onclick = handleConfirm;
            cancelBtn.onclick = handleCancel;
            removeBtn.onclick = handleRemove;
            overlay.onclick = handleCancel;

            // Handle Enter key
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            nameInput.addEventListener('keydown', handleKeyDown);
            colorInput.addEventListener('keydown', handleKeyDown);

            dialog.style.display = 'flex';
            nameInput.focus();
        });
    },


    findArrowAt(pos) {
        const { x, y } = pos;
        const adjustedX = x + room.offset.x;
        const adjustedY = y + room.offset.y;
        
        // Get all arrow group elements from the SVG
        const arrowGroups = this.arrowSpaceElement.querySelectorAll('g[data-arrow-id]');
        
        for (const arrowGroup of arrowGroups) {
            // Get the path element (not the hit-area)
            const pathElement = arrowGroup.querySelector('path[stroke]');
            if (!pathElement) continue;
            
            // Create an SVG point for hit testing
            const svgPoint = this.arrowSpaceElement.createSVGPoint();
            svgPoint.x = adjustedX;
            svgPoint.y = adjustedY;
            
            // Check if point is in the stroke with tolerance
            if (pathElement.isPointInStroke && pathElement.isPointInStroke(svgPoint)) {
                return arrowGroup.owner;
            }
        }

        return null;
    },

    setupEventListeners() {
        this.element.addEventListener('mousedown', handlers.handleMouseDown);
        this.element.addEventListener('mousemove', handlers.handleMouseMove);
        this.element.addEventListener('mouseup', handlers.handleMouseUp);
        this.element.addEventListener('mouseleave', handlers.handleMouseLeave);

        this.element.addEventListener('contextmenu', handlers.handleContextMenu);
        document.addEventListener('keydown', handlers.handleKeyDown);
        
        // Prevent default drag/drop behavior globally to avoid opening files in new window
        document.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'none'; });
        document.addEventListener('drop', (e) => e.preventDefault());
    },


    getElementOwner(element, pos) {
        const ifBoxTextContainer = element.closest('.box-text-container');
        const ifBoxArrowContainer = element.closest('.box-arrow-container');
        const ifBox = element.closest('.box');
        if (ifBoxTextContainer) {
            return {owner: ifBoxTextContainer.owner, elementType: 'box-text-container'};
        } else if (ifBoxArrowContainer) {
            return {owner: ifBoxArrowContainer.owner, elementType: 'box-arrow-container'};
        } else if (ifBox) {
            return {owner: ifBox.owner, elementType: 'box'};
        } else if (pos) {
            const arrow = room.findArrowAt(pos);
            if (arrow) {
                return {owner: arrow, elementType: 'arrow'};
            } else {
                return {owner: room, elementType: 'room'};
            }
        }
    },

    selectBox(box, ifAppend = false) {
        // Z-order: move to end of array and DOM
        const index = room.boxes.indexOf(box);
        if (index > -1) {
            room.boxes.splice(index, 1);
            room.boxes.push(box);
        }
        if (box.element && box.element.parentNode) {
            // append child will rerender the element, store scroll position to restore it after rerendered
            const scrollTop = box.element.scrollTop;
            const scrollLeft = box.element.scrollLeft;
            
            // Also save text container scroll as it's the main scrollable area (overflow: auto is on .box-text-container)
            const textContainer = box.element.querySelector('.box-text-container');
            const textScrollTop = textContainer ? textContainer.scrollTop : 0;
            const textScrollLeft = textContainer ? textContainer.scrollLeft : 0;

            box.element.parentNode.appendChild(box.element);
            
            box.element.scrollTop = scrollTop;
            box.element.scrollLeft = scrollLeft;

            if (textContainer) {
                textContainer.scrollTop = textScrollTop;
                textContainer.scrollLeft = textScrollLeft;
            }
        }
        if (!ifAppend) {
            room.resetSelection();
        }
        room.selectedBox = box;
        room.selectedBoxes.push(box);
        room.highlightBox(box, true);
    },

    getMousePos(e) {
        if (!room.element) {
            return { x: e.clientX, y: e.clientY };
        }
        const rect = room.element.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) - room.offset.x,
            y: (e.clientY - rect.top) - room.offset.y
        };
    },

    saveTagNames() {
        localStorage.setItem('tagNames', JSON.stringify(this.tagNames));
    },

    loadTagNames() {
        const saved = localStorage.getItem('tagNames');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default tags, allowing custom tags to override defaults
                this.tagNames = { ...this.tagNames, ...parsed };
            } catch (e) {
                console.error('Failed to load custom tags:', e);
            }
        }
    },

    showBoxContextMenu(x, y) {
        const menu = document.getElementById('boxContextMenu');
        const copy = document.getElementById('boxMenuCopy');
        const cut = document.getElementById('boxMenuCut');
        const del = document.getElementById('boxMenuDelete');
        const tagContainer = document.getElementById('boxMenuTagContainer');
        const typeContainer = document.getElementById('boxMenuTypeContainer');

        const hasSelection = !!this.selectedBox;

        if (copy) {
            copy.style.display = this.selectedBox ? 'block' : 'none';
        }

        if (cut) {
            cut.style.display = this.selectedBox ? 'block' : 'none';
        }

        if (del) {
            del.style.display = hasSelection ? 'block' : 'none';
        }

        if (tagContainer) {
            tagContainer.style.display = this.selectedBox ? 'block' : 'none';
        }

        if (typeContainer) {
            typeContainer.style.display = this.selectedBox ? 'block' : 'none';
        }

        this.populateTagColors(this.tagNames, this.selectedBox);

        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    },

    showArrowContextMenu(x, y) {
        const menu = document.getElementById('arrowContextMenu');
        const del = document.getElementById('arrowMenuDelete');
        const tagContainer = document.getElementById('arrowMenuTagContainer');

        const hasSelection = !!room.selectedArrow;

        if (del) {
            del.style.display = hasSelection ? 'block' : 'none';
        }

        if (tagContainer) {
            tagContainer.style.display = hasSelection ? 'block' : 'none';
        }

        this.populateArrowColors(this.tagNames, room.selectedArrow);

        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    },

    showRoomContextMenu(x, y, options = {}) {
        const menu = document.getElementById('roomContextMenu');
        const pasteContainer = document.getElementById('roomMenuPasteContainer');
        const resetBtn = document.getElementById('roomMenuResetPosition');
        const toggleSidebarBtn = document.getElementById('roomMenuToggleSidebar');
        const sidebar = document.getElementById('sidebar');
        
        const toggleControlsBtn = document.getElementById('roomMenuToggleControls');
        const controls = document.getElementById('controls-layer');

        if (pasteContainer) {
            pasteContainer.style.display = (!options.isProjection && this.clipboard) ? 'block' : 'none';
        }

        if (resetBtn) {
            resetBtn.style.display = options.isProjection ? 'block' : 'none';
        }

        if (toggleSidebarBtn && sidebar) {
            toggleSidebarBtn.textContent = sidebar.classList.contains('collapsed') ? 'Show Sidebar' : 'Hide Sidebar';
        }
        
        if (toggleControlsBtn && controls) {
            const isHidden = controls.style.display === 'none';
            toggleControlsBtn.textContent = isHidden ? 'Show Controls' : 'Hide Controls';
        }

        menu.style.display = 'block';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const isCurrentlyCollapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', isCurrentlyCollapsed);

        setTimeout(() => {

        }, 50);
        this.hideContextMenu();
    },
    
    toggleControls() {
        const controls = document.getElementById('controls-layer');
        if (controls) {
            if (controls.style.display === 'none') {
                controls.style.display = 'block';
            } else {
                controls.style.display = 'none';
            }
        }
        this.hideContextMenu();
    },

    showTagTooltip(box) {
        if (!box.tag || !box.tag.color) return;
        const tooltip = document.getElementById('tagTooltip');
        if (!tooltip) return;
        const tagName = box.tag.name || this.tagNames[box.tag.color] || box.tag.color;
        tooltip.textContent = tagName;
        if (tooltip.style.display === 'none') {
            tooltip.style.display = 'block';
        }
        tooltip.style.left = (box.x + room.offset.x + 20) + 'px';
        tooltip.style.top = (box.y + room.offset.y + 6) + 'px';
    },

    hideTagTooltip() {
        const tooltip = document.getElementById('tagTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    },


    drawAll(fresh = false) {
        room.drawBoxes(fresh);
        room.drawArrows();
    },

    drawBox(box, fresh = false) {
        if (!box) return;
        if (fresh) {
            const isSelected = room.selectedBox === box || room.selectedBoxes.includes(box);

            const boxDiv = document.createElement('div');
            boxDiv.className = 'box';
            if (isSelected) {
                boxDiv.classList.add('selected');
            }

            boxDiv.style.left = (box.x + room.offset.x) + 'px';
            boxDiv.style.top = (box.y + room.offset.y) + 'px';
            boxDiv.style.width = box.width + 'px';
            boxDiv.style.height = box.height + 'px';
            boxDiv.owner = box;
            box.element = boxDiv;

            const arrowContainer = document.createElement('div');
            arrowContainer.className = 'box-arrow-container';
            arrowContainer.owner = box; boxDiv.appendChild(arrowContainer);

            const textContainer = document.createElement('div');
            textContainer.className = 'box-text-container';
            textContainer.owner = box;
            const textDiv = document.createElement('div');
            textDiv.className = 'box-text';
            textDiv.spellcheck = false;

            textDiv.contentEditable = 'false';
            if (box.type === 'markdown' && box.text) {
                if (!box._markdownCache || box._markdownCache.text !== box.text) {
                    const html = room.parseMarkdown(box.text);
                    box._markdownCache = {
                        text: box.text,
                        html: html
                    };
                    textDiv.innerHTML = html;
                    textDiv.classList.add('markdown-content');
                } else {
                    textDiv.innerHTML = box._markdownCache.html;
                    textDiv.classList.add('markdown-content');
                }
            } else if (box.type === 'html' && box.text) {
                textDiv.innerHTML = box.text;
                textDiv.classList.add('html-content');
            } else {
                textDiv.textContent = box.text || '';
            }

            if (box.type === 'html') {
                boxDiv.addEventListener('dragover', handlers.handleBoxDragOver);
                boxDiv.addEventListener('drop', handlers.handleBoxDrop);
            }

            let textBeforeEdit = box.text;
            textDiv.addEventListener('input', (e) => {
                box.text = e.target.innerText;
                delete box._markdownCache; e.stopPropagation();
            });

            textDiv.addEventListener('focus', (e) => {
                textBeforeEdit = box.text;
                e.stopPropagation();
            });

            textDiv.addEventListener('blur', (e) => {
                if (room.editingBox === box) {
                    if (textBeforeEdit !== box.text) {
                        room.pushHistory();
                    }
                    room.finishEditing();
                }
                e.stopPropagation();
            });

            textDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.target.blur();
                    e.preventDefault();
                }
                e.stopPropagation();
            });

            textContainer.appendChild(textDiv);
            arrowContainer.appendChild(textContainer);

            if (box.tag && box.tag.color) {
                const tagDot = room.createTagDotElement(box.tag.color, box);
                boxDiv.appendChild(tagDot);
            }

            const roomDiv = room.element;
            roomDiv.appendChild(boxDiv);

        } else {
            const boxDiv = box.element;
            if (!boxDiv) return;
            const isSelected = room.selectedBox === box || room.selectedBoxes.includes(box);

            if (isSelected && !boxDiv.classList.contains('selected')) {
                boxDiv.classList.add('selected');
            } else if (!isSelected && boxDiv.classList.contains('selected')) {
                boxDiv.classList.remove('selected');
            }

            const newLeft = (box.x + room.offset.x) + 'px';
            const newTop = (box.y + room.offset.y) + 'px';
            if (boxDiv.style.left !== newLeft) boxDiv.style.left = newLeft;
            if (boxDiv.style.top !== newTop) boxDiv.style.top = newTop;

            const newWidth = box.width + 'px';
            const newHeight = box.height + 'px';
            if (boxDiv.style.width !== newWidth) boxDiv.style.width = newWidth;
            if (boxDiv.style.height !== newHeight) boxDiv.style.height = newHeight;

            const existingTagDot = boxDiv.querySelector('.tag-dot');
            const hasTag = box.tag && box.tag.color;

            if (hasTag && !existingTagDot) {
                const tagDot = room.createTagDotElement(box.tag.color, box);
                boxDiv.appendChild(tagDot);
            } else if (!hasTag && existingTagDot) {
                existingTagDot.remove();
            } else if (hasTag && existingTagDot) {
                if (existingTagDot.style.background !== box.tag.color) {
                    existingTagDot.style.background = box.tag.color;
                }
            }
            
            // Redraw arrows connected to this box
            const connectedArrows = [];
            // Arrows where this box is the source
            if (box.arrows) {
                connectedArrows.push(...box.arrows);
            }
            // Arrows where this box is the target
            room.boxes.forEach(b => {
                if (b.arrows) {
                    b.arrows.forEach(arrow => {
                        if (arrow.target === box) {
                            connectedArrows.push(arrow);
                        }
                    });
                }
            });
            
            if (connectedArrows.length > 0) {
                // Find unique arrow to redraw (will redraw all related arrows)
                const arrowsToRedraw = new Set();
                connectedArrows.forEach(arrow => {
                    // Use a representative arrow for each pair of boxes
                    const key = [arrow.source.id, arrow.target.id].sort().join('-');
                    arrowsToRedraw.add(arrow);
                });
                arrowsToRedraw.forEach(arrow => room.drawArrow(arrow));
            }

            // Update text content if changed (crucial for drop handling and collaborative sync)
            const textDiv = boxDiv.querySelector('.box-text');
            if (textDiv && room.editingBox !== box) { // Don't update if currently editing
                if (box.type === 'markdown' && box.text) {
                    if (!box._markdownCache || box._markdownCache.text !== box.text) {
                        const html = room.parseMarkdown(box.text);
                        box._markdownCache = {
                            text: box.text,
                            html: html
                        };
                        textDiv.innerHTML = html;
                        textDiv.classList.add('markdown-content');
                    } else {
                        // Cache hit, but ensure DOM is consistent
                        if (textDiv.innerHTML !== box._markdownCache.html) {
                            textDiv.innerHTML = box._markdownCache.html;
                            textDiv.classList.add('markdown-content');
                        }
                    }
                } else if (box.type === 'html' && box.text) {
                     // For HTML boxes, always update if content differs to ensure videos/images appear
                     if (textDiv.innerHTML !== box.text) {
                        textDiv.innerHTML = box.text;
                        textDiv.classList.add('html-content');
                     }
                } else {
                    // Plain text
                    if (textDiv.textContent !== (box.text || '')) {
                        textDiv.textContent = box.text || '';
                    }
                }
            }
        }
    },

    createTagDotElement(color, box) {
        const tagDot = document.createElement('div');
        tagDot.className = 'tag-dot';
        tagDot.style.background = color;
        tagDot._isTagDot = true;
        tagDot.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        tagDot.addEventListener('dblclick', (e) => {
            e.stopPropagation();
        });
        tagDot.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        tagDot.addEventListener('mouseenter', (e) => {
            e.stopPropagation();
            if (box && box.tag) {
                room.showTagTooltip(box);
            }
        });
        tagDot.addEventListener('mouseleave', (e) => {
            e.stopPropagation();
            room.hideTagTooltip();
        });
        tagDot.addEventListener('mouseover', (e) => {
            e.stopPropagation();
        });
        tagDot.addEventListener('mousemove', (e) => {
            e.stopPropagation();
            room.element.style.cursor = 'pointer';
        });
        return tagDot;
    },

    drawBoxes(fresh) {
        if (fresh) {
            room.element.querySelectorAll('.box').forEach(el => el.remove());
        }
        room.boxes.forEach(box => room.drawBox(box, fresh));
    },

    drawArrow(arrow) {
        if (!arrow) return;
        
        // Find all arrows between the same two boxes (in both directions)
        const relatedArrows = [];
        
        // Arrows from source to target
        if (arrow.source.arrows) {
            arrow.source.arrows.forEach(a => {
                if (a.target === arrow.target) {
                    relatedArrows.push(a);
                }
            });
        }
        
        // Arrows from target to source (reverse)
        if (arrow.target.arrows) {
            arrow.target.arrows.forEach(a => {
                if (a.target === arrow.source) {
                    relatedArrows.push(a);
                }
            });
        }
        
        // Remove existing SVG elements for all related arrows
        relatedArrows.forEach(relatedArrow => {
            if (relatedArrow.id) {
                const existingGroup = room.arrowSpaceElement.querySelector(`g[data-arrow-id="${relatedArrow.id}"]`);
                if (existingGroup) {
                    existingGroup.remove();
                }
            }
        });
        
        // Redraw all related arrows
        relatedArrows.forEach(relatedArrow => {
            const path = room.calculateArrowPath(relatedArrow);
            const isSelected = room.selectedArrow === relatedArrow;
            const color = relatedArrow.tag && relatedArrow.tag.color ? relatedArrow.tag.color : null;
            const strokeColor = color || (isSelected ? '#1a73e8' : '#5f6368');

            const x1 = path.x1 + room.offset.x;
            const y1 = path.y1 + room.offset.y;
            const cp1x = path.cp1x + room.offset.x;
            const cp1y = path.cp1y + room.offset.y;
            const cp2x = path.cp2x + room.offset.x;
            const cp2y = path.cp2y + room.offset.y;
            const x2 = path.x2 + room.offset.x;
            const y2 = path.y2 + room.offset.y;

            const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            if (!relatedArrow.id) {
                relatedArrow.id = room.generateUUID();
            }
            arrowGroup.setAttribute('data-arrow-id', relatedArrow.id);
            arrowGroup.setAttribute('class', 'arrow');
            arrowGroup.owner = relatedArrow;

            const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
            pathElement.setAttribute('d', d);
            pathElement.setAttribute('stroke', strokeColor);
            pathElement.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
            pathElement.setAttribute('fill', 'none');
            pathElement.setAttribute('stroke-linecap', 'round');
            pathElement.setAttribute('stroke-linejoin', 'round');

            const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitArea.setAttribute('d', d);
            hitArea.setAttribute('class', 'hit-area');

            const t = 0.98;
            const mt = 1 - t;
            const beforeEndX = mt * mt * mt * x1 +
                3 * mt * mt * t * cp1x +
                3 * mt * t * t * cp2x +
                t * t * t * x2;
            const beforeEndY = mt * mt * mt * y1 +
                3 * mt * mt * t * cp1y +
                3 * mt * t * t * cp2y +
                t * t * t * y2;

            const angle = Math.atan2(y2 - beforeEndY, x2 - beforeEndX);
            const arrowLength = 8;
            const arrowWidth = 0.35;

            const headPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const headD = `M ${x2} ${y2} L ${x2 - arrowLength * Math.cos(angle - arrowWidth)} ${y2 - arrowLength * Math.sin(angle - arrowWidth)} L ${x2 - arrowLength * Math.cos(angle + arrowWidth)} ${y2 - arrowLength * Math.sin(angle + arrowWidth)} Z`;
            headPath.setAttribute('d', headD);
            headPath.setAttribute('fill', strokeColor);
            headPath.setAttribute('stroke', strokeColor);
            headPath.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
            
            arrowGroup.appendChild(pathElement);
            arrowGroup.appendChild(hitArea);
            arrowGroup.appendChild(headPath);

            room.arrowSpaceElement.appendChild(arrowGroup);
        });
    },

    drawArrows() {
        room.arrowSpaceElement.innerHTML = '';
        const drawn = new Set();
        
        room.boxes.forEach(box => {
            if (!box.arrows) return;
            
            box.arrows.forEach(arrow => {
                // Skip if this arrow was already drawn as part of a related group
                if (drawn.has(arrow)) return;
                
                // Find all related arrows (same pair of boxes)
                const relatedArrows = [];
                
                // Arrows from source to target
                if (arrow.source.arrows) {
                    arrow.source.arrows.forEach(a => {
                        if (a.target === arrow.target) {
                            relatedArrows.push(a);
                        }
                    });
                }
                
                // Arrows from target to source (reverse)
                if (arrow.target.arrows) {
                    arrow.target.arrows.forEach(a => {
                        if (a.target === arrow.source) {
                            relatedArrows.push(a);
                        }
                    });
                }
                
                // Mark all related arrows as drawn
                relatedArrows.forEach(a => drawn.add(a));
                
                // Draw all related arrows together
                relatedArrows.forEach(relatedArrow => {
                const path = room.calculateArrowPath(relatedArrow);
                const isSelected = room.selectedArrow === relatedArrow;
                const color = relatedArrow.tag && relatedArrow.tag.color ? relatedArrow.tag.color : null;
                const strokeColor = color || (isSelected ? '#1a73e8' : '#5f6368');

                const x1 = path.x1 + room.offset.x;
                const y1 = path.y1 + room.offset.y;
                const cp1x = path.cp1x + room.offset.x;
                const cp1y = path.cp1y + room.offset.y;
                const cp2x = path.cp2x + room.offset.x;
                const cp2y = path.cp2y + room.offset.y;
                const x2 = path.x2 + room.offset.x;
                const y2 = path.y2 + room.offset.y;

                const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                if (!relatedArrow.id) {
                    relatedArrow.id = room.generateUUID();
                }
                arrowGroup.setAttribute('data-arrow-id', relatedArrow.id);
                arrowGroup.setAttribute('class', 'arrow');
                arrowGroup.owner = relatedArrow;

                const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
                pathElement.setAttribute('d', d);
                pathElement.setAttribute('stroke', strokeColor);
                pathElement.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
                pathElement.setAttribute('fill', 'none');
                pathElement.setAttribute('stroke-linecap', 'round');
                pathElement.setAttribute('stroke-linejoin', 'round');

                const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                hitArea.setAttribute('d', d);
                hitArea.setAttribute('class', 'hit-area');

                const t = 0.98;
                const mt = 1 - t;
                const beforeEndX = mt * mt * mt * x1 +
                    3 * mt * mt * t * cp1x +
                    3 * mt * t * t * cp2x +
                    t * t * t * x2;
                const beforeEndY = mt * mt * mt * y1 +
                    3 * mt * mt * t * cp1y +
                    3 * mt * t * t * cp2y +
                    t * t * t * y2;

                const angle = Math.atan2(y2 - beforeEndY, x2 - beforeEndX);
                const arrowLength = 8;
                const arrowWidth = 0.35;

                const headPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const headD = `M ${x2} ${y2} L ${x2 - arrowLength * Math.cos(angle - arrowWidth)} ${y2 - arrowLength * Math.sin(angle - arrowWidth)} L ${x2 - arrowLength * Math.cos(angle + arrowWidth)} ${y2 - arrowLength * Math.sin(angle + arrowWidth)} Z`;
                headPath.setAttribute('d', headD);
                headPath.setAttribute('fill', strokeColor);
                headPath.setAttribute('stroke', strokeColor);
                headPath.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');

                arrowGroup.appendChild(pathElement);
                arrowGroup.appendChild(hitArea);
                arrowGroup.appendChild(headPath);

                room.arrowSpaceElement.appendChild(arrowGroup);
                });
            });
        });
    },

    updateCursorStyle(target) {
        if (target.closest('.box-text-container')) {
            room.element.style.cursor = 'default';
        } else if (target.closest('.box-arrow-container')) {
            room.element.style.cursor = 'crosshair';
        } else if (target.closest('.box')) {
            room.element.style.cursor = 'move';
        } else {
            room.element.style.cursor = 'default';
        }
    },

    highlightBox(box, isSelected) {
        const boxDiv = box.element;
        if (isSelected) {
            boxDiv.classList.add('selected');
        } else {
            boxDiv.classList.remove('selected');
        }
    },

    highlightArrow(arrowOrElement, isSelected) {
        let arrow, arrowGroup;

        if (arrowOrElement instanceof Element) {
            arrowGroup = arrowOrElement.closest('g');
            arrow = arrowGroup ? arrowGroup.owner : null;
        } else {
            arrow = arrowOrElement;
            const elements = Array.from(this.arrowSpaceElement.querySelectorAll('g'));
            arrowGroup = elements.find(g => g.owner === arrow);
        }

        if (arrowGroup && arrow) {
            if (isSelected) {
                arrowGroup.setAttribute('class', 'selected');
                arrowGroup.querySelectorAll('path').forEach(path => {
                    path.setAttribute('stroke-width', '2.5');
                });
            } else {
                arrowGroup.removeAttribute('class');
                arrowGroup.querySelectorAll('path').forEach(path => {
                    path.setAttribute('stroke-width', '1.5');
                });
            }
        }
    },

    updateConnectionPreview(pos) {
        const lastPreview = room.previewConnection;
        if (lastPreview && lastPreview.parentElement) {
            lastPreview.remove();
            room.previewConnection = null;
        }

        if (room.connectingFrom && pos) {
            const sourceCenter = {
                x: room.connectingFrom.x + room.connectingFrom.width / 2,
                y: room.connectingFrom.y + room.connectingFrom.height / 2
            };
            const targetX = pos.x;
            const targetY = pos.y;

            const dx = targetX - sourceCenter.x;
            const dy = targetY - sourceCenter.y;
            const sourceEdge = room.getBoxEdgePoint(room.connectingFrom, dx, dy);

            const x1 = sourceEdge.x + room.offset.x;
            const y1 = sourceEdge.y + room.offset.y;
            const x2 = targetX + room.offset.x;
            const y2 = targetY + room.offset.y;

            const previewLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            previewLine.setAttribute('x1', x1);
            previewLine.setAttribute('y1', y1);
            previewLine.setAttribute('x2', x2);
            previewLine.setAttribute('y2', y2);
            previewLine.setAttribute('stroke', room.connectingTo ? '#10b981' : '#3b82f6');
            previewLine.setAttribute('stroke-width', '2');
            previewLine.setAttribute('stroke-dasharray', '5,5');
            previewLine.setAttribute('stroke-linecap', 'round');
            room.previewConnection = previewLine;
            room.arrowSpaceElement.appendChild(previewLine);
        }
    },

    updateSelectionPreview() {
        const existingPreview = room.arrowSpaceElement.querySelector('rect[fill="rgba(59, 130, 246, 0.1)"]');
        if (existingPreview) {
            existingPreview.remove();
        }

        if (room.selectionRect) {
            const rect = room.selectionRect;
            const x = rect.x + room.offset.x;
            const y = rect.y + room.offset.y;

            const selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            selectionRect.setAttribute('x', x);
            selectionRect.setAttribute('y', y);
            selectionRect.setAttribute('width', rect.width);
            selectionRect.setAttribute('height', rect.height);
            selectionRect.setAttribute('fill', 'rgba(59, 130, 246, 0.1)');
            selectionRect.setAttribute('stroke', '#3b82f6');
            selectionRect.setAttribute('stroke-width', '1');
            selectionRect.setAttribute('stroke-dasharray', '5,5');
            room.arrowSpaceElement.appendChild(selectionRect);
        }
    },

    startEditing(box) {
        room.editingBox = box;
        const textDiv = room.editingBox.element.querySelector('.box-text');
        // If it's a markdown box, switch to source text for editing
        if (box.type === 'markdown') {
            textDiv.textContent = box.text || '';
            textDiv.classList.remove('markdown-content');
            textDiv.classList.add('markdown-mode');
        } else if (box.type === 'html') {
            if (textDiv.classList.contains('html-content')) {
                box.text = textDiv.innerHTML;
                box._htmlCache = Array.from(textDiv.childNodes);
                textDiv.innerHTML = '';
            }
            textDiv.textContent = box.text || '';
            textDiv.classList.remove('html-content');
            textDiv.classList.add('html-mode');
        }
        textDiv.contentEditable = 'true';
    },

    finishEditing() {
        if (!room.editingBox) return;
        if (room.editingBox !== room.selectedBox) {
            const textDiv = room.editingBox.element.querySelector('.box-text');
            // If it's a markdown box, switch back to rendered view
            if (room.editingBox.type === 'markdown') {
                textDiv.classList.remove('markdown-mode');
                // Clear cache and redraw to show rendered markdown
                delete room.editingBox._markdownCache;
                const html = room.parseMarkdown(room.editingBox.text);
                room.editingBox._markdownCache = {
                    text: room.editingBox.text,
                    html: html
                };
                textDiv.innerHTML = html;
                textDiv.classList.add('markdown-content');
            } else if (room.editingBox.type === 'html') {
                textDiv.classList.remove('html-mode');
                
                textDiv.innerHTML = '';
                if (room.editingBox._htmlCache) {
                    room.editingBox._htmlCache.forEach(el => textDiv.appendChild(el));
                    delete room.editingBox._htmlCache;
                }
                
                if (textDiv.innerHTML !== room.editingBox.text) {
                    textDiv.innerHTML = room.editingBox.text;
                }
                
                textDiv.classList.add('html-content');
            }
            
            textDiv.contentEditable = 'false';
            textDiv.blur();
            room.editingBox = null;
        }
        room.saveState();
        return;
    },

    expandBox(box) {
        if (!box || !box.element) return;

        const textContainer = box.element.querySelector('.box-text-container');
        const textDiv = box.element.querySelector('.box-text');
        
        if (!textContainer || !textDiv) return;

        // Calculate the required width and height based on scrollWidth/scrollHeight
        // textContainer has padding: top: 12px, left: 12px, right: 12px, bottom: 12px
        // textDiv has padding: left: 5px, right: 5px
        const containerPadding = 36; // 12px left + 12px right (and same for top/bottom)
        

        
        // Get the scroll dimensions
        const scrollWidth = textDiv.scrollWidth;
        const scrollHeight = textDiv.scrollHeight;
        
        // Calculate new dimensions with padding
        const newWidth = scrollWidth + containerPadding + 2;
        const newHeight = scrollHeight + containerPadding + 2;
        
        // Update box dimensions
        box.width = Math.max(room.minBoxWidth, newWidth);
        box.height = Math.max(room.minBoxHeight, newHeight);
        
        // Redraw the box with new dimensions
        room.drawBox(box, false);
        
        // Push to history and save state
        room.pushHistory();
        room.saveState();
    },

    copy() {
        const boxesToCopy = this.selectedBoxes.length > 0 ? this.selectedBoxes :
            (this.selectedBox ? [this.selectedBox] : []);

        if (boxesToCopy.length === 0) return;

        const minX = Math.min(...boxesToCopy.map(b => b.x));
        const minY = Math.min(...boxesToCopy.map(b => b.y));

        this.clipboard = {
            boxes: boxesToCopy.map(box => ({
                id: box.id,
                offsetX: box.x - minX,
                offsetY: box.y - minY,
                width: box.width,
                height: box.height,
                defaultWidth: box.defaultWidth,
                defaultHeight: box.defaultHeight,
                text: box.text,
                expanded: box.expanded,
                tag: box.tag ? { ...box.tag } : null,
                type: box.type,
                linkedNotePath: box.linkedNotePath,
                scrollOffset: box.scrollOffset || 0
            })),
            arrows: []
        };
        
        // Collect arrows where both source and target are in the copied boxes
        boxesToCopy.forEach(box => {
            if (box.arrows) {
                box.arrows.forEach(arrow => {
                    if (boxesToCopy.includes(arrow.target)) {
                        this.clipboard.arrows.push({
                            sourceId: arrow.source.id,
                            targetId: arrow.target.id,
                            tag: arrow.tag
                        });
                    }
                });
            }
        });
    },

    cut() {
        const boxesToCut = this.selectedBoxes.length > 0 ? this.selectedBoxes :
            (this.selectedBox ? [this.selectedBox] : []);

        this.copy();
        room.pushHistory();

        boxesToCut.forEach(box => room.removeBox(box));

        room.saveState();
    },

    paste() {
        room.pushHistory();
        if (!this.clipboard) return;

        const offsetX = 20;
        const offsetY = 20;
        const idMap = new Map();

        this.selectedBoxes = [];

        this.clipboard.boxes.forEach(boxData => {
            const newBox = {
                id: Date.now() + Math.random(),
                x: this.lastMousePos.x + boxData.offsetX + offsetX,
                y: this.lastMousePos.y + boxData.offsetY + offsetY,
                width: boxData.width,
                height: boxData.height,
                defaultWidth: boxData.defaultWidth,
                defaultHeight: boxData.defaultHeight,
                text: boxData.text,
                expanded: boxData.expanded,
                tag: boxData.tag ? JSON.parse(JSON.stringify(boxData.tag)) : null,
                type: boxData.type,
                linkedNotePath: boxData.linkedNotePath,
                scrollOffset: 0,
                arrows: []
            };

            idMap.set(boxData.id, newBox);
            this.boxes.push(newBox);
            this.selectedBoxes.push(newBox);
            room.drawBox(newBox, true);
        });

        this.clipboard.arrows.forEach(arrowData => {
            const source = idMap.get(arrowData.sourceId);
            const target = idMap.get(arrowData.targetId);
            if (source && target) {
                const arrow = {
                    source,
                    target,
                    tag: arrowData.tag ? JSON.parse(JSON.stringify(arrowData.tag)) : null
                };
                source.arrows.push(arrow);
                room.addArrow(arrow);
            }
        });

        this.selectedBox = null;
        room.saveState();
    },

    deleteSelectedElement() {
        const boxesToDelete = this.selectedBoxes.length > 0 ? [...this.selectedBoxes] :
            (this.selectedBox ? [this.selectedBox] : []);
        const arrowToDelete = this.selectedArrow;

        if (boxesToDelete.length === 0 && !arrowToDelete) return;

        this.selectedBox = null;
        this.selectedBoxes = [];
        this.selectedArrow = null;

        boxesToDelete.forEach(box => room.removeBox(box));
        if (arrowToDelete) {
            room.removeArrow(arrowToDelete);
        }

        room.pushHistory();
        room.saveState();
        this.hideContextMenu();
    },

    resetSelection() {
        const prevSelectedBox = room.selectedBox;
        const prevSelectedBoxes = [...room.selectedBoxes];
        const prevSelectedArrow = room.selectedArrow;

        room.selectedBox = null;
        room.selectedBoxes = [];
        room.selectedArrow = null;

        if (prevSelectedBox) room.highlightBox(prevSelectedBox, false);
        prevSelectedBoxes.forEach(box => room.highlightBox(box, false));
        if (prevSelectedArrow) room.highlightArrow(prevSelectedArrow, false);

        room.selectionStart = null;
        room.selectionRect = null;

        room.element.style.cursor = 'default';
    },

    hideContextMenu() {
        const boxContextMenu = document.getElementById('boxContextMenu');
        const roomContextMenu = document.getElementById('roomContextMenu');
        const arrowContextMenu = document.getElementById('arrowContextMenu');
        const fileContextMenu = document.getElementById('fileContextMenu');
        if (boxContextMenu) {
            boxContextMenu.style.display = 'none';
        }
        if (roomContextMenu) {
            roomContextMenu.style.display = 'none';
        }
        if (arrowContextMenu) {
            arrowContextMenu.style.display = 'none';
        }
        if (fileContextMenu) {
            fileContextMenu.style.display = 'none';
        }
        // Also hide all submenus
        this.hideAllSubmenus();
    },

    setupSubmenuHandlers() {
        // Find all menu items with submenus
        const menuItemsWithSubmenu = document.querySelectorAll('.menu-item-with-submenu');
        
        menuItemsWithSubmenu.forEach(menuItem => {
            const submenu = menuItem.querySelector('.submenu');
            if (!submenu) return;
            
            // Show submenu on hover
            menuItem.addEventListener('mouseenter', () => {
                // Clear any pending hide timeout
                if (this.submenuTimeout) {
                    clearTimeout(this.submenuTimeout);
                    this.submenuTimeout = null;
                }
                
                // Hide other submenus first
                this.hideAllSubmenus();
                
                // Show this submenu
                submenu.style.display = 'block';
                this.currentSubmenu = submenu;
            });
            
            // Start hide timer when leaving the menu item
            menuItem.addEventListener('mouseleave', (e) => {
                // Check if we're moving to the submenu itself
                const toElement = e.relatedTarget;
                if (toElement && (submenu.contains(toElement) || toElement === submenu)) {
                    return;
                }
                
                // Start timeout to hide submenu
                this.scheduleSubmenuHide(submenu);
            });
            
            // Cancel hide when entering submenu
            submenu.addEventListener('mouseenter', () => {
                if (this.submenuTimeout) {
                    clearTimeout(this.submenuTimeout);
                    this.submenuTimeout = null;
                }
            });
            
            // Hide when leaving submenu
            submenu.addEventListener('mouseleave', (e) => {
                // Check if we're moving back to the parent menu item
                const toElement = e.relatedTarget;
                if (toElement && menuItem.contains(toElement)) {
                    return;
                }
                
                // Start timeout to hide submenu
                this.scheduleSubmenuHide(submenu);
            });
        });
    },

    scheduleSubmenuHide(submenu) {
        // Clear any existing timeout
        if (this.submenuTimeout) {
            clearTimeout(this.submenuTimeout);
        }
        
        // Set new timeout
        this.submenuTimeout = setTimeout(() => {
            if (submenu) {
                submenu.style.display = 'none';
            }
            if (this.currentSubmenu === submenu) {
                this.currentSubmenu = null;
            }
            this.submenuTimeout = null;
        }, this.submenuHideDelay);
    },

    hideAllSubmenus() {
        // Clear any pending timeout
        if (this.submenuTimeout) {
            clearTimeout(this.submenuTimeout);
            this.submenuTimeout = null;
        }
        
        // Hide all submenus
        const allSubmenus = document.querySelectorAll('.submenu');
        allSubmenus.forEach(submenu => {
            submenu.style.display = 'none';
        });
        
        this.currentSubmenu = null;
    },

    parseMarkdown(text) {
        if (!text || text.trim() === '') {
            return '';
        }

        const rules = [
            {
                pattern: /```([\s\S]*?)```/g,
                replace: (_, code) => `<pre class="code-block"><code>${this._escapeHtml(code.trim())}</code></pre>`
            },
            {
                pattern: /^(#{1,6})\s(.+)$/gm,
                replace: (_, level, content) => `<h${level.length}>${content.trim()}</h${level.length}>`
            },
            {
                pattern: /\*\*(.+?)\*\*/g,
                replace: (_, content) => `<strong>${content}</strong>`
            },
            {
                pattern: /\*(.+?)\*/g,
                replace: (_, content) => `<em>${content}</em>`
            },
            {
                pattern: /`(.+?)`/g,
                replace: (_, code) => `<code>${this._escapeHtml(code)}</code>`
            },
            {
                pattern: /^[\s]*[-*]\s(.+)$/gm,
                replace: (_, content) => `<li>${content.trim()}</li>`
            },
            {
                pattern: /^[\s]*\d+\.\s(.+)$/gm,
                replace: (_, content) => `<li>${content.trim()}</li>`
            },
            {
                pattern: /\[(.+?)\]\((.+?)\)/g,
                replace: (_, text, url) => `<a href="${url}" target="_blank">${text}</a>`
            }
        ];

        let html = text;

        rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replace);
        });

        html = this._processLists(html);

        html = html.split(/\n\n+/).map(para => {
            if (!para.trim()) return '';
            if (para.startsWith('<')) return para; return `<p>${para.trim()}</p>`;
        }).join('\n');

        return html;
    },

    _escapeHtml(text) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => escapeMap[m]);
    },

    _processLists(html) {
        html = html.replace(/(<li>.*?<\/li>\n?)+/g, match => {
            if (match.trim()) {
                return `<ul>${match}</ul>`;
            }
            return match;
        });

        html = html.replace(/(<li>.*?<\/li>\n?)+/g, match => {
            if (match.trim() && !match.includes('<ul>')) {
                return `<ol>${match}</ol>`;
            }
            return match;
        });

        return html;
    },

    calculateMarkdownContentHeight(markdownText, width) {
        if (!markdownText || markdownText.trim() === '') {
            return 0;
        }

        const html = this.parseMarkdown(markdownText);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = width + 'px';
        container.style.padding = '20px';
        container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        container.style.fontSize = '15px';
        container.style.lineHeight = '1.5';
        container.className = 'markdown-content';
        container.innerHTML = html;

        document.body.appendChild(container);
        const height = container.scrollHeight;
        document.body.removeChild(container);

        return height;
    },

    serializeState() {
        const allArrows = [];
        
        // Collect all arrows from all boxes
        room.boxes.forEach(box => {
            if (box.arrows) {
                box.arrows.forEach(arrow => {
                    allArrows.push({
                        sourceId: arrow.source.id,
                        targetId: arrow.target.id,
                        tag: arrow.tag || null
                    });
                });
            }
        });
        
        return {
            boxes: room.boxes.map(box => ({
                id: box.id,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                defaultWidth: box.defaultWidth,
                defaultHeight: box.defaultHeight,
                text: box.text || '',
                expanded: !!box.expanded,
                tag: box.tag || null,
                type: box.type || 'text',
                linkedNotePath: box.linkedNotePath || null,
                scrollOffset: box.scrollOffset || 0
            })),
            arrows: allArrows
        };
    },

    deserializeState(state) {
        if (!state) {
            return { boxes: [], arrows: [] };
        }
        if (!Array.isArray(state.boxes)) {
            state.boxes = [];
        }
        if (!Array.isArray(state.arrows)) {
            state.arrows = [];
        }
        const idToBox = new Map();
        const boxes = state.boxes.map(b => {
            let tag = b.tag || null;
            if (!tag && b.tagColor) {
                tag = { color: b.tagColor, name: '' };
            }
            const box = {
                id: b.id || (Date.now() + Math.random()),
                x: b.x || 0,
                y: b.y || 0,
                width: b.width || 150,
                height: b.height || 80,
                defaultWidth: b.defaultWidth ?? b.width ?? 150,
                defaultHeight: b.defaultHeight ?? b.height ?? 80,
                text: b.text || '',
                expanded: !!b.expanded,
                tag: tag,
                type: b.type || 'text',
                linkedNotePath: b.linkedNotePath || null,
                scrollOffset: b.scrollOffset || 0,
                arrows: []
            };
            idToBox.set(box.id, box);
            return box;
        });
        
        // Create arrows and add them to their source boxes
        state.arrows.forEach(a => {
            if (!a || !a.sourceId || !a.targetId) {
                return;
            }
            const source = idToBox.get(a.sourceId);
            const target = idToBox.get(a.targetId);
            if (source && target && source !== target) {
                let tag = a.tag || null;
                const arrow = {
                    source,
                    target,
                    tag: tag
                };
                source.arrows.push(arrow);
            }
        });
        
        return { boxes };
    },

    markClean() {
        this.isDirty = false;
    },

    saveState() {
        this.isDirty = true;
        const state = room.serializeState();
        localStorage.setItem('nodeState', JSON.stringify(state));
    },

    loadState(state) {
        if (!state) {
            const saved = localStorage.getItem('nodeState');
            if (!saved) return;
            state = JSON.parse(saved);
        }

        const deserialized = this.deserializeState(state);
        room.boxes = deserialized.boxes;

        room.selectedBox = null;
        room.selectedBoxes = [];
        room.selectedArrow = null;

        room.drawAll(true);
    },

    pushHistory() {
        const state = room.serializeState();

        if (room.historyIndex < room.history.length - 1) {
            room.history = room.history.slice(0, room.historyIndex + 1);
        }

        room.history.push(state);

        if (room.history.length > room.maxHistorySize) {
            room.history.shift();
        } else {
            room.historyIndex++;
        }
    },

    undo() {
        if (room.historyIndex > 0) {
            room.historyIndex--;
            const state = room.history[room.historyIndex];
            room.loadState(state);
            room.isDirty = true;
            return true;
        }
        return false;
    },

    redo() {
        if (room.historyIndex < room.history.length - 1) {
            room.historyIndex++;
            const state = room.history[room.historyIndex];
            room.loadState(state);
            room.isDirty = true;
            return true;
        }
        return false;
    },

    removeBox(box) {
        if (!box || !box.element) return;
        
        // Remove all arrows where this box is the source
        if (box.arrows) {
            box.arrows.forEach(arrow => {
                const arrowGroup = Array.from(this.arrowSpaceElement.querySelectorAll('g'))
                    .find(g => g.owner === arrow);
                if (arrowGroup) {
                    arrowGroup.remove();
                }
            });
            box.arrows = [];
        }
        
        // Remove all arrows where this box is the target
        this.boxes.forEach(b => {
            if (b.arrows) {
                b.arrows = b.arrows.filter(arrow => {
                    if (arrow.target === box) {
                        const arrowGroup = Array.from(this.arrowSpaceElement.querySelectorAll('g'))
                            .find(g => g.owner === arrow);
                        if (arrowGroup) {
                            arrowGroup.remove();
                        }
                        return false;
                    }
                    return true;
                });
            }
        });
        
        box.element.remove();
        const index = this.boxes.indexOf(box);
        if (index > -1) {
            this.boxes.splice(index, 1);
        }
    },

    removeArrow(arrow) {
        if (!arrow) return;
        
        // Find the source box and remove the arrow from its arrows array
        const sourceBox = arrow.source;
        if (sourceBox && sourceBox.arrows) {
            const index = sourceBox.arrows.indexOf(arrow);
            if (index > -1) {
                sourceBox.arrows.splice(index, 1);
            }
        }
        
        // Remove the visual element
        const arrowGroup = Array.from(this.arrowSpaceElement.querySelectorAll('g'))
            .find(g => g.owner === arrow);
        if (arrowGroup) {
            arrowGroup.remove();
        }
    },

    switchToNextBox() {
        if (this.boxes.length === 0) return;
        
        let currentIndex = -1;
        if (this.selectedBox) {
            currentIndex = this.boxes.indexOf(this.selectedBox);
        }
        
        // Move to next box (wrap around to first if at end)
        const nextIndex = (currentIndex + 1) % this.boxes.length;
        const nextBox = this.boxes[nextIndex];
        
        // Select the box and center it
        this.selectBox(nextBox, false);
        this.centerBoxInViewport(nextBox);
    },

    switchToPreviousBox() {
        if (this.boxes.length === 0) return;
        
        let currentIndex = -1;
        if (this.selectedBox) {
            currentIndex = this.boxes.indexOf(this.selectedBox);
        }
        
        // Move to previous box (wrap around to last if at beginning)
        const prevIndex = currentIndex <= 0 ? this.boxes.length - 1 : currentIndex - 1;
        const prevBox = this.boxes[prevIndex];
        
        // Select the box and center it
        this.selectBox(prevBox, false);
        this.centerBoxInViewport(prevBox);
    },

    centerBoxInViewport(box) {
        if (!box || !this.element) return;
        
        // Get the viewport dimensions
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = rect.width;
        const viewportHeight = rect.height;
        
        // Calculate the center of the box in world coordinates
        const boxCenterX = box.x + box.width / 2;
        const boxCenterY = box.y + box.height / 2;
        
        // Calculate the center of the viewport
        const viewportCenterX = viewportWidth / 2;
        const viewportCenterY = viewportHeight / 2;
        
        // Pan the room by adjusting the offset so the box appears centered
        // The offset moves the viewport, not the box
        this.offset.x = viewportCenterX - boxCenterX;
        this.offset.y = viewportCenterY - boxCenterY;
        
        // Redraw everything with the new offset (this pans the view)
        this.drawAll(false);
    }
};
