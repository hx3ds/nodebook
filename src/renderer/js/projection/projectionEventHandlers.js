import { projection } from './projection.js';

export const projectionEventHandlers = {
    handleMouseDown(e) {
        // Verify that the event target is actually within the projection layer
        // This prevents interference when clicking on elements in the room layer (which is on top)
        if (e.target !== projection.element && !projection.element.contains(e.target)) {
            return;
        }

        // Left click is button 0
        if (e.button === 0) {
            if (window.room) {
                window.room.hideContextMenu();
            }

            // Trigger movement logic
            projection.triggeringMovement = true;
            projection.mouseDownEvent = e;
            projection.holdTimeout = setTimeout(() => {
                if (projection.triggeringMovement) {
                    projection.isDragging = true;
                    projection.dragStart.x = projection.mouseDownEvent.clientX;
                    projection.dragStart.y = projection.mouseDownEvent.clientY;
                    projection.initialPan.x = projection.panX;
                    projection.initialPan.y = projection.panY;
                    projection.element.style.cursor = 'grabbing';
                }
            }, 200); // 200ms hold
        }
    },

    handleMouseMove(e) {
        projection.triggeringMovement = false;
        if (projection.isDragging) {
            const dx = e.clientX - projection.dragStart.x;
            const dy = e.clientY - projection.dragStart.y;
            projection.setPan(projection.initialPan.x + dx, projection.initialPan.y + dy);
        }
    },

    handleMouseUp(e) {
        projection.triggeringMovement = false;
        clearTimeout(projection.holdTimeout);
        if (e.button === 0 && projection.isDragging) {
            projection.isDragging = false;
            projection.element.style.cursor = '';
        }
    },

    handleContextMenu(e) {
        e.preventDefault();
        // Reuse room context menu for consistency and simplicity
        if (window.room) {
            window.room.showRoomContextMenu(e.clientX, e.clientY, { isProjection: true });
        }
    }
};
