import { describe, it, expect, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LocalVectorStore, chunkText, indexDirectory } from './vectorStore.js';
import { AIAdapter } from './index.js';

describe('LocalVectorStore', () => {
    const mockAI: AIAdapter = {
        generate: vi.fn(),
        chat: vi.fn(),
        embed: vi.fn(async (text: string) => {
            if (text.includes('apple')) return [1, 0, 0];
            if (text.includes('banana')) return [0, 1, 0];
            if (text.includes('orange')) return [0, 0, 1];
            return [0.5, 0.5, 0.5];
        }),
    };

    it('splits text into overlapping chunks correctly', () => {
        const text = 'abcdefghij'; // 10 chars
        const chunks = chunkText(text, 4, 2);
        expect(chunks).toEqual(['abcd', 'cdef', 'efgh', 'ghij']);

        const shortText = 'abc';
        expect(chunkText(shortText, 4, 2)).toEqual(['abc']);
    });

    it('calculates cosine similarity and returns top matched documents', async () => {
        const store = new LocalVectorStore();
        await store.addDocuments([
            { id: '1', text: 'This is an apple', filePath: 'apple.txt' },
            { id: '2', text: 'This is a banana', filePath: 'banana.txt' },
        ], mockAI);

        const results = await store.query('Show me apple info', mockAI, 1);
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('1');
    });

    it('load/save correctly stores/restores JSON vector data', async () => {
        const tempDbPath = path.join(process.cwd(), 'temp-vector-db.json');
        
        try {
            const store1 = new LocalVectorStore({ dbPath: tempDbPath });
            await store1.addDocuments([
                { id: '1', text: 'apple description', filePath: 'apple.txt' }
            ], mockAI);
            await store1.save();

            const store2 = new LocalVectorStore({ dbPath: tempDbPath });
            await store2.load();
            
            const results = await store2.query('apple', mockAI, 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('1');
            expect(results[0].text).toBe('apple description');
        } finally {
            try {
                await fs.unlink(tempDbPath);
            } catch {}
        }
    });

    it('indexes directory correctly into overlapping chunks', async () => {
        const tempDocsDir = path.join(process.cwd(), 'temp-test-docs');
        await fs.mkdir(tempDocsDir, { recursive: true });
        
        const file1 = path.join(tempDocsDir, 'doc1.md');
        const file2 = path.join(tempDocsDir, 'doc2.txt');
        
        await fs.writeFile(file1, 'abcdefghijkl', 'utf-8');
        await fs.writeFile(file2, 'orange fruit content', 'utf-8');
        
        try {
            const store = new LocalVectorStore();
            await indexDirectory(tempDocsDir, store, mockAI);

            const results = await store.query('orange', mockAI, 1);
            expect(results).toHaveLength(1);
            expect(results[0].filePath).toBe(file2);
        } finally {
            try {
                await fs.rm(tempDocsDir, { recursive: true, force: true });
            } catch {}
        }
    });
});
