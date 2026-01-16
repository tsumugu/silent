import ElectronStore from 'electron-store';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

interface CacheMetadata {
    key: string;
    expiresAt: number;
    type: 'metadata' | 'image';
    filePath?: string;
}

interface CacheStore {
    items: Record<string, CacheMetadata>;
}

export class CacheService {
    private store: ElectronStore<CacheStore>;
    private cacheDir: string;

    constructor() {
        this.store = new ElectronStore<CacheStore>({
            name: 'cache-index',
            defaults: { items: {} }
        });
        this.cacheDir = path.join(app.getPath('userData'), 'silent_persistent_cache');
        this.ensureCacheDirSync();
    }

    private ensureCacheDirSync() {
        try {
            if (!existsSync(this.cacheDir)) {
                mkdirSync(this.cacheDir, { recursive: true });
            }
        } catch (e) {
            console.error('[CacheService] Failed to create cache dir:', e);
        }
    }

    private async ensureCacheDir() {
        // Kept for backward compatibility in usage, but now just calls sync version
        this.ensureCacheDirSync();
    }

    private getHash(key: string): string {
        return crypto.createHash('md5').update(key).digest('hex');
    }

    /**
     * Store metadata (JSON) in the cache
     */
    async setMetadata(key: string, data: any, ttlMs: number = 24 * 60 * 60 * 1000) {
        const hash = this.getHash(key);
        const filePath = path.join(this.cacheDir, `${hash}.json`);

        this.ensureCacheDirSync();
        await fs.writeFile(filePath, JSON.stringify(data));

        const items = (this.store as any).get('items');
        items[key] = {
            key,
            expiresAt: Date.now() + ttlMs,
            type: 'metadata',
            filePath
        };
        (this.store as any).set('items', items);
    }

    /**
     * Get metadata from cache
     */
    async getMetadata<T>(key: string): Promise<T | null> {
        const items = (this.store as any).get('items');
        const entry = items[key];

        if (!entry || entry.expiresAt < Date.now()) {
            if (entry) await this.deleteEntry(key);
            return null;
        }

        try {
            if (entry.filePath && existsSync(entry.filePath)) {
                const content = await fs.readFile(entry.filePath, 'utf-8');
                return JSON.parse(content) as T;
            }
        } catch (err) {
            console.error('[CacheService] Failed to read metadata cache:', err);
        }
        return null;
    }

    /**
     * Store image (Data URL or Buffer) in cache
     */
    async setImage(url: string, data: string, ttlMs: number = 3 * 24 * 60 * 60 * 1000) {
        const hash = this.getHash(url);
        // Use a safe fixed extension or no extension to avoid slashes in filename
        const filePath = path.join(this.cacheDir, `${hash}.img`);

        this.ensureCacheDirSync();
        await fs.writeFile(filePath, data);

        const items = (this.store as any).get('items');
        items[url] = {
            key: url,
            expiresAt: Date.now() + ttlMs,
            type: 'image',
            filePath
        };
        (this.store as any).set('items', items);
    }

    /**
     * Get image from cache
     */
    async getImage(url: string): Promise<string | null> {
        const items = (this.store as any).get('items');
        const entry = items[url];

        if (!entry || entry.expiresAt < Date.now()) {
            if (entry) await this.deleteEntry(url);
            return null;
        }

        try {
            if (entry.filePath && existsSync(entry.filePath)) {
                return await fs.readFile(entry.filePath, 'utf-8');
            }
        } catch (err) {
            console.error('[CacheService] Failed to read image cache:', err);
        }
        return null;
    }

    async deleteMetadata(key: string) {
        await this.deleteEntry(key);
    }

    async deleteByPrefix(prefix: string) {
        const items = (this.store as any).get('items');
        const keysToDelete = Object.keys(items).filter(key => key.startsWith(prefix));

        for (const key of keysToDelete) {
            await this.deleteEntry(key);
        }
    }

    private async deleteEntry(key: string) {
        const items = (this.store as any).get('items');
        const entry = items[key];
        if (entry && entry.filePath && existsSync(entry.filePath)) {
            try {
                await fs.unlink(entry.filePath);
            } catch (e) { /* ignore */ }
        }
        delete items[key];
        (this.store as any).set('items', items);
    }

    async clearAll() {
        try {
            if (existsSync(this.cacheDir)) {
                const files = await fs.readdir(this.cacheDir);
                for (const file of files) {
                    await fs.unlink(path.join(this.cacheDir, file));
                }
            }
            (this.store as any).set('items', {});
        } catch (err) {
            console.error('[CacheService] Failed to clear cache:', err);
        }
    }

    async getCacheSize(): Promise<number> {
        let totalSize = 0;
        try {
            if (existsSync(this.cacheDir)) {
                const files = await fs.readdir(this.cacheDir);
                for (const file of files) {
                    const stats = await fs.stat(path.join(this.cacheDir, file));
                    totalSize += stats.size;
                }
            }
        } catch (err) {
            console.error('[CacheService] Failed to get cache size:', err);
        }
        return totalSize;
    }
}

export const cacheService = new CacheService();
