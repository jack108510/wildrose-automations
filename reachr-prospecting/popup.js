const status = document.getElementById('status');
const scan = document.getElementById('scan');
const inbox = document.getElementById('inbox');
const review = document.getElementById('review');
const count = document.getElementById('count');
const KEY = 'reachr_prospecting_visible_observations';
async function refreshCount() {
  const data = await chrome.storage.local.get([KEY, MESSENGER_KEY]);
  const prospects = data[KEY] || [], messages = data[MESSENGER_KEY] || [];
  const pendingProspects = prospects.filter(x => (x.status || 'pending_review') === 'pending_review').length;
  const pendingReplies = messages.filter(x => x.status === 'needs_approval').length;
  count.textContent = `${pendingReplies} replies need approval · ${pendingProspects} prospects to review`;
}
scan.addEventListener('click', async () => {
  scan.disabled = true; status.className = 'status'; status.textContent = 'Reviewing visible posts in open group tabs…';
  try {
    const tabs = await chrome.tabs.query({ url: ['https://*.facebook.com/groups/*', 'https://facebook.com/groups/*'] });
    const groupTabs = tabs.filter(tab => tab.id && !/\/search\//i.test(tab.url || ''));
    if (!groupTabs.length) throw new Error('Open at least one Facebook group feed first.');
    const results = await Promise.all(groupTabs.map(async tab => { try { return await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_VISIBLE_GROUP_PROMOTIONS' }); } catch { return { ok: false }; } }));
    const existing = (await chrome.storage.local.get(KEY))[KEY] || []; const fresh = []; let found = 0, scanned = 0;
    for (const result of results) if (result?.ok) { scanned += 1; for (const candidate of result.candidates || []) { found += 1; fresh.push({ ...candidate, lastSeenAt: new Date().toISOString() }); } }
    await chrome.storage.local.set({ [KEY]: mergeReachrRecords(existing, fresh).sort((a,b) => String(b.lastSeenAt || b.observedAt).localeCompare(String(a.lastSeenAt || a.observedAt))).slice(0, 1000) });
    status.textContent = `Scanned ${scanned}/${groupTabs.length} group tabs. Found ${found} qualifying visible posts.`; await refreshCount();
  } catch (error) { status.className = 'status error'; status.textContent = error.message || 'Review failed.'; } finally { scan.disabled = false; }
});
inbox.addEventListener('click', async () => {
  inbox.disabled = true; status.className = 'status'; status.textContent = 'Reading visible conversations in your open Messenger tab…';
  try {
    const tabs = await chrome.tabs.query({ url: ['https://*.messenger.com/*', 'https://www.facebook.com/messages/*'] });
    if (!tabs.length) throw new Error('Open the Messenger inbox first, then sync it.');
    const results = await Promise.all(tabs.filter(t => t.id).map(t => chrome.tabs.sendMessage(t.id, { type: 'SCAN_MESSENGER_THREADS' }).catch(() => ({ ok: false }))));
    const fresh = results.flatMap(r => r?.ok ? r.rows : []);
    if (!fresh.length) throw new Error('No visible Messenger conversations found. Keep the Chats list visible and try again.');
    const existing = (await chrome.storage.local.get(MESSENGER_KEY))[MESSENGER_KEY] || [];
    await chrome.storage.local.set({ [MESSENGER_KEY]: mergeMessengerRows(existing, fresh), reachr_messenger_last_sync_at: new Date().toISOString() });
    status.textContent = `Synced ${fresh.length} visible Messenger conversations into the approval queue.`; await refreshCount();
  } catch (error) { status.className = 'status error'; status.textContent = error.message || 'Messenger sync failed.'; } finally { inbox.disabled = false; }
});
review.addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('review.html') }));
refreshCount();
