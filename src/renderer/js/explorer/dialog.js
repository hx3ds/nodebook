// Custom Dialog Module
export const dialog = {
    prompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            const dialogEl = document.getElementById('promptDialog');
            const titleEl = document.getElementById('promptDialogTitle');
            const labelEl = document.getElementById('promptDialogLabel');
            const inputEl = document.getElementById('promptDialogInput');
            const confirmBtn = document.getElementById('promptDialogConfirm');
            const cancelBtn = document.getElementById('promptDialogCancel');
            const overlayEl = document.getElementById('promptDialogOverlay');
            
            // Set dialog content
            titleEl.textContent = title;
            labelEl.textContent = message;
            inputEl.value = defaultValue;
            inputEl.placeholder = defaultValue;
            
            // Show dialog
            dialogEl.style.display = 'flex';
            
            // Focus and select input
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 100);
            
            // Handle confirm
            const handleConfirm = () => {
                const value = inputEl.value.trim();
                cleanup();
                resolve(value || null);
            };
            
            // Handle cancel
            const handleCancel = () => {
                cleanup();
                resolve(null);
            };
            
            // Handle Enter key
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };
            
            // Cleanup function
            const cleanup = () => {
                dialogEl.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlayEl.removeEventListener('click', handleCancel);
                inputEl.removeEventListener('keydown', handleKeyDown);
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlayEl.addEventListener('click', handleCancel);
            inputEl.addEventListener('keydown', handleKeyDown);
        });
    },
    
    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const dialogEl = document.getElementById('promptDialog');
            const titleEl = document.getElementById('promptDialogTitle');
            const labelEl = document.getElementById('promptDialogLabel');
            const inputEl = document.getElementById('promptDialogInput');
            const confirmBtn = document.getElementById('promptDialogConfirm');
            const cancelBtn = document.getElementById('promptDialogCancel');
            const overlayEl = document.getElementById('promptDialogOverlay');
            
            // Set dialog content
            titleEl.textContent = title;
            labelEl.textContent = message;
            inputEl.style.display = 'none';
            
            // Show dialog
            dialogEl.style.display = 'flex';
            
            // Handle confirm
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            // Handle cancel
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            // Handle Enter key
            const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };
            
            // Cleanup function
            const cleanup = () => {
                dialogEl.style.display = 'none';
                inputEl.style.display = 'block';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                overlayEl.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleKeyDown);
            };
            
            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            overlayEl.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleKeyDown);
        });
    }
};
