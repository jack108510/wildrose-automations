import assert from 'node:assert/strict';
import { selectOfficialPageSearchResult } from './page-search-policy.mjs';

const results = [
  { href: 'https://www.facebook.com/groups/1/user/123', text: 'Fog & Tide Apparel', context: 'Group member' },
  { href: 'https://www.facebook.com/search/pages/?q=fog', text: 'Fog & Tide Apparel', context: 'Search' },
  { href: 'https://www.facebook.com/fogandtideapparel', text: 'Fog & Tide Apparel', context: 'Baby & children’s clothing store · Page' },
];
assert.equal(selectOfficialPageSearchResult(results, 'Fog & Tide Apparel')?.href, 'https://www.facebook.com/fogandtideapparel');
assert.equal(selectOfficialPageSearchResult([{ href: 'https://www.facebook.com/random', text: 'Other Shop' }], 'Fog & Tide Apparel'), null);
console.log('official Page search policy tests passed');
