#!/usr/bin/env node
/**
 * fetch-definitions.js
 * Fetches definitions, synonyms, and antonyms from Free Dictionary API
 * for all English words in index.html's WORDS array.
 *
 * Usage: node fetch-definitions.js
 * Output: vocabulary-data.json
 *
 * API: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
 * Rate: ~5 req/sec (polite limit with 200ms delay)
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

// ── 1. Extract WORDS from index.html ────────────────────────────────────────
const htmlPath = path.join(__dirname, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

// Extract the WORDS array text
const wordsMatch = html.match(/const WORDS\s*=\s*\[([\s\S]*?)\];/);
if (!wordsMatch) {
  console.error("Could not find WORDS array in index.html");
  process.exit(1);
}

// Parse {en:"word", ua:"translation"} entries
const wordEntries = [];
const entryRe = /\{en\s*:\s*"([^"]+)"[^}]*\}/g;
let m;
while ((m = entryRe.exec(wordsMatch[1])) !== null) {
  wordEntries.push(m[1]);
}

// Deduplicate — keep unique English words only
const uniqueWords = [...new Set(wordEntries)];
console.log(`Found ${wordEntries.length} entries, ${uniqueWords.length} unique English words.`);

// ── 2. API fetch helper ──────────────────────────────────────────────────────
function fetchWord(word) {
  return new Promise((resolve) => {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    https.get(url, { timeout: 8000 }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            resolve({ word, data: JSON.parse(data), error: null });
          } catch (e) {
            resolve({ word, data: null, error: "JSON parse error" });
          }
        } else if (res.statusCode === 404) {
          resolve({ word, data: null, error: "not_found" });
        } else {
          resolve({ word, data: null, error: `HTTP ${res.statusCode}` });
        }
      });
    }).on("error", (e) => {
      resolve({ word, data: null, error: e.message });
    }).on("timeout", () => {
      resolve({ word, data: null, error: "timeout" });
    });
  });
}

// ── 3. Parse API response ────────────────────────────────────────────────────
function parseResponse(apiData) {
  if (!apiData || !Array.isArray(apiData)) return null;

  const defs = [];
  const syns = new Set();
  const ants = new Set();

  for (const entry of apiData) {
    for (const meaning of (entry.meanings || [])) {
      const pos = meaning.partOfSpeech || "";
      for (const def of (meaning.definitions || [])) {
        if (def.definition) {
          defs.push({ pos, def: def.definition });
        }
        // Synonyms at definition level
        for (const s of (def.synonyms || [])) syns.add(s.toLowerCase());
        for (const a of (def.antonyms || [])) ants.add(a.toLowerCase());
      }
      // Synonyms at meaning level
      for (const s of (meaning.synonyms || [])) syns.add(s.toLowerCase());
      for (const a of (meaning.antonyms || [])) ants.add(a.toLowerCase());
    }
  }

  return {
    definitions: defs.slice(0, 5),   // keep top 5 defs
    synonyms:    [...syns].slice(0, 10),
    antonyms:    [...ants].slice(0, 10),
  };
}

// ── 4. Sleep helper ──────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── 5. Main loop ─────────────────────────────────────────────────────────────
async function main() {
  const outputPath = path.join(__dirname, "vocabulary-data.json");

  // Resume from existing file if interrupted
  let existing = {};
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      const done = Object.keys(existing).length;
      console.log(`Resuming: ${done} words already cached.`);
    } catch (e) {
      console.warn("Existing file corrupt, starting fresh.");
    }
  }

  const results = { ...existing };
  const toFetch = uniqueWords.filter(w => !(w in results));
  const total = toFetch.length;

  console.log(`Fetching ${total} new words...\n`);

  let i = 0;
  for (const word of toFetch) {
    i++;
    const { data, error } = await fetchWord(word);

    if (error && error !== "not_found") {
      console.warn(`[${i}/${total}] ${word}: ${error} — retrying once...`);
      await sleep(1000);
      const retry = await fetchWord(word);
      if (retry.error) {
        results[word] = { error: retry.error };
        console.warn(`  → Failed: ${retry.error}`);
      } else {
        results[word] = parseResponse(retry.data) || { error: "no_data" };
        console.log(`[${i}/${total}] ${word}: OK (retry)`);
      }
    } else if (error === "not_found") {
      results[word] = { error: "not_found" };
      if (i % 50 === 0 || total <= 20) console.log(`[${i}/${total}] ${word}: not found`);
    } else {
      const parsed = parseResponse(data);
      results[word] = parsed || { error: "no_data" };
      if (i % 10 === 0 || total <= 20) {
        const d = parsed ? parsed.definitions.length : 0;
        const s = parsed ? parsed.synonyms.length : 0;
        const a = parsed ? parsed.antonyms.length : 0;
        console.log(`[${i}/${total}] ${word}: ${d} defs, ${s} syns, ${a} ants`);
      }
    }

    // Save every 50 words (checkpoint)
    if (i % 50 === 0) {
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`  💾 Checkpoint saved (${Object.keys(results).length} words total)`);
    }

    // Rate limit: ~5 req/sec = 200ms between requests
    await sleep(210);
  }

  // Final save
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  // ── Stats ──
  const all = Object.entries(results);
  const withDefs = all.filter(([,v]) => v.definitions && v.definitions.length > 0);
  const withSyns = all.filter(([,v]) => v.synonyms && v.synonyms.length > 0);
  const withAnts = all.filter(([,v]) => v.antonyms && v.antonyms.length > 0);
  const notFound = all.filter(([,v]) => v.error === "not_found");
  const errors   = all.filter(([,v]) => v.error && v.error !== "not_found");

  console.log("\n=== Done! ===");
  console.log(`Total words:     ${all.length}`);
  console.log(`With defs:       ${withDefs.length} (${Math.round(withDefs.length/all.length*100)}%)`);
  console.log(`With synonyms:   ${withSyns.length} (${Math.round(withSyns.length/all.length*100)}%)`);
  console.log(`With antonyms:   ${withAnts.length} (${Math.round(withAnts.length/all.length*100)}%)`);
  console.log(`Not found:       ${notFound.length}`);
  console.log(`Other errors:    ${errors.length}`);
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
