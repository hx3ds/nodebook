import { UI } from '../../../ui/index.js';

export class ProfileTab {
    constructor({ initialBinaryPath, onUpdate }) {
        this.binaryPath = initialBinaryPath || '';
        this.onUpdate = onUpdate;
        
        this.state = {
            isSaved: false
        };
    }

    render(container) {
        this.container = container;
        this.renderUI();
        this.updateColumnVisibility();
    }

    updateColumnVisibility() {
        if (!this.container || !this.container.parentElement) return;
        UI.Layout.updateVisibility(this.container.parentElement);
    }

    renderUI() {
        if (!this.container) return;

        this.container.innerHTML = `
            ${UI.Header({ title: 'Settings' })}
            <div class="ui-content padded">
                <div style="max-width: 600px; margin: 0 auto;">
                    <div style="background: #f6f8fa; padding: 20px; border-radius: 8px; border: 1px solid #e1e4e8;">
                        ${UI.FormGroup({
                            label: 'yt-dlp Binary Path',
                            control: `
                                ${UI.Input({ 
                                    id: 'ytdlp-path-input', 
                                    value: this.binaryPath, 
                                    placeholder: 'e.g. yt-dlp or /usr/local/bin/yt-dlp' 
                                })}
                                <div style="margin-top: 5px; font-size: 0.8em; color: #586069;">Ensure yt-dlp is installed and accessible.</div>
                            `
                        })}

                        <div style="margin-top: 20px; display: flex; align-items: center; gap: 10px;">
                            ${UI.Button({ id: 'save-settings-btn', label: 'Save Settings', variant: 'primary' })}
                            ${this.state.isSaved ? UI.Badge({ label: 'Saved!', variant: 'success' }) : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const saveBtn = this.container.querySelector('#save-settings-btn');
        const pathInput = this.container.querySelector('#ytdlp-path-input');

        saveBtn.addEventListener('click', () => {
            const newPath = pathInput.value.trim();
            if (newPath) {
                this.binaryPath = newPath;
                this.onUpdate(newPath);
                this.state.isSaved = true;
                this.renderUI();
                
                // Reset saved message after 2 seconds
                setTimeout(() => {
                    this.state.isSaved = false;
                    this.renderUI();
                }, 2000);
            }
        });
    }
}
