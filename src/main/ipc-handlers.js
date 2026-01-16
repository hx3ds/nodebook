const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const { getMainWindow } = require('./window');

const activeProcesses = new Map();

function getSnapshotsRootDir(sourcePath) {
    return path.join(sourcePath, '.nodebook', 'snapshots');
}

function getSnapshotDir(sourcePath, snapshotId) {
    return path.join(getSnapshotsRootDir(sourcePath), snapshotId);
}

function getSnapshotsConfigPath(sourcePath) {
    return path.join(getSnapshotsRootDir(sourcePath), 'config.json');
}

async function safeMkdir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function pathExists(p) {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

function isInsideDir(parentDir, candidatePath) {
    const parent = path.resolve(parentDir) + path.sep;
    const child = path.resolve(candidatePath) + path.sep;
    return child.startsWith(parent);
}

function createIgnorePredicate(ignoreRoots) {
    const roots = (ignoreRoots || []).map(r => path.resolve(r) + path.sep);
    return (candidate) => {
        const full = path.resolve(candidate);
        return roots.some(root => (full + path.sep).startsWith(root) || full === root.slice(0, -1));
    };
}

async function copyDir(src, dest, { shouldIgnore } = {}) {
    if (typeof fs.cp === 'function') {
        await fs.cp(src, dest, {
            recursive: true,
            preserveTimestamps: true,
            filter: (source) => {
                if (!shouldIgnore) return true;
                return !shouldIgnore(source);
            }
        });
        return;
    }

    await safeMkdir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);

        if (shouldIgnore && shouldIgnore(from)) continue;

        if (entry.isDirectory()) {
            await copyDir(from, to, { shouldIgnore });
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await fs.readlink(from);
            await fs.symlink(linkTarget, to);
        } else {
            await safeMkdir(path.dirname(to));
            await fs.copyFile(from, to);
        }
    }
}

async function copyDirContents(srcDir, destDir, { shouldIgnore } = {}) {
    await safeMkdir(destDir);

    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const from = path.join(srcDir, entry.name);
        const to = path.join(destDir, entry.name);

        if (shouldIgnore && shouldIgnore(from)) continue;

        if (entry.isDirectory()) {
            await copyDir(from, to, { shouldIgnore });
        } else if (entry.isSymbolicLink()) {
            const linkTarget = await fs.readlink(from);
            await fs.symlink(linkTarget, to);
        } else {
            await safeMkdir(path.dirname(to));
            await fs.copyFile(from, to);
        }
    }
}

function makeSnapshotId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function requireDirectory(p) {
    const stats = await fs.stat(p);
    if (!stats.isDirectory()) throw new Error('Path is not a directory');
}

async function loadSnapshotMeta(snapshotDir) {
    const metaPath = path.join(snapshotDir, 'meta.json');
    const raw = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(raw);
}

async function saveSnapshotMeta(snapshotDir, meta) {
    const metaPath = path.join(snapshotDir, 'meta.json');
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

async function readSnapshotsConfig(sourcePath) {
    const defaultConfig = { maxSnapshots: 20 };
    const configPath = getSnapshotsConfigPath(sourcePath);
    try {
        const raw = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const maxSnapshots = Number.isFinite(parsed.maxSnapshots) ? parsed.maxSnapshots : parseInt(parsed.maxSnapshots, 10);
        if (Number.isFinite(maxSnapshots) && maxSnapshots >= 1) {
            return { maxSnapshots };
        }
        return defaultConfig;
    } catch {
        return defaultConfig;
    }
}

async function writeSnapshotsConfig(sourcePath, nextConfig) {
    const rootDir = getSnapshotsRootDir(sourcePath);
    await safeMkdir(rootDir);
    const configPath = getSnapshotsConfigPath(sourcePath);
    await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2), 'utf-8');
}

async function listSnapshotsInternal(sourcePath) {
    const rootDir = getSnapshotsRootDir(sourcePath);
    if (!(await pathExists(rootDir))) return [];

    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    const snapshots = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const snapshotDir = path.join(rootDir, entry.name);
        if (!isInsideDir(rootDir, snapshotDir)) continue;

        try {
            const meta = await loadSnapshotMeta(snapshotDir);
            if (meta && meta.sourcePath === sourcePath) snapshots.push(meta);
        } catch {
            continue;
        }
    }

    snapshots.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return snapshots;
}

async function enforceSnapshotRetention(sourcePath) {
    const { maxSnapshots } = await readSnapshotsConfig(sourcePath);
    const snapshots = await listSnapshotsInternal(sourcePath);
    if (snapshots.length <= maxSnapshots) return;

    const rootDir = getSnapshotsRootDir(sourcePath);
    const toDelete = snapshots.slice(maxSnapshots);
    for (const snap of toDelete) {
        if (!snap || !snap.id) continue;
        const snapshotDir = path.join(rootDir, snap.id);
        if (!isInsideDir(rootDir, snapshotDir)) continue;
        await fs.rm(snapshotDir, { recursive: true, force: true });
    }
}

function setupIpcHandlers() {
    // Dialog handlers
    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(getMainWindow(), options);
        return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
        const result = await dialog.showOpenDialog(getMainWindow(), options);
        return result;
    });

    // File I/O handlers
    ipcMain.handle('write-file', async (event, filePath, data) => {
        if (data && typeof data === 'object' && !Array.isArray(data) && data.byteLength !== undefined) {
            await fs.writeFile(filePath, Buffer.from(data));
        } else if (Array.isArray(data)) {
            await fs.writeFile(filePath, Buffer.from(data));
        } else {
            await fs.writeFile(filePath, data, 'utf-8');
        }
    });

    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return data;
        } catch (error) {
            console.error('Error reading file:', error);
            throw error;
        }
    });

    // File System Operations for File Explorer
    ipcMain.handle('read-directory', async (event, dirPath) => {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const items = await Promise.all(
                entries.map(async (entry) => {
                    const fullPath = path.join(dirPath, entry.name);
                    const stats = await fs.stat(fullPath);
                    return {
                        name: entry.name,
                        path: fullPath,
                        isDirectory: entry.isDirectory(),
                        size: stats.size,
                        modified: stats.mtime
                    };
                })
            );
            return items;
        } catch (error) {
            console.error('Error reading directory:', error);
            throw error;
        }
    });

    ipcMain.handle('create-file', async (event, parentDir, fileName, content = '') => {
        try {
            const filePath = path.join(parentDir, fileName);
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true, path: filePath };
        } catch (error) {
            console.error('Error creating file:', error);
            throw error;
        }
    });

    ipcMain.handle('create-directory', async (event, parentDir, folderName) => {
        try {
            const dirPath = path.join(parentDir, folderName);
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true, path: dirPath };
        } catch (error) {
            console.error('Error creating directory:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-path', async (event, targetPath) => {
        try {
            const stats = await fs.stat(targetPath);
            if (stats.isDirectory()) {
                await fs.rm(targetPath, { recursive: true, force: true });
            } else {
                await fs.unlink(targetPath);
            }
            return { success: true };
        } catch (error) {
            console.error('Error deleting path:', error);
            throw error;
        }
    });

    ipcMain.handle('rename-path', async (event, oldPath, newPath) => {
        try {
            await fs.rename(oldPath, newPath);
            return { success: true };
        } catch (error) {
            console.error('Error renaming path:', error);
            throw error;
        }
    });

    ipcMain.handle('path-exists', async (event, targetPath) => {
        try {
            await fs.access(targetPath);
            return true;
        } catch {
            return false;
        }
    });

    ipcMain.handle('snapshot-create', async (event, sourcePath) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        await requireDirectory(sourcePath);

        const snapshotsRoot = getSnapshotsRootDir(sourcePath);
        await safeMkdir(snapshotsRoot);

        const snapshotId = makeSnapshotId();
        const snapshotDir = getSnapshotDir(sourcePath, snapshotId);
        if (!isInsideDir(snapshotsRoot, snapshotDir)) throw new Error('Invalid snapshot path');

        const filesDir = path.join(snapshotDir, 'files');
        await safeMkdir(filesDir);

        const meta = {
            id: snapshotId,
            sourcePath,
            folderName: path.basename(sourcePath),
            createdAt: Date.now(),
            label: ''
        };

        await saveSnapshotMeta(snapshotDir, meta);
        const ignore = createIgnorePredicate([path.join(sourcePath, '.nodebook')]);
        await copyDirContents(sourcePath, filesDir, { shouldIgnore: ignore });
        await enforceSnapshotRetention(sourcePath);

        return meta;
    });

    ipcMain.handle('snapshot-list', async (event, sourcePath) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        return await listSnapshotsInternal(sourcePath);
    });

    ipcMain.handle('snapshot-get-config', async (event, sourcePath) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        return await readSnapshotsConfig(sourcePath);
    });

    ipcMain.handle('snapshot-set-config', async (event, sourcePath, config) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        if (!config || typeof config !== 'object') throw new Error('Invalid config');

        const maxSnapshots = Number.isFinite(config.maxSnapshots) ? config.maxSnapshots : parseInt(config.maxSnapshots, 10);
        if (!Number.isFinite(maxSnapshots) || maxSnapshots < 1 || maxSnapshots > 500) {
            throw new Error('Invalid maxSnapshots');
        }

        const nextConfig = { maxSnapshots: Math.floor(maxSnapshots) };
        await writeSnapshotsConfig(sourcePath, nextConfig);
        await enforceSnapshotRetention(sourcePath);
        return nextConfig;
    });

    ipcMain.handle('snapshot-delete', async (event, sourcePath, snapshotId) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        if (!snapshotId || typeof snapshotId !== 'string') throw new Error('Invalid snapshot id');

        const snapshotDir = getSnapshotDir(sourcePath, snapshotId);
        const snapshotsRoot = getSnapshotsRootDir(sourcePath);
        if (!isInsideDir(snapshotsRoot, snapshotDir)) throw new Error('Invalid snapshot path');

        if (await pathExists(snapshotDir)) {
            await fs.rm(snapshotDir, { recursive: true, force: true });
        }
        return { success: true };
    });

    ipcMain.handle('snapshot-update', async (event, sourcePath, snapshotId, patch) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        if (!snapshotId || typeof snapshotId !== 'string') throw new Error('Invalid snapshot id');
        if (!patch || typeof patch !== 'object') throw new Error('Invalid patch');

        const snapshotDir = getSnapshotDir(sourcePath, snapshotId);
        const snapshotsRoot = getSnapshotsRootDir(sourcePath);
        if (!isInsideDir(snapshotsRoot, snapshotDir)) throw new Error('Invalid snapshot path');

        const meta = await loadSnapshotMeta(snapshotDir);
        if (typeof patch.label === 'string') meta.label = patch.label;
        await saveSnapshotMeta(snapshotDir, meta);
        return meta;
    });

    ipcMain.handle('snapshot-restore', async (event, sourcePath, snapshotId) => {
        if (!sourcePath || typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
            throw new Error('Invalid folder path');
        }
        if (!snapshotId || typeof snapshotId !== 'string') throw new Error('Invalid snapshot id');

        const snapshotDir = getSnapshotDir(sourcePath, snapshotId);
        const snapshotsRoot = getSnapshotsRootDir(sourcePath);
        if (!isInsideDir(snapshotsRoot, snapshotDir)) throw new Error('Invalid snapshot path');

        const filesDir = path.join(snapshotDir, 'files');
        await requireDirectory(filesDir);

        const baseName = path.basename(sourcePath);
        const parentDir = path.dirname(sourcePath);
        let restorePath = path.join(parentDir, `${baseName}-restored-${snapshotId}`);

        let i = 1;
        while (await pathExists(restorePath)) {
            restorePath = path.join(parentDir, `${baseName}-restored-${snapshotId}-${i}`);
            i += 1;
        }

        await safeMkdir(restorePath);
        await copyDir(filesDir, restorePath);

        return { restoredPath: restorePath };
    });

    // Process execution
    ipcMain.handle('exec-command', (event, command) => {
        return new Promise((resolve) => {
            exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                resolve({ 
                    error: error ? error.message : null, 
                    stdout, 
                    stderr,
                    code: error ? error.code : 0
                });
            });
        });
    });

    ipcMain.handle('spawn-command', (event, id, command, args) => {
        try {
            // shell: true allows running command as typed in shell, 
            // helpful for resolving PATH but args need to be handled carefully if shell:true
            const child = spawn(command, args, { shell: true });
            
            activeProcesses.set(id, child);

            child.stdout.on('data', (data) => {
                event.sender.send('process-event', { id, type: 'stdout', data: data.toString() });
            });

            child.stderr.on('data', (data) => {
                event.sender.send('process-event', { id, type: 'stderr', data: data.toString() });
            });

            child.on('close', (code) => {
                event.sender.send('process-event', { id, type: 'close', code });
                activeProcesses.delete(id);
            });
            
            child.on('error', (err) => {
                event.sender.send('process-event', { id, type: 'error', error: err.message });
                activeProcesses.delete(id);
            });

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('kill-process', (event, id) => {
        const child = activeProcesses.get(id);
        if (child) {
            child.kill();
            activeProcesses.delete(id);
            return { success: true };
        }
        return { success: false, error: 'Process not found' };
    });
}

module.exports = { setupIpcHandlers };
