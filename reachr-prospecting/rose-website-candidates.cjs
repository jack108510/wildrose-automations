const fs = require('fs');
const { inferBusinessName } = require('./business-name-inference.cjs');
const { externalDestination } = require('./content.js');

const keyFor = (name, url) => `${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${String(url || '').replace(/\/$/, '').toLowerCase()}`;

function loadCandidates(file) {
  if (!fs.existsSync(file)) return new Map();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = Array.isArray(data?.prospects) ? data.prospects : [];
  return new Map(rows.filter(row => row?.businessName && row.sources?.[0]?.websiteUrls?.[0]).map(row => [keyFor(row.businessName, row.sources[0].websiteUrls[0]), row]));
}

function addCandidate(rows, candidate, group) {
  const websiteUrls = [...new Set((candidate.websiteUrls || []).map(externalDestination).filter(Boolean))].slice(0, 5);
  if (!websiteUrls.length) return false;
  const businessName = inferBusinessName(candidate.businessName, candidate.observedText);
  if (!businessName || businessName.length < 3) return false;
  const source = {
    sourceGroupName: group.name || '',
    sourceGroupUrl: group.url || '',
    postUrl: candidate.postUrl || '',
    businessUrl: candidate.businessUrl || '',
    observedText: candidate.observedText || '',
    websiteUrls,
    observedAt: candidate.observedAt || new Date().toISOString(),
  };
  const key = keyFor(businessName, websiteUrls[0]);
  const existing = rows.get(key);
  if (existing) {
    if (!existing.sources.some(item => (source.postUrl && item.postUrl === source.postUrl) || (item.sourceGroupUrl === source.sourceGroupUrl && item.observedText === source.observedText))) existing.sources.push(source);
    return false;
  }
  rows.set(key, { businessName, businessUrl: candidate.businessUrl || '', status: 'rose_demo_pending_review', sources: [source] });
  return true;
}

function saveCandidates(file, rows) {
  const data = { updatedAt: new Date().toISOString(), prospects: [...rows.values()] };
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return data.prospects.length;
}

module.exports = { loadCandidates, addCandidate, saveCandidates };
