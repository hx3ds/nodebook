
export const mesh = {
    BASE_URL: 'http://localhost:8001/mesh',
    LOCK_URL: 'http://localhost:8001/lock',
    UNLOCK_URL: 'http://localhost:8001/unlock',
    LOCKS_URL: 'http://localhost:8001/locks',
    WS_URL: 'ws://localhost:8001/ws',

    isMeshPath(path) {
        return path && path.startsWith('mesh://');
    },

    getSubPath(path) {
        return path.replace('mesh://', '');
    },

    _encodeSubPathForUrl(subPath) {
        const normalized = String(subPath || '').replace(/\\/g, '/');
        return normalized
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/');
    },

    async readDirectory(path) {
        let url = this.BASE_URL;
        const sub = this.getSubPath(path);
        if (sub) {
            url += '/' + this._encodeSubPathForUrl(sub);
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch mesh data');
        return await res.json();
    },

    async readFile(path) {
        const subPath = this.getSubPath(path);
        const res = await fetch(this.BASE_URL + '/' + this._encodeSubPathForUrl(subPath));
        if(!res.ok) throw new Error('Failed to read file');
        return await res.text();
    },

    async writeFile(path, content) {
        const sub = this.getSubPath(path);
        const res = await fetch(this.BASE_URL + '/' + this._encodeSubPathForUrl(sub), {
            method: 'POST',
            body: content
        });
        if(!res.ok) throw new Error('Failed to save');
        return res;
    },

    async createDirectory(path) {
        const sub = this.getSubPath(path);
        const res = await fetch(this.BASE_URL + '/' + this._encodeSubPathForUrl(sub) + '?type=directory', {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Failed to create folder');
        return res;
    },

    async deletePath(path) {
        const subPath = this.getSubPath(path);
        const res = await fetch(this.BASE_URL + '/' + this._encodeSubPathForUrl(subPath), {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete');
        return res;
    },

    async acquireLock(path, itemId, userId) {
        const currentFile = this.getSubPath(path);
        const res = await fetch(this.LOCK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: currentFile,
                itemId: String(itemId),
                clientId: userId
            })
        });
        return res;
    },

    async releaseLock(path, itemId, userId) {
        const currentFile = this.getSubPath(path);
        await fetch(this.UNLOCK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: currentFile,
                itemId: String(itemId),
                clientId: userId
            })
        });
    },

    async fetchLocks(path) {
        const subPath = this.getSubPath(path);
        const url = `${this.LOCKS_URL}?path=${encodeURIComponent(subPath)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch locks');
        return await res.json();
    },
    
    async renameFile(oldPath, newPath) {
        // Mesh currently doesn't support rename directly, so we copy (read+write) then delete
        const content = await this.readFile(oldPath);
        await this.writeFile(newPath, content);
        
        // Only delete if write was successful (writeFile throws if not ok)
        // Note: In the original code, it warns if delete fails but doesn't throw.
        try {
            await this.deletePath(oldPath);
        } catch (e) {
            console.warn('Failed to delete old file after rename', e);
        }
    }
};
