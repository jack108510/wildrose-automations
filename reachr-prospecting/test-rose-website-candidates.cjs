const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadCandidates, addCandidate, saveCandidates } = require('./rose-website-candidates.cjs');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'rose-websites-'));
try {
  const file = path.join(folder, 'rose-website-candidates.json');
  const rows = loadCandidates(file);
  const group = { name: 'Local businesses', url: 'https://www.facebook.com/groups/local-businesses/' };
  const candidate = {
    businessName: 'Example Roofing', businessUrl: 'https://www.facebook.com/example-roofing/', postUrl: '',
    observedText: 'Example Roofing offers roof repairs. Book at https://example-roofing.ca/.',
    websiteUrls: ['https://example-roofing.ca/'],
  };
  assert.equal(addCandidate(rows, candidate, group), true);
  assert.equal(addCandidate(rows, candidate, group), false);
  assert.equal(saveCandidates(file, rows), 1);
  const saved = [...loadCandidates(file).values()][0];
  assert.equal(saved.sources.length, 1);
  assert.equal(saved.sources[0].postUrl, '');
  assert.deepEqual(saved.sources[0].websiteUrls, ['https://example-roofing.ca/']);
  assert.equal(addCandidate(rows, { ...candidate, websiteUrls: ['https://facebook.com/example'] }, group), false);
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
console.log('Rose website candidate tests passed');
