export class ProfileTab {
    constructor({ onTokenUpdate, initialToken, initialEmail }) {
        this.onTokenUpdate = onTokenUpdate;
        this.token = initialToken || '';
        this.email = initialEmail || '';
        this.apiUrl = 'https://api.cloudflare.com/client/v4';
        
        this.state = {
            loading: false,
            error: null,
            user: null,
            accounts: []
        };
    }

    render(container) {
        this.container = container;
        this.renderUI();
        
        // If we have a token but no data, fetch it
        if (this.token && !this.state.user && !this.state.loading) {
            this.verifyToken();
        }
    }

    renderUI() {
        if (!this.container) return;

        const { loading, error, user, accounts } = this.state;
        const isConnected = !!this.token && !!user;

        this.container.innerHTML = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="margin-top: 0;">Cloudflare Authentication</h2>
                
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">API Token</label>
                        <input type="password" id="cf-token-input" value="${this.token}" 
                            placeholder="Enter your Cloudflare API Token"
                            style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <small style="color: #666;">Create a token with 'Zone:Read' and 'Account:Read' permissions.</small>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Email (Optional)</label>
                        <input type="text" id="cf-email-input" value="${this.email}" 
                            placeholder="Associated Email (if required)"
                            style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                    </div>

                    <button id="cf-save-btn" style="
                        background: #0066cc; color: white; border: none; padding: 8px 16px; 
                        border-radius: 4px; cursor: pointer; font-weight: bold;
                    ">
                        ${loading ? 'Verifying...' : (isConnected ? 'Update Credentials' : 'Connect')}
                    </button>
                    
                    ${isConnected ? `
                        <button id="cf-disconnect-btn" style="
                            background: #cc0000; color: white; border: none; padding: 8px 16px; 
                            border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 10px;
                        ">Disconnect</button>
                    ` : ''}
                </div>

                ${error ? `
                    <div style="margin-top: 20px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px;">
                        ${error}
                    </div>
                ` : ''}

                ${isConnected ? `
                    <div style="margin-top: 20px;">
                        <h3>User Profile</h3>
                        <div style="background: white; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
                            <p><strong>ID:</strong> ${user.id}</p>
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Name:</strong> ${user.first_name || ''} ${user.last_name || ''}</p>
                        </div>

                        <h3>Accounts</h3>
                        <div style="display: grid; gap: 10px;">
                            ${accounts.map(acc => `
                                <div style="background: white; border: 1px solid #eee; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                                    <span>${acc.name}</span>
                                    <span style="color: #666; font-size: 0.9em;">${acc.id}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const saveBtn = this.container.querySelector('#cf-save-btn');
        const disconnectBtn = this.container.querySelector('#cf-disconnect-btn');
        const tokenInput = this.container.querySelector('#cf-token-input');
        const emailInput = this.container.querySelector('#cf-email-input');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const token = tokenInput.value.trim();
                const email = emailInput.value.trim();
                if (!token) return;
                
                this.token = token;
                this.email = email;
                this.verifyToken();
            });
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.token = '';
                this.email = '';
                this.state.user = null;
                this.state.accounts = [];
                this.onTokenUpdate('', '');
                this.renderUI();
            });
        }
    }

    async verifyToken() {
        this.state.loading = true;
        this.state.error = null;
        this.renderUI();

        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            };
            if (this.email) {
                headers['X-Auth-Email'] = this.email;
                headers['X-Auth-Key'] = this.token;
                delete headers['Authorization'];
            }

            const res = await fetch(`${this.apiUrl}/user`, { headers });
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.errors[0]?.message || 'Verification failed');
            }

            this.state.user = data.result;
            
            // Fetch Accounts too
            const accRes = await fetch(`${this.apiUrl}/accounts`, { headers });
            const accData = await accRes.json();
            if (accData.success) {
                this.state.accounts = accData.result;
            }

            this.onTokenUpdate(this.token, this.email);
        } catch (err) {
            this.state.error = err.message;
            this.state.user = null;
            this.state.accounts = [];
        } finally {
            this.state.loading = false;
            this.renderUI();
        }
    }
}
