import assert from 'node:assert/strict';
import { pageContextVerified, pageSwitchCallbackVerified } from './ensure-wildrose-identity.mjs';

assert.equal(pageSwitchCallbackVerified({ response: { success: true } }), true);
assert.equal(pageSwitchCallbackVerified({ response: { success: false } }), false);
assert.equal(pageSwitchCallbackVerified({ timeout: true }), false);
assert.equal(pageSwitchCallbackVerified({ error: 'tab closed' }), false);
assert.equal(pageSwitchCallbackVerified(undefined), false);
assert.equal(pageContextVerified({ pageTimeline: true, commentAs: true }), true);
assert.equal(pageContextVerified({ createPostAs: true }), true);
assert.equal(pageContextVerified({ pageTimeline: true, commentAs: false, createPostAs: false }), false);
assert.equal(pageContextVerified({ createPostAs: false }), false);

console.log('Wildrose identity switch callback tests passed');
