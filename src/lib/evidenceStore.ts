import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

export interface EvidenceSource {
  id: string;
  title: string;
  author: string; // e.g., 'WHO'
  isAuthoritative: boolean;
  publicationDate: string;
  retrievalDate: string;
  version: string;
  url?: string;
}

export interface EvidenceChunk {
  id: string;
  sourceId: string;
  content: string;
  embedding: number[];
}

export class EvidenceStore {
  private sources: Map<string, EvidenceSource> = new Map();
  private chunks: EvidenceChunk[] = [];
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private chunkText(text: string, maxWords: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks;
  }

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

  async ingest(source: EvidenceSource, content: string) {
    if (!source.id || !source.title || !source.version) {
      throw new Error("Invalid source metadata");
    }

    if (this.sources.has(source.id) && this.sources.get(source.id)?.version === source.version) {
      throw new Error("Source with this version already exists. Please update the version number to overwrite.");
    }

    // Set or overwrite the source (version update)
    this.sources.set(source.id, source);
    
    // Remove old chunks for this source if updating
    this.chunks = this.chunks.filter(c => c.sourceId !== source.id);

    const textChunks = this.chunkText(content);
    
    for (const text of textChunks) {
      try {
        const response = await this.ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: text,
        });
        
        if (response.embeddings && response.embeddings[0].values) {
          this.chunks.push({
            id: crypto.randomUUID(),
            sourceId: source.id,
            content: text,
            embedding: response.embeddings[0].values
          });
        }
      } catch (error) {
        console.error("Failed to generate embedding for chunk", error);
        throw new Error("Embedding generation failed");
      }
    }
  }

  async retrieve(query: string, topK: number = 3) {
    if (this.chunks.length === 0) return [];

    try {
      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: query,
      });

      const queryEmbedding = response.embeddings?.[0]?.values;
      if (!queryEmbedding) throw new Error("Failed to embed query");

      const scoredChunks = this.chunks.map(chunk => ({
        chunk,
        source: this.sources.get(chunk.sourceId)!,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));

      // Sort by descending score
      scoredChunks.sort((a, b) => b.score - a.score);
      
      // Filter out low relevance chunks
      return scoredChunks.slice(0, topK).filter(c => c.score > 0.55); 
    } catch (error) {
      console.error("Retrieval failed", error);
      // Fail safely by returning empty evidence
      return [];
    }
  }
  
  getSources() {
    return Array.from(this.sources.values());
  }
}

// Global instance for the app backend
export const evidenceStore = process.env.GEMINI_API_KEY ? new EvidenceStore(process.env.GEMINI_API_KEY) : null;
