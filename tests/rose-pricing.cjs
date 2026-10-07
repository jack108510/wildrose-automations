// Run with: node tests/rose-pricing.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const expectations = [
  ['ai-tool-mockup-final.html', ['75 voice minutes/month', '275 voice minutes/month', '275 voice minutes included']],
  ['ai-tool-mockup-funnel-preview.html', ['Includes 75 voice minutes/month.', 'Includes 275 voice minutes/month.', '275 voice minutes included']],
  ['rose-install-help.html', ['75/month', '275/month']],
  ['rose-purchase-demo/index.html', ['75 voice minutes each month', '275 voice minutes each month']],
];
for (const [file, expected] of expectations) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const text of expected) assert(html.includes(text), `${file} missing ${text}`);
  for (const price of ['CA$39', 'CA$129']) assert(html.includes(price), `${file} missing ${price}`);
  assert(/(?:Prices in CAD|charged in CAD|checkout are in CAD)/i.test(html), `${file} must identify billing currency`);
  assert(!/(?:25|100|250|350) voice minutes|(?:250|350)\/month|Rose Basic — \$24|Rose Pro — \$79/.test(html), `${file} has stale pricing copy`);
  console.log('PASS published CAD pricing', file);
}
// Current pricing makes Basic plus overage cheaper at Pro's full allowance; review separately.
const basicAtProAllowance = 39 + (275 - 75) * 0.29;
if (basicAtProAllowance < 129) console.warn(`PRICING REVIEW: Basic plus overage is CA$${basicAtProAllowance.toFixed(2)} at 275 minutes, below Pro CA$129.`);
console.log('Pricing checks complete');
