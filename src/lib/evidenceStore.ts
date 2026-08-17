import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { adminDb } from './firebase-admin.ts';

// --- MODELS & TYPES ---

export type IngestionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface EvidenceSource {
  id: string; // Source ID (e.g., 'who-depression-factsheet')
  title: string;
  author: string; // Publisher/Author
  isAuthoritative: boolean; // Authority classification
  publicationDate: string;
  retrievalDate: string;
  version: string;
  url?: string; // Canonical URL
  contentHash?: string;
  status?: IngestionStatus;
}

export interface EvidenceChunk {
  id: string;
  sourceId: string;
  version: string;
  document: string; 
  locationIndex: number; 
  content: string;
  embedding: number[];
  retrievalTimestamp?: string; 
}

export interface RetrievalResult {
  chunk: EvidenceChunk;
  source: EvidenceSource;
  score: number;
}

// --- PERSISTENCE LAYER ---

export class EvidencePersistence {
  private inMemorySources: Map<string, EvidenceSource> = new Map();
  private inMemoryChunks: EvidenceChunk[] = [];
  private useInMemory = false;

  async enableInMemoryFallback() {
    this.useInMemory = true;
  }

  async saveSource(source: EvidenceSource): Promise<void> {
    if (this.useInMemory) {
      this.inMemorySources.set(`${source.id}_${source.version}`, source);
      return;
    }
    try {
      await adminDb.collection('evidence_sources').doc(`${source.id}_${source.version}`).set(source);
    } catch (e) {
      console.warn("Firestore write failed, falling back to in-memory persistence.");
      this.useInMemory = true;
      this.inMemorySources.set(`${source.id}_${source.version}`, source);
    }
  }

  async getSource(id: string, version: string): Promise<EvidenceSource | null> {
    if (this.useInMemory) {
      return this.inMemorySources.get(`${id}_${version}`) || null;
    }
    try {
      const doc = await adminDb.collection('evidence_sources').doc(`${id}_${version}`).get();
      return doc.exists ? (doc.data() as EvidenceSource) : null;
    } catch (e) {
      this.useInMemory = true;
      return this.inMemorySources.get(`${id}_${version}`) || null;
    }
  }

  async getAllSources(): Promise<EvidenceSource[]> {
    if (this.useInMemory) {
      return Array.from(this.inMemorySources.values());
    }
    try {
      const snap = await adminDb.collection('evidence_sources').get();
      return snap.docs.map(d => d.data() as EvidenceSource);
    } catch (e) {
      this.useInMemory = true;
      return Array.from(this.inMemorySources.values());
    }
  }

  async saveChunks(chunks: EvidenceChunk[]): Promise<void> {
    if (this.useInMemory) {
      this.inMemoryChunks.push(...chunks);
      return;
    }
    try {
      const batch = adminDb.batch();
      chunks.forEach(chunk => {
        const ref = adminDb.collection('evidence_chunks').doc(chunk.id);
        batch.set(ref, chunk);
      });
      await batch.commit();
    } catch (e) {
      this.useInMemory = true;
      this.inMemoryChunks.push(...chunks);
    }
  }

  async loadAllChunks(): Promise<EvidenceChunk[]> {
    if (this.useInMemory) {
      return this.inMemoryChunks;
    }
    try {
      const snap = await adminDb.collection('evidence_chunks').get();
      return snap.docs.map(d => d.data() as EvidenceChunk);
    } catch (e) {
      this.useInMemory = true;
      return this.inMemoryChunks;
    }
  }
}

// --- VALIDATION LAYER ---

export class EvidenceValidator {
  private approvedAuthorities = ['WHO', 'CDC', 'NIH', 'NIMH', 'APA'];

  validateSourceMetadata(source: EvidenceSource) {
    if (!source.id || !source.title || !source.version || !source.author) {
      throw new Error("Invalid source metadata: missing required fields");
    }
    if (!this.approvedAuthorities.includes(source.author) && source.isAuthoritative) {
      throw new Error("Unauthorized source author claimed as authoritative");
    }
  }

  validateContentIntegrity(content: string, providedHash?: string): string {
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');
    if (providedHash && providedHash !== actualHash) {
      throw new Error("Content integrity validation failed: hash mismatch");
    }
    return actualHash;
  }
}

// --- CHUNKING & EMBEDDING LAYER ---

export class EvidenceProcessor {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  chunkText(text: string, maxWords: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks;
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const response = await this.ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: text,
        });
        if (response.embeddings && response.embeddings[0].values) {
          embeddings.push(response.embeddings[0].values);
        } else {
          throw new Error("Empty embedding returned");
        }
      } catch (error) {
        console.error("Failed to generate embedding for chunk", error);
        throw new Error("Embedding generation failed");
      }
    }
    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: query,
    });
    if (!response.embeddings || !response.embeddings[0].values) {
      throw new Error("Failed to embed query");
    }
    return response.embeddings[0].values;
  }
}

// --- RETRIEVAL LAYER ---

export class EvidenceRetrieval {
  private RELEVANCE_THRESHOLD = 0.70;

  private cosineSimilarity(a: number[], b: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(queryEmbedding: number[], chunks: EvidenceChunk[], sources: Map<string, EvidenceSource>, topK: number = 3): Promise<RetrievalResult[]> {
    const scoredChunks = chunks.map(chunk => {
      const sourceKey = `${chunk.sourceId}_${chunk.version}`;
      return {
        chunk: {
          ...chunk,
          retrievalTimestamp: new Date().toISOString()
        },
        source: sources.get(sourceKey)!,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK).filter(c => c.score >= this.RELEVANCE_THRESHOLD);
  }
}

// --- MAIN EVIDENCE STORE (FACADE) ---

export class EvidenceStore {
  private persistence: EvidencePersistence;
  private validator: EvidenceValidator;
  private processor: EvidenceProcessor;
  private retrieval: EvidenceRetrieval;
  
  private memoryCache: {
    sources: Map<string, EvidenceSource>;
    chunks: EvidenceChunk[];
  } = { sources: new Map(), chunks: [] };

  private isInitialized = false;

  constructor(apiKey: string) {
    this.persistence = new EvidencePersistence();
    this.validator = new EvidenceValidator();
    this.processor = new EvidenceProcessor(apiKey);
    this.retrieval = new EvidenceRetrieval();
  }

  async init() {
    if (this.isInitialized) return;
    try {
      const allSources = await this.persistence.getAllSources();
      for (const s of allSources) {
        this.memoryCache.sources.set(`${s.id}_${s.version}`, s);
      }
      this.memoryCache.chunks = await this.persistence.loadAllChunks();
      this.isInitialized = true;
    } catch (e) {
      console.warn("EvidenceStore init failed. Assuming fresh DB in test env.");
      this.isInitialized = true;
    }
  }

  async ingest(source: EvidenceSource, content: string, expectedHash?: string) {
    await this.init();
    
    this.validator.validateSourceMetadata(source);
    const contentHash = this.validator.validateContentIntegrity(content, expectedHash);

    const existing = await this.persistence.getSource(source.id, source.version);
    if (existing) {
      throw new Error(`Source ${source.id} version ${source.version} already exists. Authoritative sources are immutable. Provide a new version to update.`);
    }

    source.contentHash = contentHash;
    source.status = 'PROCESSING';

    try {
      const textChunks = this.processor.chunkText(content);
      const embeddings = await this.processor.embedTexts(textChunks);

      const chunks: EvidenceChunk[] = textChunks.map((text, idx) => ({
        id: crypto.randomUUID(),
        sourceId: source.id,
        version: source.version,
        document: source.title,
        locationIndex: idx,
        content: text,
        embedding: embeddings[idx]
      }));

      source.status = 'COMPLETED';
      await this.persistence.saveSource(source);
      await this.persistence.saveChunks(chunks);

      this.memoryCache.sources.set(`${source.id}_${source.version}`, source);
      this.memoryCache.chunks.push(...chunks);

    } catch (error) {
      source.status = 'FAILED';
      await this.persistence.saveSource(source); 
      throw error;
    }
  }

  async retrieve(query: string, topK: number = 3): Promise<RetrievalResult[]> {
    await this.init();
    if (this.memoryCache.chunks.length === 0) return [];
    
    try {
      const queryEmbedding = await this.processor.embedQuery(query);
      return await this.retrieval.search(queryEmbedding, this.memoryCache.chunks, this.memoryCache.sources, topK);
    } catch (error) {
      console.error("Retrieval failed safely:", error);
      return []; 
    }
  }

  async getSources(): Promise<EvidenceSource[]> {
    await this.init();
    return Array.from(this.memoryCache.sources.values());
  }
}

export const evidenceStore = process.env.GEMINI_API_KEY ? new EvidenceStore(process.env.GEMINI_API_KEY) : null;
