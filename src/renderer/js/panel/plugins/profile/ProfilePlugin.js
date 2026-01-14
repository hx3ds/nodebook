export class ProfilePlugin {
    constructor() {
        this.id = 'profile';
        this.name = 'Profile';
        this.user = null;
    }

    getNavigationItems() {
        return [
            { id: 'login', label: 'Login / Profile' },
            { id: 'settings', label: 'Settings' }
        ];
    }

    renderTab(navId, container) {
        container.innerHTML = '';
        container.style.padding = '20px';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-start';
        container.style.color = '#333'; // Default text color

        if (navId === 'login') {
            this.renderLogin(container);
        } else if (navId === 'settings') {
            this.renderSettings(container);
        }
    }

    async renderLogin(container) {
        // Check if already logged in
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.renderProfile(container);
                return;
            } catch (e) {
                console.error("Invalid user data", e);
                localStorage.removeItem('user');
            }
        }

        container.innerHTML = '<h2>Login</h2><p>Loading configuration...</p>';

        let botUsername = null;
        try {
            const res = await fetch('http://localhost:8001/auth/config');
            if (res.ok) {
                const config = await res.json();
                botUsername = config.bot_username;
            }
        } catch (e) {
            console.warn("Backend seems offline or unreachable for config:", e);
        }

        container.innerHTML = '';
        const title = document.createElement('h2');
        title.textContent = 'Login';
        container.appendChild(title);

        // Email Login section
        const emailTitle = document.createElement('h3');
        emailTitle.textContent = 'Via Email';
        emailTitle.style.marginTop = '20px';
        container.appendChild(emailTitle);
        this.renderEmailLogin(container);

        // Separator
        const sep = document.createElement('div');
        sep.style.margin = '20px 0';
        sep.style.borderTop = '1px solid #ccc';
        container.appendChild(sep);

        // Telegram Login section
        const tgTitle = document.createElement('h3');
        tgTitle.textContent = 'Via Telegram';
        container.appendChild(tgTitle);
        
        if (botUsername) {
            this.renderTelegramLogin(container, botUsername);
        } else {
             const errorMsg = document.createElement('div');
             errorMsg.style.color = '#666';
             errorMsg.style.marginTop = '10px';
             errorMsg.textContent = 'Telegram login unavailable (Backend unreachable)';
             container.appendChild(errorMsg);
        }

        // Dev Login (Auto-added)
        const devSep = document.createElement('div');
        devSep.style.margin = '20px 0';
        devSep.style.borderTop = '1px solid #ccc';
        container.appendChild(devSep);

        const devBtn = document.createElement('button');
        devBtn.textContent = 'Dev Login';
        devBtn.style.padding = '8px 16px';
        devBtn.style.cursor = 'pointer';
        devBtn.style.backgroundColor = '#607d8b';
        devBtn.style.color = 'white';
        devBtn.style.border = 'none';
        devBtn.style.borderRadius = '4px';
        devBtn.onclick = () => {
            const devUser = {
                id: 1,
                name: 'DevUser',
                email: 'dev@nodebook.local'
            };
            const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkRldlVzZXIiLCJpYXQiOjE3NjY1NjYzODd9.TTH0FqwGEzoG6dE35V2KH71tkftGQSx7iqtvgBAQApg';
            
            this.handleLoginSuccess({ user: devUser, token: devToken }, container);
        };
        container.appendChild(devBtn);
    }

    renderEmailLogin(container) {
        const wrapper = document.createElement('div');
        
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Enter your email';
        emailInput.style.padding = '8px';
        emailInput.style.marginRight = '10px';
        emailInput.style.borderRadius = '4px';
        emailInput.style.border = '1px solid #ccc';
        
        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send Code';
        sendBtn.style.padding = '8px 16px';
        sendBtn.style.cursor = 'pointer';
        sendBtn.style.backgroundColor = '#4CAF50';
        sendBtn.style.color = 'white';
        sendBtn.style.border = 'none';
        sendBtn.style.borderRadius = '4px';
        
        const codeContainer = document.createElement('div');
        codeContainer.style.marginTop = '10px';
        codeContainer.style.display = 'none';

        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.placeholder = 'Enter verification code';
        codeInput.style.padding = '8px';
        codeInput.style.marginRight = '10px';
        codeInput.style.borderRadius = '4px';
        codeInput.style.border = '1px solid #ccc';
        
        const verifyBtn = document.createElement('button');
        verifyBtn.textContent = 'Verify';
        verifyBtn.style.padding = '8px 16px';
        verifyBtn.style.cursor = 'pointer';
        verifyBtn.style.backgroundColor = '#2196F3';
        verifyBtn.style.color = 'white';
        verifyBtn.style.border = 'none';
        verifyBtn.style.borderRadius = '4px';
        
        codeContainer.appendChild(codeInput);
        codeContainer.appendChild(verifyBtn);
        
        sendBtn.onclick = async () => {
            const email = emailInput.value;
            if(!email) return alert('Please enter email');
            
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            
            try {
                const res = await fetch('http://localhost:8001/auth/email/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email})
                });
                if(!res.ok) throw new Error('Failed to send code (Backend offline?)');
                
                alert('Code sent to ' + email);
                codeContainer.style.display = 'block';
                emailInput.disabled = true;
                sendBtn.textContent = 'Sent';
            } catch (e) {
                alert(e.message);
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Code';
            }
        };
        
        verifyBtn.onclick = async () => {
            const email = emailInput.value;
            const code = codeInput.value;
            if(!code) return alert('Please enter code');
            
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying...';
            
            try {
                const res = await fetch('http://localhost:8001/auth/email/verify', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, code})
                });
                
                if(!res.ok) {
                    const err = await res.text();
                    throw new Error(err || 'Invalid code');
                }
                
                const data = await res.json();
                this.handleLoginSuccess(data, container);
            } catch (e) {
                alert(e.message);
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify';
            }
        };
        
        wrapper.appendChild(emailInput);
        wrapper.appendChild(sendBtn);
        wrapper.appendChild(codeContainer);
        container.appendChild(wrapper);
    }

    renderTelegramLogin(container, botUsername) {
        const wrapper = document.createElement('div');
        wrapper.id = 'telegram-login-wrapper';
        container.appendChild(wrapper);
        
        // Define global callback
        window.onTelegramAuth = async (user) => {
            try {
                const res = await fetch('http://localhost:8001/auth/telegram/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(user)
                });
                if(!res.ok) throw new Error('Login failed (Backend offline?)');
                
                const data = await res.json();
                this.handleLoginSuccess(data, container);
            } catch (e) {
                alert(e.message);
            }
        };
        
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.async = true;
        
        wrapper.appendChild(script);
    }
    
    handleLoginSuccess(data, container) {
        this.user = data.user;
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Update room user ID to match logged in user
        if (window.room) {
            window.room.updateUserId();
        }
        
        this.renderProfile(container);
    }
    
    renderProfile(container) {
        container.innerHTML = '';
        const title = document.createElement('h2');
        title.textContent = 'Profile';
        container.appendChild(title);
        
        const info = document.createElement('div');
        const emailDisplay = this.user.email ? `<div style="color: #666;">${this.user.email}</div>` : '';
        const telegramDisplay = this.user.telegram_id ? `<div style="color: #666;">Telegram ID: ${this.user.telegram_id}</div>` : '';
        const avatar = this.user.avatar_url || 'https://via.placeholder.com/50';

        info.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 20px;">
                <img src="${avatar}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                <div>
                    <div style="font-weight: bold; font-size: 1.1em;">${this.user.name || 'User'}</div>
                    ${emailDisplay}
                    ${telegramDisplay}
                </div>
            </div>
        `;
        container.appendChild(info);
        
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.marginTop = '30px';
        logoutBtn.style.padding = '8px 16px';
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.style.backgroundColor = '#f44336';
        logoutBtn.style.color = 'white';
        logoutBtn.style.border = 'none';
        logoutBtn.style.borderRadius = '4px';
        
        logoutBtn.onclick = () => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            this.user = null;
            
            // Revert room user ID to device ID
            if (window.room) {
                window.room.updateUserId();
            }

            container.innerHTML = ''; // Clear
            this.renderLogin(container);
        };
        container.appendChild(logoutBtn);
    }

    renderSettings(container) {
        const title = document.createElement('h2');
        title.textContent = 'Settings';
        container.appendChild(title);

        const content = document.createElement('div');
        content.style.marginTop = '20px';
        content.textContent = 'Nodebook-wide settings will go here.';
        container.appendChild(content);
    }
}
