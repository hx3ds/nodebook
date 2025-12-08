const API_URL = 'https://api.cloudflare.com/client/v4';

const getHeaders = (apiToken, apiEmail) => {
    if (apiEmail) {
        return {
            'X-Auth-Email': apiEmail,
            'X-Auth-Key': apiToken,
            'Content-Type': 'application/json'
        };
    }
    return {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
    };
};

export async function fetchAccounts(apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    
    if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.errors?.[0]?.message || 'Failed to fetch accounts');
    }
    
    const data = await response.json();
    return data.result || [];
}

export async function fetchTunnels(accountId, apiToken, apiEmail, params = {}) {
    const queryParams = new URLSearchParams({
        is_deleted: 'false',
        ...params
    });
    
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel?${queryParams}`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    
    if (!response.ok) throw new Error('Failed to fetch tunnels');
    
    const data = await response.json();
    return data.result || [];
}

export async function getTunnel(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to fetch tunnel');
    const data = await response.json();
    return data.result;
}

export async function createTunnel(accountId, name, apiToken, apiEmail) {
    // Generate a random 32-byte hex string or base64
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    // simple base64 conversion
    const tunnelSecret = btoa(String.fromCharCode.apply(null, randomBytes));

    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel`, {
        method: 'POST',
        headers: getHeaders(apiToken, apiEmail),
        body: JSON.stringify({
            name: name,
            tunnel_secret: tunnelSecret
        })
    });
    
    if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.errors?.[0]?.message || 'Failed to create tunnel');
    }
    
    return await response.json();
}

export async function updateTunnel(accountId, tunnelId, newName, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
        method: 'PATCH',
        headers: getHeaders(apiToken, apiEmail),
        body: JSON.stringify({
            name: newName
        })
    });
    
    if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.errors?.[0]?.message || 'Failed to update tunnel');
    }
    
    return await response.json();
}

export async function deleteTunnel(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}`, {
        method: 'DELETE',
        headers: getHeaders(apiToken, apiEmail)
    });
    
    if (!response.ok) throw new Error('Failed to delete tunnel');
    return true;
}

export async function getTunnelConfiguration(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to fetch configuration');
    const data = await response.json();
    return data.result;
}

export async function updateTunnelConfiguration(accountId, tunnelId, config, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, {
        method: 'PUT',
        headers: getHeaders(apiToken, apiEmail),
        body: JSON.stringify({ config })
    });
    if (!response.ok) throw new Error('Failed to update configuration');
    const data = await response.json();
    return data.result;
}

export async function getTunnelConnections(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to fetch connections');
    const data = await response.json();
    return data.result || [];
}

export async function deleteTunnelConnections(accountId, tunnelId, clientId, apiToken, apiEmail) {
    const query = clientId ? `?client_id=${clientId}` : '';
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections${query}`, {
        method: 'DELETE',
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to delete connections');
    return true;
}

export async function getTunnelConnector(accountId, tunnelId, connectorId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/connectors/${connectorId}`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to fetch connector');
    const data = await response.json();
    return data.result;
}

export async function getManagementToken(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/management`, {
        method: 'POST',
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to get management token');
    const data = await response.json();
    return data.result;
}

export async function getTunnelToken(accountId, tunnelId, apiToken, apiEmail) {
    const response = await fetch(`${API_URL}/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`, {
        headers: getHeaders(apiToken, apiEmail)
    });
    if (!response.ok) throw new Error('Failed to get tunnel token');
    const data = await response.json();
    return data.result;
}
