export async function cfFetch(token, email, endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    
    // Determine auth method:
    // Global API Key is 37 chars hex. API Token is 40 chars.
    // If email is provided AND token looks like a Global Key (37 chars), use Key auth.
    // Otherwise, prefer Bearer Token auth (even if email is present).
    const isGlobalKey = email && token && token.length === 37 && /^[a-f0-9]+$/i.test(token);

    if (isGlobalKey) {
        headers['X-Auth-Email'] = email;
        headers['X-Auth-Key'] = token;
    } else {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const res = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.errors?.[0]?.message || 'Unknown error');
        }
        return data.result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
}
