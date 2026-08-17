# Evidence & Authoritative Knowledge Architecture

## Overview
To prevent hallucination of medical facts, the platform utilizes a highly structured, persistent, and verifiable Evidence Architecture. The generative AI model is explicitly restricted from inventing medical claims or asserting absolute certainty. When a query requires medical or physiological knowledge, the AI's response is grounded exclusively using this Evidence Store.

## 1. Abstraction & Separation of Concerns
The Evidence Store operates on a clear separation of concerns, broken into four primary layers:
- **Persistence Layer**: Connects to the primary Firestore instance to ensure all sources and chunks survive container resets and cross-instance deployments.
- **Validation Layer**: Scans the source author against an approved whitelist (e.g., WHO, CDC) to prevent arbitrary scraping and validates content integrity hashes.
- **Processing Layer (Chunking & Embedding)**: Segments validated content into uniform blocks and generates high-dimensional embeddings.
- **Retrieval Layer**: Maps query vectors against persisted chunk embeddings using cosine similarity and strict relevance filtering.

## 2. Ingestion Lifecycle
1. **Metadata Approval**: The system requires strict, structured metadata for every source:
   - `id`: Unique source identifier.
   - `title`: Document title.
   - `author`: The publishing organization. Must match the Approved Authorities list (WHO, CDC, NIH, NIMH, APA).
   - `isAuthoritative`: Boolean flag strictly gated by the validator.
   - `publicationDate` & `retrievalDate`: Temporal constraints.
   - `version`: The document's explicit version.
   - `contentHash`: Generated using SHA-256 to ensure document integrity.
2. **Integrity & Mutability**: Source versions are **immutable**. If a document changes, it must be ingested as a new `version` string. The system will throw an explicit error to prevent silent overwriting of an existing version.
3. **Chunking**: The document is segmented into semantic blocks (currently word-length bounds) to retain localized meaning.
4. **Embedding**: Text blocks are embedded via the Gemini Embeddings model and prepared for vector storage.
5. **Persistence**: Chunks and their source registry records are saved to the `evidence_sources` and `evidence_chunks` Firestore collections.

## 3. Retrieval & Provenance Lifecycle
1. **Embedding**: The user's prompt is vectorized.
2. **Similarity Scoring**: The system calculates the cosine similarity between the query vector and all cached evidence chunk vectors.
3. **Relevance Threshold**: Chunks scoring below `0.70` relevance are stripped out. This aggressively filters low-confidence or irrelevant health content. If no chunks meet the threshold, the system returns an empty result set.
4. **Provenance Attachment**: Retrieved chunks are mapped directly to their parent Source (author, version, URL). A real-time `retrievalTimestamp` is appended to the chunk to guarantee absolute traceability from the final chat response back to the original index.
5. **System Prompt Enforcement**: If the evidence array is empty, the AI's system prompt dictates it must explicitly state that no authoritative evidence was found, instead of attempting to guess or hallucinate an answer.

## 4. Citation and User Presentation
When responding using evidence:
- The backend parses the retrieved chunk's `title`, `author`, and `version`.
- The AI explicitly cites this using structured attribution blocks (e.g., "According to WHO (Depression Fact Sheet, v1.0)...").
- The system never claims that the AI itself is medically validated or that the platform acts as a medical authority.

## 5. Testing & Security
- **Data Protection**: Firestore collections for evidence are restricted (`allow read, write: if false`) to prevent unauthorized client exposure. Only the backend Admin SDK interacts with the raw evidence data.
- **Tests**: The evidence pipeline (`src/tests/evidence.test.ts`) enforces version mutability, hash integrity checks, unauthorized author rejection, low-relevance exclusion, and safe-failure upon AI connectivity loss.
