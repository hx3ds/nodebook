import { UI } from '../../../ui/index.js';

export class DownloadTab {
    constructor({ binaryPath }) {
        this.binaryPath = binaryPath;
        this.api = window.electronAPI;
        
        if (!this.api) {
            this.error = 'Electron API not found. Please restart the application to enable the plugin.';
            console.error(this.error);
        } else {
            // Register process event listener
            this.api.onProcessEvent((data) => this.handleProcessEvent(data));
        }

        this.state = {
            projects: this.loadProjectsFromStorage(), // List of folder paths
            currentProject: null, // { path, config, media: [] }
            view: 'list', // 'list', 'project', 'media', 'settings'
            selectedMedia: null,
            isCreating: false,
            loading: false,
            isAddingMedia: false
        };
    }

    loadProjectsFromStorage() {
        try {
            const stored = localStorage.getItem('ytdlp_projects');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    saveProjectsToStorage() {
        localStorage.setItem('ytdlp_projects', JSON.stringify(this.state.projects));
    }

    updateBinaryPath(path) {
        this.binaryPath = path;
    }

    render(container) {
        this.container = container;
        this.renderUI();
    }

    renderUI() {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (this.error) {
            this.container.innerHTML = UI.Error({ message: this.error });
            return;
        }

        // Column 1: Project List (Always)
        const listCol = UI.Layout.createColumn(this.container);
        this.renderProjectList(listCol);

        // Column 2: Project Detail (If project selected)
        if (this.state.currentProject) {
            const projectCol = UI.Layout.createColumn(this.container);
            this.renderProjectDetail(projectCol);
            
            // Column 3: Media or Settings
            if (this.state.view === 'media' && this.state.selectedMedia) {
                const mediaCol = UI.Layout.createColumn(this.container);
                this.renderMediaDetail(mediaCol);
            } else if (this.state.view === 'settings') {
                const settingsCol = UI.Layout.createColumn(this.container);
                this.renderProjectSettings(settingsCol);
            }
        }
        
        UI.Layout.updateVisibility(this.container);
    }

    // --- Project List View ---

    renderProjectList(col) {
        const headerActions = UI.Button({
            id: 'add-project-btn',
            label: '+ New',
            variant: 'primary',
            size: 'small',
            style: 'margin: 0'
        });

        const listItems = this.state.projects.map(p => UI.ListItem({
            id: p,
            title: this.api ? this.api.basename(p) : p,
            subtitle: p,
            selected: this.state.currentProject && this.state.currentProject.path === p
        })).join('');

        const emptyState = `
            <div class="ui-empty">
                <div style="font-size: 24px; margin-bottom: 10px;">📂</div>
                <div>No projects yet.</div>
                <div class="ui-text-small ui-mt-2">Create one to start downloading.</div>
            </div>
        `;

        col.innerHTML = `
            ${UI.Header({ title: 'Projects', actions: headerActions })}
            <div class="ui-content">
                ${this.state.projects.length === 0 ? emptyState : listItems}
            </div>
        `;

        col.querySelector('#add-project-btn').addEventListener('click', () => this.handleAddProject());

        col.querySelectorAll('.ui-list-item').forEach(el => {
            el.addEventListener('click', () => this.openProject(el.dataset.id));
        });
    }

    async handleAddProject() {
        try {
            const result = await this.api.showOpenDialog({
                properties: ['openDirectory'],
                title: 'Select Project Folder'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const path = result.filePaths[0];
                if (!this.state.projects.includes(path)) {
                    this.state.projects.push(path);
                    this.saveProjectsToStorage();
                    this.openProject(path);
                } else {
                    this.openProject(path);
                }
            }
        } catch (e) {
            console.error('Dialog failed, falling back to prompt:', e);
            const path = prompt("Enter absolute path for the project folder:");
            if (path && path.trim()) {
                if (await this.api.pathExists(path)) {
                    if (!this.state.projects.includes(path)) {
                        this.state.projects.push(path);
                        this.saveProjectsToStorage();
                        this.openProject(path);
                    } else {
                        this.openProject(path);
                    }
                } else {
                    alert("Folder does not exist!");
                }
            }
        }
    }

    async openProject(projectPath) {
        // Load project.json
        const configPath = this.api.joinPath(projectPath, 'project.json');
        let projectData = {
            path: projectPath,
            config: {},
            media: []
        };

        if (await this.api.pathExists(configPath)) {
            try {
                const dataStr = await this.api.readFile(configPath);
                const data = JSON.parse(dataStr);
                projectData = { ...projectData, ...data, path: projectPath };
            } catch (e) {
                console.error("Failed to load project.json", e);
            }
        }

        this.state.currentProject = projectData;
        this.state.view = 'project';
        this.state.selectedMedia = null;
        this.renderUI();
    }

    async saveCurrentProject() {
        if (!this.state.currentProject) return;
        const configPath = this.api.joinPath(this.state.currentProject.path, 'project.json');
        try {
            // Filter out runtime state if any
            const dataToSave = {
                config: this.state.currentProject.config,
                media: this.state.currentProject.media
            };
            await this.api.writeFile(configPath, JSON.stringify(dataToSave, null, 2));
        } catch (e) {
            console.error("Failed to save project.json", e);
        }
    }

    // --- Project Detail View ---

    renderProjectDetail(col) {
        const project = this.state.currentProject;
        if (!project) return;

        const headerActions = `
            ${UI.Button({ id: 'project-settings-btn', label: '⚙️', size: 'small', style: 'margin:0; padding: 4px 8px;' })}
            ${UI.Button({ id: 'add-media-btn', label: '+ URL', variant: 'primary', size: 'small', style: 'margin:0' })}
            ${UI.Button({ id: 'close-project-btn', label: '✕', size: 'small', style: 'margin:0; padding: 4px 8px;' })}
        `;

        const mediaItems = project.media.map(m => UI.ListItem({
            id: m.id,
            title: `<span style="margin-right:8px">${m.formats ? '🎬' : '⏳'}</span> ${m.title || m.url}`,
            subtitle: `<span style="display:flex; justify-content:space-between; width:100%"><span>${m.status || 'Pending'}</span><span>${m.progress || '0%'}</span></span>`,
            selected: this.state.selectedMedia && this.state.selectedMedia.id === m.id
        })).join('');

        const emptyState = `
            <div class="ui-empty">
                <div style="font-size: 32px; margin-bottom: 10px; opacity: 0.5;">📺</div>
                <div>No media added yet.</div>
                <div class="ui-text-small ui-mt-2">Click <b>+ URL</b> to start.</div>
            </div>
        `;

        const addMediaForm = this.state.isAddingMedia ? `
            <div style="padding: 15px; border-bottom: 1px solid #eee; background: #f9f9f9;">
                ${UI.Input({ id: 'new-media-url', placeholder: 'Paste Video/Playlist URL here...', style: 'margin-bottom: 10px;' })}
                <div class="ui-flex-row" style="justify-content: flex-end; margin-top: 10px;">
                    ${UI.Button({ id: 'cancel-add-media', label: 'Cancel', size: 'small', style: 'width:auto; margin:0' })}
                    ${UI.Button({ id: 'confirm-add-media', label: 'Add', variant: 'primary', size: 'small', style: 'width:auto; margin:0' })}
                </div>
            </div>
        ` : '';

        col.innerHTML = `
            ${UI.Header({ title: this.api.basename(project.path), actions: headerActions })}
            <div class="ui-content">
                ${addMediaForm}
                ${project.media.length === 0 ? emptyState : mediaItems}
            </div>
        `;

        col.querySelector('#project-settings-btn').addEventListener('click', () => {
            if (this.state.view === 'settings') {
                this.state.view = 'project';
            } else {
                this.state.view = 'settings';
                this.state.selectedMedia = null;
            }
            this.renderUI();
        });

        col.querySelector('#add-media-btn').addEventListener('click', () => {
            this.state.isAddingMedia = !this.state.isAddingMedia;
            this.renderUI();
            if (this.state.isAddingMedia) {
                setTimeout(() => {
                    const input = col.querySelector('#new-media-url');
                    if (input) input.focus();
                }, 50);
            }
        });

        if (this.state.isAddingMedia) {
            col.querySelector('#cancel-add-media').addEventListener('click', () => {
                this.state.isAddingMedia = false;
                this.renderUI();
            });

            col.querySelector('#confirm-add-media').addEventListener('click', () => {
                const input = col.querySelector('#new-media-url');
                const url = input.value.trim();
                if (url) {
                    const newMedia = {
                        id: Date.now().toString(),
                        url: url,
                        title: url,
                        status: 'Pending',
                        progress: '0%',
                        formats: null,
                        selectedFormat: null
                    };
                    project.media.push(newMedia);
                    this.state.isAddingMedia = false;
                    this.saveCurrentProject();
                    this.renderUI();
                    this.fetchMediaInfo(newMedia);
                }
            });

            col.querySelector('#new-media-url').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    col.querySelector('#confirm-add-media').click();
                } else if (e.key === 'Escape') {
                    this.state.isAddingMedia = false;
                    this.renderUI();
                }
            });
        }

        col.querySelector('#close-project-btn').addEventListener('click', () => {
            this.state.view = 'list';
            this.state.currentProject = null;
            this.state.selectedMedia = null;
            this.renderUI();
        });

        col.querySelectorAll('.ui-list-item').forEach(el => {
            el.addEventListener('click', () => {
                const media = project.media.find(m => m.id === el.dataset.id);
                this.state.selectedMedia = media;
                this.state.view = 'media';
                this.renderUI();
            });
        });
    }

    // --- Project Settings View ---

    renderProjectSettings(col) {
        const project = this.state.currentProject;
        if (!project) return;
        const config = project.config || {};

        const headerActions = UI.Button({
            id: 'close-settings-btn',
            label: '✕',
            size: 'small',
            style: 'margin:0; padding: 4px 8px;'
        });

        col.innerHTML = `
            ${UI.Header({ title: 'Project Settings', actions: headerActions })}
            <div class="ui-content padded">
                ${UI.FormGroup({
                    label: 'Output Template',
                    control: `
                        ${UI.Input({ id: 'output-template-input', value: config.outputTemplate || '%(title)s.%(ext)s' })}
                        <div class="ui-text-small ui-mt-2">e.g., %(title)s.%(ext)s or %(uploader)s/%(title)s.%(ext)s</div>
                    `
                })}

                ${UI.FormGroup({
                    label: 'Proxy URL',
                    control: UI.Input({ id: 'proxy-input', value: config.proxy || '', placeholder: 'http://user:pass@host:port' })
                })}

                ${UI.FormGroup({
                    label: 'Cookies File',
                    control: `
                        <div class="ui-flex-row">
                            <div style="flex:1">${UI.Input({ id: 'cookies-input', value: config.cookiesPath || '' })}</div>
                            ${UI.Button({ id: 'browse-cookies-btn', label: '...', size: 'small', style: 'width:auto; margin:0' })}
                        </div>
                    `
                })}

                ${UI.FormGroup({
                    label: 'Archive File',
                    control: UI.Checkbox({ 
                        id: 'use-archive-check', 
                        checked: config.useArchive, 
                        label: 'Enable download archive (prevents re-downloading)' 
                    })
                })}

                ${UI.Button({ id: 'save-project-config-btn', label: 'Save Changes', variant: 'primary' })}
            </div>
        `;

        col.querySelector('#close-settings-btn').addEventListener('click', () => {
            this.state.view = 'project';
            this.renderUI();
        });

        col.querySelector('#browse-cookies-btn').addEventListener('click', async () => {
            const result = await this.api.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: 'Text Files', extensions: ['txt', 'txt'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
                col.querySelector('#cookies-input').value = result.filePaths[0];
            }
        });

        col.querySelector('#save-project-config-btn').addEventListener('click', () => {
            const newConfig = {
                outputTemplate: col.querySelector('#output-template-input').value,
                proxy: col.querySelector('#proxy-input').value,
                cookiesPath: col.querySelector('#cookies-input').value,
                useArchive: col.querySelector('#use-archive-check').checked
            };

            this.state.currentProject.config = newConfig;
            this.saveCurrentProject();
            this.state.view = 'project';
            this.renderUI();
        });
    }

    // --- Media Detail View ---

    renderMediaDetail(col) {
        const media = this.state.selectedMedia;
        if (!media) return;

        const headerActions = `
            ${UI.Button({ id: 'delete-media-btn', label: 'Delete', variant: 'danger', size: 'small', style: 'margin:0' })}
            ${UI.Button({ id: 'close-media-btn', label: '✕', size: 'small', style: 'margin:0; padding: 4px 8px;' })}
        `;

        let formatControl = '';
        if (media.formats) {
            const options = [
                { value: 'best', label: 'Best (Default)' },
                ...media.formats.map(f => ({
                    value: f.format_id,
                    label: `${f.format_note || ''} (${f.ext}) - ${f.resolution || 'audio only'}`
                }))
            ];
            formatControl = UI.Select({ 
                id: 'format-select', 
                options: options, 
                selected: media.selectedFormat || 'best' 
            });
        } else {
            formatControl = `<div class="ui-text-small ui-mb-2" style="padding: 8px; background: #f5f5f5; border-radius: 4px;">
                ${media.status === 'Fetching Info...' ? 'Loading formats...' : 'Formats not available'}
            </div>`;
        }

        col.innerHTML = `
            ${UI.Header({ title: 'Media Details', actions: headerActions })}
            <div class="ui-content padded">
                ${UI.FormGroup({
                    label: 'URL',
                    control: UI.Input({ id: 'media-url-display', value: media.url, style: 'background:#f9f9f9; color:#666' })
                })}
                
                ${UI.FormGroup({
                    label: 'Title',
                    control: UI.Input({ id: 'media-title-display', value: media.title || '', style: 'background:#f9f9f9; color:#666' })
                })}

                ${UI.FormGroup({
                    label: 'Status',
                    control: UI.Badge({ 
                        label: `${media.status} ${media.progress ? `(${media.progress})` : ''}`, 
                        variant: 'info' 
                    })
                })}

                ${UI.FormGroup({
                    label: 'Format',
                    control: formatControl
                })}

                <div class="ui-flex-row ui-mb-2">
                    ${UI.Button({ 
                        id: 'download-btn', 
                        label: media.status === 'Downloading' ? 'Stop' : 'Start Download', 
                        variant: 'primary',
                        style: 'margin:0'
                    })}
                    ${UI.Button({ 
                        id: 'refresh-info-btn', 
                        label: 'Refresh Info', 
                        style: 'width:auto; margin:0'
                    })}
                </div>

                ${UI.CodeBlock({ 
                    id: 'logs-area', 
                    content: media.logs || 'Ready to start.', 
                    style: 'height: 200px;' 
                })}
            </div>
        `;

        // Set inputs to readonly manually as UI.Input doesn't support it yet
        col.querySelector('#media-url-display').readOnly = true;
        col.querySelector('#media-title-display').readOnly = true;

        col.querySelector('#close-media-btn').addEventListener('click', () => {
            this.state.selectedMedia = null;
            this.state.view = 'project';
            this.renderUI();
        });

        col.querySelector('#delete-media-btn').addEventListener('click', () => {
            if (confirm('Delete this media item?')) {
                this.state.currentProject.media = this.state.currentProject.media.filter(m => m.id !== media.id);
                this.saveCurrentProject();
                this.state.selectedMedia = null;
                this.state.view = 'project';
                this.renderUI();
            }
        });

        const formatSelect = col.querySelector('#format-select');
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                media.selectedFormat = e.target.value;
                this.saveCurrentProject();
            });
        }

        col.querySelector('#refresh-info-btn').addEventListener('click', () => {
            this.fetchMediaInfo(media);
        });

        col.querySelector('#download-btn').addEventListener('click', () => {
            if (media.status === 'Downloading') {
                this.stopDownload(media);
            } else {
                this.startDownload(media);
            }
        });
    }

    // --- Logic ---

    addLog(media, message) {
        const timestamp = new Date().toLocaleTimeString();
        media.logs = (media.logs || '') + `[${timestamp}] ${message}\n`;
        // Limit logs
        if (media.logs.length > 5000) media.logs = media.logs.substring(media.logs.length - 5000);
        
        if (this.state.selectedMedia && this.state.selectedMedia.id === media.id) {
            const logsArea = this.container.querySelector('#logs-area');
            if (logsArea) {
                logsArea.textContent = media.logs;
                logsArea.scrollTop = logsArea.scrollHeight;
            }
        }
    }

    async fetchMediaInfo(media) {
        if (!this.binaryPath) {
            alert('Please configure yt-dlp binary path in Settings first.');
            return;
        }

        media.status = 'Fetching Info...';
        this.renderUI();

        const config = this.state.currentProject.config || {};
        let cmd = `"${this.binaryPath}" -j`;

        if (config.proxy && config.proxy.trim()) {
            cmd += ` --proxy "${config.proxy.trim()}"`;
        }
        if (config.cookiesPath && config.cookiesPath.trim()) {
            cmd += ` --cookies "${config.cookiesPath.trim()}"`;
        }

        cmd += ` "${media.url}"`;

        this.addLog(media, `Executing: ${cmd}`);

        try {
            const result = await this.api.execCommand(cmd);
            
            if (result.error) {
                media.status = 'Error';
                this.addLog(media, `Error: ${result.error}`);
                if (result.stderr) this.addLog(media, `Stderr: ${result.stderr}`);
            } else {
                const info = JSON.parse(result.stdout);
                media.title = info.title;
                media.formats = info.formats;
                media.status = 'Ready';
                this.addLog(media, 'Info fetched successfully.');
                this.saveCurrentProject();
            }
        } catch (e) {
            media.status = 'Error';
            this.addLog(media, `Exception: ${e.message}`);
        }
        this.renderUI();
    }

    async startDownload(media) {
        if (!this.binaryPath) {
            alert('Please configure yt-dlp binary path in Settings first.');
            return;
        }

        media.status = 'Downloading';
        media.progress = '0%';
        this.renderUI();

        // Args construction
        const args = [];
        const config = this.state.currentProject.config || {};

        if (media.selectedFormat && media.selectedFormat !== 'best') {
            args.push('-f', media.selectedFormat);
        }
        
        // Output template
        const template = config.outputTemplate || '%(title)s.%(ext)s';
        const outputTemplate = this.api.joinPath(this.state.currentProject.path, template);
        args.push('-o', outputTemplate);

        // Proxy
        if (config.proxy && config.proxy.trim()) {
            args.push('--proxy', config.proxy.trim());
        }

        // Cookies
        if (config.cookiesPath && config.cookiesPath.trim()) {
            args.push('--cookies', config.cookiesPath.trim());
        }

        // Archive
        if (config.useArchive) {
            const archivePath = this.api.joinPath(this.state.currentProject.path, 'archive.txt');
            args.push('--download-archive', archivePath);
        }

        args.push(media.url);

        this.addLog(media, `Starting download...`);
        this.addLog(media, `Command: ${this.binaryPath} ${args.join(' ')}`);

        // Use media.id as process ID
        await this.api.spawnCommand(media.id, this.binaryPath, args);
    }

    async stopDownload(media) {
        await this.api.killProcess(media.id);
        media.status = 'Stopped';
        this.addLog(media, 'Download stopped by user.');
        this.saveCurrentProject();
        this.renderUI();
    }

    handleProcessEvent(event) {
        const { id, type, data, code, error } = event;
        
        // Find media with this ID in current project
        if (!this.state.currentProject) return;
        const media = this.state.currentProject.media.find(m => m.id === id);
        if (!media) return;

        if (type === 'stdout') {
            const str = data.toString();
            // Parse progress
            const match = str.match(/(\d+\.?\d*)%/);
            if (match) {
                media.progress = match[1] + '%';
                // Update status display efficiently
                if (this.state.selectedMedia && this.state.selectedMedia.id === media.id) {
                     // Re-render whole UI might be too heavy?
                     // Just finding the badge might be better but for now let's stick to simple logic
                     // Or just update the badge text if found
                     const badge = this.container.querySelector('.ui-badge.info');
                     if (badge) badge.textContent = `${media.status} (${media.progress})`;
                }
            }
            this.addLog(media, str.trim());
        } else if (type === 'stderr') {
            this.addLog(media, `Log: ${data.toString()}`);
        } else if (type === 'close') {
            if (code === 0) {
                media.status = 'Completed';
                media.progress = '100%';
                this.addLog(media, 'Download completed successfully.');
            } else {
                media.status = 'Failed';
                this.addLog(media, `Download failed with code ${code}`);
            }
            this.saveCurrentProject();
            this.renderUI();
        } else if (type === 'error') {
            media.status = 'Error';
            this.addLog(media, `Process Error: ${error}`);
            this.renderUI();
        }
    }
}
