const assert = require('node:assert/strict');
const { collectDiscoveryGroups, evaluateWithRetry, selectDiscoveryGroups } = require('./discovery-runtime.cjs');

(async () => {
  let calls = 0;
  const connection = {
    c: async () => {
      calls += 1;
      if (calls < 3) throw new Error('Runtime.evaluate timeout');
      return { result: { value: '[{"name":"Calgary Small Business","url":"https://facebook.com/groups/1"}]' } };
    },
  };
  const result = await evaluateWithRetry(connection, 'expression', { attempts: 3, delayMs: 0 });
  assert.equal(calls, 3);
  assert.match(result.result.value, /Calgary Small Business/);

  const groups = selectDiscoveryGroups([
    { name: 'Calgary Small Business', url: 'https://facebook.com/groups/1' },
    { name: 'Calgary Small Business duplicate', url: 'https://facebook.com/groups/1' },
    { name: 'Toronto Vendor Network', url: 'https://facebook.com/groups/2' },
    { name: 'Unrelated Social Club', url: 'https://facebook.com/groups/3' },
  ], 55);
  assert.deepEqual(groups.map(x => x.url), [
    'https://facebook.com/groups/1',
    'https://facebook.com/groups/2',
  ]);
  assert.throws(() => selectDiscoveryGroups([], 55), /no eligible business groups/i);
  const fallback = collectDiscoveryGroups([], {
    attempts: [{ group: { name: 'Edmonton Small Business', url: 'https://facebook.com/groups/4' } }],
    deepAttempts: [{ group: { name: 'Toronto Vendor Network', url: 'https://facebook.com/groups/2' } }],
    searchAttempts: [{ group: { name: 'Edmonton Small Business duplicate', url: 'https://facebook.com/groups/4' } }],
  }, 55);
  assert.deepEqual(fallback.map(x => x.url), ['https://facebook.com/groups/4', 'https://facebook.com/groups/2']);
  console.log('discovery runtime tests passed');
})().catch(error => { console.error(error); process.exit(1); });
