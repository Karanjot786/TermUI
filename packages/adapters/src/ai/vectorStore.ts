import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AIAdapter } from './index.js';

export interface DocumentChunk {
    id: string;
    text: string;
    filePath: string;
    embedding?: number[];
}

export interface VectorStoreOptions {
    dbPath?: string; // Optional file path to persist vectors as JSON
}

function dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function magnitude(a: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * a[i];
    }
    return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct(a, b) / (magA * magB);
}

export function chunkText(text: string, size = 500, overlap = 50): string[] {
    const chunks: string[] = [];
    if (text.length <= size) {
        return [text];
    }
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        chunks.push(text.slice(start, end));
        start += (size - overlap);
        if (start >= text.length - overlap && end === text.length) {
            break;
        }
    }
    return chunks;
}

async function walkDirectory(dir: string): Promise<string[]> {
    let files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await walkDirectory(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (ext === '.md' || ext === '.txt') {
                files.push(fullPath);
            }
        }
    }
    return files;
}

export async function indexDirectory(
    docsPath: string,
    store: LocalVectorStore,
    ai: AIAdapter,
): Promise<void> {
    const files = await walkDirectory(docsPath);
    const docs: Omit<DocumentChunk, 'embedding'>[] = [];
    let chunkCounter = 0;
    for (const file of files) {
        const text = await fs.readFile(file, 'utf-8');
        const chunks = chunkText(text, 500, 50);
        for (const chunk of chunks) {
            docs.push({
                id: `${path.basename(file)}-chunk-${chunkCounter++}`,
                text: chunk,
                filePath: file,
            });
        }
    }
    if (docs.length > 0) {
        await store.addDocuments(docs, ai);
    }
}

export class LocalVectorStore {
    private _documents: DocumentChunk[] = [];
    private _dbPath?: string;

    constructor(options?: VectorStoreOptions) {
        this._dbPath = options?.dbPath;
    }

    async addDocuments(docs: Omit<DocumentChunk, 'embedding'>[], ai: AIAdapter): Promise<void> {
        if (!ai.embed) {
            throw new Error('The AI adapter does not support embeddings.');
        }
        for (const doc of docs) {
            const embedding = await ai.embed(doc.text);
            this._documents.push({
                ...doc,
                embedding,
            });
        }
    }

    async query(queryText: string, ai: AIAdapter, limit = 3): Promise<DocumentChunk[]> {
        if (!ai.embed) {
            throw new Error('The AI adapter does not support embeddings.');
        }
        const queryEmbedding = await ai.embed(queryText);
        
        const results = this._documents.map(doc => {
            const similarity = doc.embedding 
                ? cosineSimilarity(queryEmbedding, doc.embedding) 
                : 0;
            return { doc, similarity };
        });

        results.sort((a, b) => b.similarity - a.similarity);

        return results.slice(0, limit).map(r => r.doc);
    }

    async load(): Promise<void> {
        if (!this._dbPath) return;
        try {
            const data = await fs.readFile(this._dbPath, 'utf-8');
            this._documents = JSON.parse(data);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
            this._documents = [];
        }
    }

    async save(): Promise<void> {
        if (!this._dbPath) return;
        const dir = path.dirname(this._dbPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(this._dbPath, JSON.stringify(this._documents, null, 2), 'utf-8');
    }
}
