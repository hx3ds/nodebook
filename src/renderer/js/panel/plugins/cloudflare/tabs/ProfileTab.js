import { cfFetch } from '../utils.js';
import { UI } from '../../../ui/index.js';

export class ProfileTab {
    constructor({ onUpdate, token, email }) {
        this.onUpdate = onUpdate;
        this.token = token || '';
        this.email = email || '';
        this.state = { loading: false, error: null, user: null, accounts: [] };
    }

    updateCredentials({ token, email }) {
        this.token = token; this.email = email;
        if (this.token && !this.state.user) this.verifyToken();
        else if (!this.token) {
            this.state.user = null;
            this.state.accounts = [];
            this.renderUI();
        }
    }

    render(container) {
        this.container = container;
        this.renderUI();
        if (this.token && !this.state.user && !this.state.loading) this.verifyToken();
    }

    renderUI() {
        if (!this.container) return;
        const { loading, error, user, accounts } = this.state;
        const isConnected = !!this.token && !!user;

        this.container.innerHTML = `
            ${UI.Header({ title: 'Authentication' })}
            <div class="ui-content padded">
                ${UI.FormGroup({
                    label: 'API Token',
                    control: UI.Input({ id: 'cf-token', value: this.token, type: 'password', placeholder: 'Enter your Cloudflare API Token' })
                })}
                ${UI.FormGroup({
                    label: 'Email (Optional)',
                    control: UI.Input({ id: 'cf-email', value: this.email, placeholder: 'Required only for Global API Key' })
                })}
                <div class="ui-flex-row">
                    ${UI.Button({ 
                        id: 'cf-save', 
                        label: loading ? 'Verifying...' : (isConnected ? 'Update Credentials' : 'Connect Account'),
                        variant: 'primary',
                        style: 'width:auto'
                    })}
                    ${isConnected ? UI.Button({ id: 'cf-disc', label: 'Disconnect', variant: 'danger', style: 'width:auto' }) : ''}
                </div>
                
                ${error ? UI.Error({ message: error }) : ''}
                
                ${isConnected ? this.renderProfile(user, accounts) : ''}
            </div>`;

        this.container.querySelector('#cf-save')?.addEventListener('click', () => {
            this.token = this.container.querySelector('#cf-token').value.trim();
            this.email = this.container.querySelector('#cf-email').value.trim();
            if (this.token) this.verifyToken();
        });

        this.container.querySelector('#cf-disc')?.addEventListener('click', () => {
            this.token = ''; this.email = '';
            this.state.user = null; this.state.accounts = [];
            this.onUpdate('', '');
            this.renderUI();
        });
    }

    renderProfile(user, accounts) {
        return `
            <div class="ui-mt-2" style="border-top:1px solid #eee;padding-top:20px">
                <h3 class="ui-label" style="font-size:14px;margin-bottom:10px">User Profile</h3>
                ${UI.ListItem({
                    id: 'user-profile',
                    title: `${user.first_name || ''} ${user.last_name || ''}`,
                    subtitle: `ID: ${user.id} | ${user.email}`,
                    badge: UI.Badge({ label: 'Connected', variant: 'success' })
                })}
                
                <h3 class="ui-label" style="font-size:14px;margin:20px 0 10px">Available Accounts</h3>
                <div style="display:flex;flex-direction:column">
                    ${accounts.map(acc => UI.ListItem({
                        id: acc.id,
                        title: acc.name,
                        subtitle: acc.id
                    })).join('')}
                </div>
            </div>`;
    }

    async verifyToken() {
        this.state.loading = true; this.state.error = null; this.renderUI();
        try {
            this.state.user = await cfFetch(this.token, this.email, '/user');
            this.state.accounts = await cfFetch(this.token, this.email, '/accounts');
            this.onUpdate(this.token, this.email);
        } catch (err) {
            this.state.error = err.message;
            this.state.user = null;
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }
}
