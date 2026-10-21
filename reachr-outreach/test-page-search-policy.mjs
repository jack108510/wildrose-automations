import assert from 'node:assert/strict';
import { selectOfficialPageSearchResult } from './page-search-policy.mjs';

const results = [
  { href: 'https://www.facebook.com/groups/1/user/123', text: 'Example Apparel', context: 'Group member' },
  { href: 'https://www.facebook.com/search/pages/?q=example', text: 'Example Apparel', context: 'Search' },
  { href: 'https://www.facebook.com/exampleapparel', text: 'Example Apparel', context: 'Baby & children’s clothing store · Page' },
];
assert.equal(selectOfficialPageSearchResult(results, 'Example Apparel')?.href, 'https://www.facebook.com/exampleapparel');
assert.equal(selectOfficialPageSearchResult([{ href: 'https://www.facebook.com/random', text: 'Other Shop' }], 'Example Apparel'), null);
console.log('official Page search policy tests passed');
