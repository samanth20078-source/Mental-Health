import assert from 'assert';
import { evidenceStore, EvidenceSource, EvidenceStore } from '../lib/evidenceStore.ts';
import 'dotenv/config'; 

async function runTests() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found. Skipping tests.");
    return;
  }
  
  if (!evidenceStore) {
    console.error("Evidence store not initialized.");
    return;
  }
  
  console.log("Starting Evidence Architecture Tests...");

  const source1: EvidenceSource = {
    id: "who-depression-factsheet",
    title: "Depression Fact Sheet",
    author: "WHO",
    isAuthoritative: true,
    publicationDate: "2023-03-31",
    retrievalDate: new Date().toISOString(),
    version: "1.0",
    url: "https://who.int/news-room/fact-sheets/detail/depression"
  };

  const content1 = "Depression is a common mental disorder. Globally, an estimated 5% of adults suffer from depression. It is characterized by persistent sadness and a lack of interest or pleasure in previously rewarding or enjoyable activities. Effective treatments are available for mild, moderate, and severe depression.";

  // Initialize store cache
  await evidenceStore.init();

  // 1. Ingestion and Duplicate Sources
  // Clean up if existed from previous run, normally tests use clean DB.
  // Assuming clean DB or at least we catch the duplicate correctly.
  try {
    await evidenceStore.ingest(source1, content1);
    console.log("✓ Ingested source 1");
  } catch (e: any) {
    if (e.message.includes("already exists")) {
       console.log("✓ Caught duplicate source error (Source already existed from prior run)");
    } else {
       throw e;
    }
  }

  try {
    await evidenceStore.ingest(source1, content1);
    assert.fail("Should have thrown duplicate source error");
  } catch (e: any) {
    assert.ok(e.message.includes("already exists"));
    console.log("✓ Caught duplicate source error (Immutable versions)");
  }

  // 2. Version Updates (New Version)
  const source1v2 = { ...source1, version: "2.0" };
  const content1v2 = "Depression is a common mental disorder. Globally, an estimated 5% of adults suffer from depression. New treatments include advanced CBT protocols.";
  
  try {
    await evidenceStore.ingest(source1v2, content1v2);
  } catch(e: any) {
    if (!e.message.includes("already exists")) throw e;
  }

  const sources = await evidenceStore.getSources();
  assert.ok(sources.find(s => s.id === source1.id && s.version === "2.0"));
  console.log("✓ Handled version updates correctly via explicit new versions");

  // 3. Retrieval, Relevance Thresholds, and Source Attribution
  const results = await evidenceStore.retrieve("What is depression and how many people have it?");
  assert.ok(results.length > 0);
  assert.equal(results[0].source.id, source1.id);
  assert.ok(results[0].score >= 0.70); // Must meet high relevance threshold
  assert.ok(results[0].chunk.retrievalTimestamp); // Provenance tracked
  console.log("✓ Retrieved relevant evidence with correct source attribution and provenance");

  // 4. Missing Sources (Querying something unrelated)
  const missingResults = await evidenceStore.retrieve("What are the symptoms of a broken leg?");
  // Due to high relevance threshold, irrelevant queries should return exactly 0 results
  assert.ok(missingResults.length === 0); 
  console.log("✓ Handled missing sources and enforced strict relevance threshold");

  // 5. Fail safely (mocking API failure by temporarily substituting the AI client)
  const brokenStore = new EvidenceStore("bad-api-key");
  const safeResults = await brokenStore.retrieve("Depression");
  assert.deepEqual(safeResults, []);
  console.log("✓ Failed safely when API is unavailable");

  // 6. Source Integrity & Corruption checks
  const corruptSource = { ...source1, id: "test-corrupt-1", version: "1.0" };
  try {
    await evidenceStore.ingest(corruptSource, content1, "WRONG-HASH");
    assert.fail("Should have failed hash validation");
  } catch (e: any) {
    assert.ok(e.message.includes("hash mismatch"));
    console.log("✓ Enforced content integrity validation");
  }
  
  // 7. Authorization of Source Authors
  const unauthorizedSource = { ...source1, id: "bad-author-1", version: "1.0", author: "Random Blog", isAuthoritative: true };
  try {
    await evidenceStore.ingest(unauthorizedSource, content1);
    assert.fail("Should have failed unauthorized author");
  } catch (e: any) {
    assert.ok(e.message.includes("Unauthorized source author"));
    console.log("✓ Prevented unauthorized source from claiming authority");
  }

  console.log("All evidence architecture tests passed!");
}

runTests().catch(console.error);
