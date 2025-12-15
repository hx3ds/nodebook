export function createColumn(parent, className = 'ui-column') {
    const col = document.createElement('div');
    col.className = className;
    parent.appendChild(col);
    
    // Auto-manage visibility to show only the last 2 columns
    updateVisibility(parent);
    
    return col;
}

export function clearSiblings(element) {
    const parent = element.parentNode;
    while (element.nextElementSibling) {
        element.nextElementSibling.remove();
    }
    
    // Update visibility after removing columns
    if (parent) {
        updateVisibility(parent);
    }
}

export function updateVisibility(parent, visibleCount = 2) {
    // Enforce max 2 columns as per UI requirements
    if (visibleCount > 2) visibleCount = 2;

    const cols = Array.from(parent.querySelectorAll('.ui-column'));
    const total = cols.length;
    
    // If we have fewer or equal columns than visibleCount, show all
    if (total <= visibleCount) {
        cols.forEach(c => c.style.display = '');
        return;
    }

    cols.forEach((c, i) => {
        // Show only the last 'visibleCount' columns
        if (i >= total - visibleCount) {
            c.style.display = '';
        } else {
            c.style.display = 'none';
        }
    });
}
