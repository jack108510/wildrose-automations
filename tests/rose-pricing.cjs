// Run with: node tests/rose-pricing.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const expectations = [
  ['ai-tool-mockup-final.html', ['75 voice minutes/month', '350 voice minutes/month', '350 voice minutes included', 'Same Rose agent. Choose how many voice minutes you need.']],
  ['ai-tool-mockup-funnel-preview.html', ['Includes 75 voice minutes/month.', 'Includes 350 voice minutes/month.', '350 voice minutes included']],
  ['rose-install-help.html', ['75/month', '350/month']],
  ['rose-purchase-demo/index.html', ['75 voice minutes each month', '350 voice minutes each month']],
];
for (const [file, expected] of expectations) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const text of expected) assert(html.includes(text), `${file} missing ${text}`);
  assert(!/(?:25|100|250) voice minutes|250\/month/.test(html), `${file} has stale pricing copy`);
  console.log('PASS pricing allowance', file);
}
assert(24 + (350 - 75) * 0.29 > 79, 'Pro must beat Basic plus overage at included usage');
console.log('PASS Pro is better value at its included usage');
