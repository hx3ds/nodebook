
export class ProfileManager {
    constructor(container, callbacks) {
        this.container = container;
        this.onTokenUpdate = callbacks.onTokenUpdate || (() => {});
        
        this.apiUrl = 'https://api.cloudflare.com/client/v4';
        
        // State
        this.localToken = '';
        this.localEmail = '';
        this.userProfile = null;
        this.accounts = [];
        this.loading = false;
        this.error = null;
        this.showToken = false;
        
        this.init();
    }

    init() {
        // Load initial state if available
        this.render();
    }
    
    setCredentials(token, email) {
        this.localToken = token;
        this.localEmail = email;
        if (token) {
            this.fetchProfileData();
        } else {
            this.userProfile = null;
            this.accounts = [];
            this.render();
        }
    }

    getHeaders() {
        if (this.localEmail) {
            return {
                'X-Auth-Email': this.localEmail,
                'X-Auth-Key': this.localToken,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Authorization': `Bearer ${this.localToken}`,
            'Content-Type': 'application/json'
        };
    }

    async fetchProfileData() {
        this.loading = true;
        this.error = null;
        this.render(); // Re-render to show loading state

        try {
            // 1. Fetch User Details
            const userRes = await fetch(`${this.apiUrl}/user`, {
                headers: this.getHeaders()
            });

            if (userRes.ok) {
                const userData = await userRes.json();
                this.userProfile = userData.result;
            } else {
                if (userRes.status === 401 || userRes.status === 403) {
                    throw new Error("Invalid Credentials or insufficient permissions.");
                }
            }

            // 2. Fetch Accounts
            const accountsRes = await fetch(`${this.apiUrl}/accounts`, {
                headers: this.getHeaders()
            });

            if (accountsRes.ok) {
                const accountsData = await accountsRes.json();
                this.accounts = accountsData.result || [];
            }

            // Notify parent
            this.onTokenUpdate(this.localToken, this.localEmail);

        } catch (e) {
            this.error = e.message;
            console.error("Profile fetch error:", e);
        } finally {
            this.loading = false;
            this.render();
        }
    }

    saveToken() {
        const emailInput = this.container.querySelector('#profile-email');
        const tokenInput = this.container.querySelector('#profile-api-token');
        
        if (tokenInput) this.localToken = tokenInput.value.trim();
        if (emailInput) this.localEmail = emailInput.value.trim();
        
        if (!this.localToken) return;
        this.fetchProfileData();
    }

    clearToken() {
        this.localToken = '';
        this.localEmail = '';
        this.userProfile = null;
        this.accounts = [];
        this.onTokenUpdate('', '');
        this.render();
    }

    toggleTokenVisibility() {
        this.showToken = !this.showToken;
        const input = this.container.querySelector('#profile-api-token');
        const btn = this.container.querySelector('#toggle-token-btn');
        if (input) input.type = this.showToken ? 'text' : 'password';
        if (btn) btn.textContent = this.showToken ? 'Hide' : 'Show';
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="profile-layout animate-in">
                <!-- Token Management Section -->
                <div class="holo-card profile-auth-card">
                    <h3 class="panel-section-title section-header">
                        <span class="status-dot active"></span>
                        Authentication
                    </h3>
                    
                    <div class="auth-form">
                        <div class="form-group">
                            <!-- Email Input -->
                            <label for="profile-email" class="panel-label">Email Address (Optional - For Global API Key)</label>
                            <input 
                                id="profile-email"
                                type="email" 
                                value="${this.localEmail}" 
                                placeholder="email@example.com (Leave empty for API Token)" 
                                class="holo-input w-full"
                            />

                            <label for="profile-api-token" class="panel-label">Cloudflare API Token / Global API Key</label>
                            <div class="token-input-group">
                                <div class="token-input-wrapper">
                                    <input 
                                        id="profile-api-token"
                                        type="${this.showToken ? 'text' : 'password'}" 
                                        value="${this.localToken}" 
                                        placeholder="ENTER_YOUR_API_TOKEN_OR_KEY" 
                                        class="holo-input w-full"
                                    />
                                    <button 
                                        id="toggle-token-btn"
                                        class="token-visibility-toggle"
                                    >
                                        ${this.showToken ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <button 
                                    id="save-token-btn"
                                    class="holo-btn"
                                    ${this.loading ? 'disabled' : ''}
                                >
                                    ${this.loading ? 'Verifying...' : 'Update'}
                                </button>
                                 <button 
                                    id="clear-token-btn"
                                    class="holo-btn-danger"
                                >
                                    Clear
                                </button>
                            </div>
                            <p class="panel-help-text token-help-text">
                                ${this.localEmail 
                                    ? '<span class="text-highlight">Global API Key Mode</span> - Full Account Access' 
                                    : 'API Token Mode - Scoped Access (Recommended)'}
                            </p>
                        </div>
                    </div>

                    ${this.error ? `
                        <div class="error-message">
                            <strong>ERROR:</strong> ${this.error}
                        </div>
                    ` : ''}
                </div>

                <!-- Profile Details -->
                ${this.userProfile ? `
                    <div class="profile-details-grid">
                        <!-- User Info -->
                        <div class="holo-card user-info-card">
                            <h3 class="panel-section-title opacity-70">User Profile</h3>
                            
                            <div class="user-info-list">
                                <div class="info-item">
                                    <span class="panel-label info-label">Email Address</span>
                                    <span class="info-value text-mono">${this.userProfile.email}</span>
                                </div>
                                <div class="info-item">
                                    <span class="panel-label info-label">User ID</span>
                                    <span class="info-value text-primary text-mono text-small">${this.userProfile.id}</span>
                                </div>
                                <div class="info-item">
                                    <span class="panel-label info-label">Account Status</span>
                                    <span class="status-wrapper">
                                         <span class="status-dot ${this.userProfile.suspended ? 'suspended' : 'active'}"></span>
                                         <span class="status-text">${this.userProfile.suspended ? 'Suspended' : 'Active'}</span>
                                    </span>
                                </div>
                                 <div class="info-item">
                                    <span class="panel-label info-label">2FA Enabled</span>
                                    <span class="info-value text-primary text-uppercase">${this.userProfile.two_factor_authentication_enabled ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                        
                         <!-- Accounts List -->
                        <div class="holo-card accounts-card">
                            <h3 class="panel-section-title opacity-70">Accounts (${this.accounts.length})</h3>
                             <div class="accounts-list custom-scrollbar">
                                ${this.accounts.map(acc => `
                                    <div class="account-item">
                                        <div class="account-name">${acc.name}</div>
                                        <div class="account-id">${acc.id}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {
        const saveBtn = this.container.querySelector('#save-token-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => this.saveToken());

        const clearBtn = this.container.querySelector('#clear-token-btn');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearToken());

        const toggleBtn = this.container.querySelector('#toggle-token-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleTokenVisibility());
    }
}
