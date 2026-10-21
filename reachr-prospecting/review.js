const PROSPECT_KEY = 'reachr_prospecting_visible_observations';
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&#39;' }[c]));
let prospectRows = [], messengerRows = [];
const stateLabel = state => String(state || '').replaceAll('_', ' ');
async function save() { await chrome.storage.local.set({ [PROSPECT_KEY]: prospectRows, [MESSENGER_KEY]: messengerRows }); render(); }
async function copy(text, button) { await navigator.clipboard.writeText(text); const old = button.textContent; button.textContent = 'Copied'; setTimeout(() => button.textContent = old, 1200); }
function messageCard(r, i) {
  const draft = r.draft || makeMessengerDraft(r);
  return `<article class="card ${esc(r.status || 'needs_approval')}"><div class="top"><div><div class="name">${esc(r.name)}</div><div class="group">${esc(r.source || 'Messenger')} · ${esc(r.lastActivityAt ? new Date(r.lastActivityAt).toLocaleString() : '')}</div></div><div class="badge">${esc(stateLabel(r.status || 'needs_approval'))}</div></div><div class="excerpt"><strong>Latest visible inbox preview</strong>\n${esc(r.lastMessage || 'No message preview captured.')}</div><textarea class="draft" data-msg-draft="${i}">${esc(draft)}</textarea><div class="actions"><a class="button secondary" target="_blank" href="${esc(r.threadUrl)}">Open thread</a><button data-msg-copy="${i}" class="secondary">Copy draft</button><button data-msg-approve="${i}">Approve & Send</button><button data-msg-snooze="${i}" class="secondary">Snooze</button><button data-msg-close="${i}" class="reject">Close / no follow-up</button></div></article>`;
}
function prospectCard(r, i) { return `<article class="card ${esc(r.status || 'pending_review')}"><div class="top"><div><div class="name">${esc(r.businessName)}</div><div class="group">${esc(r.sourceGroupName)}</div></div><div class="badge">${esc(stateLabel(r.status || 'pending_review'))}</div></div><div class="excerpt">${esc((r.observedText || '').slice(0, 700))}</div><textarea class="draft" data-prospect-draft="${i}">${esc(r.draft || '')}</textarea><div class="actions"><a class="button secondary" target="_blank" href="${esc(r.postUrl)}">Source post</a>${r.businessUrl ? `<a class="button secondary" target="_blank" href="${esc(r.businessUrl)}">Business route</a>` : ''}<button data-prospect-copy="${i}">Copy draft</button><button class="secondary" data-prospect-approve="${i}">Approve</button><button class="reject" data-prospect-reject="${i}">Reject</button></div></article>`; }
async function sendReply(index) {
  const row = messengerRows[index], text = row.draft || makeMessengerDraft(row);
  if (!text.trim()) return;
  const tab = await chrome.tabs.create({ url: row.threadUrl, active: true });
  const response = await new Promise(resolve => {
    const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve({ ok: false, error: 'Messenger thread did not load. Nothing was sent.' }); }, 15000);
    function listener(tabId, info) { if (tabId === tab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(listener); clearTimeout(timer); setTimeout(() => chrome.tabs.sendMessage(tab.id, { type: 'SEND_APPROVED_MESSENGER_REPLY', text }).then(resolve).catch(e => resolve({ ok: false, error: e.message })), 800); } }
    chrome.tabs.onUpdated.addListener(listener);
  });
  if (!response?.ok) { alert(response?.error || 'Message was not sent.'); return; }
  messengerRows[index] = { ...row, draft: text, status: 'sent', approvedAt: new Date().toISOString(), sentAt: response.sentAt, nextAction: 'Await reply' };
  await save();
}
function render() {
  const pending = messengerRows.filter(x => x.status === 'needs_approval').length;
  document.getElementById('summary').textContent = `${pending} Messenger replies awaiting your approval · ${prospectRows.filter(x => (x.status || 'pending_review') === 'pending_review').length} prospects awaiting review`;
  document.getElementById('messages').innerHTML = messengerRows.length ? messengerRows.map(messageCard).join('') : '<div class="empty">No Messenger conversations synced. Open Messenger, then click “Sync open Messenger inbox” in the extension.</div>';
  document.getElementById('prospects').innerHTML = prospectRows.length ? prospectRows.map(prospectCard).join('') : '<div class="empty">No prospect candidates saved yet.</div>';
  document.querySelectorAll('[data-msg-draft]').forEach(el => el.onchange = () => { messengerRows[+el.dataset.msgDraft].draft = el.value; chrome.storage.local.set({ [MESSENGER_KEY]: messengerRows }); });
  document.querySelectorAll('[data-msg-copy]').forEach(el => el.onclick = () => copy(messengerRows[+el.dataset.msgCopy].draft || makeMessengerDraft(messengerRows[+el.dataset.msgCopy]), el));
  document.querySelectorAll('[data-msg-approve]').forEach(el => el.onclick = () => sendReply(+el.dataset.msgApprove));
  document.querySelectorAll('[data-msg-snooze]').forEach(el => el.onclick = async () => { messengerRows[+el.dataset.msgSnooze].status = 'snoozed'; messengerRows[+el.dataset.msgSnooze].snoozedAt = new Date().toISOString(); await save(); });
  document.querySelectorAll('[data-msg-close]').forEach(el => el.onclick = async () => { messengerRows[+el.dataset.msgClose].status = 'closed'; messengerRows[+el.dataset.msgClose].closedAt = new Date().toISOString(); await save(); });
  document.querySelectorAll('[data-prospect-draft]').forEach(el => el.onchange = () => { prospectRows[+el.dataset.prospectDraft].draft = el.value; chrome.storage.local.set({ [PROSPECT_KEY]: prospectRows }); });
  document.querySelectorAll('[data-prospect-copy]').forEach(el => el.onclick = () => copy(prospectRows[+el.dataset.prospectCopy].draft, el));
  document.querySelectorAll('[data-prospect-approve]').forEach(el => el.onclick = async () => { prospectRows[+el.dataset.prospectApprove].status = 'approved'; prospectRows[+el.dataset.prospectApprove].reviewedAt = new Date().toISOString(); await save(); });
  document.querySelectorAll('[data-prospect-reject]').forEach(el => el.onclick = async () => { prospectRows[+el.dataset.prospectReject].status = 'rejected'; prospectRows[+el.dataset.prospectReject].reviewedAt = new Date().toISOString(); await save(); });
}
chrome.storage.local.get([PROSPECT_KEY, MESSENGER_KEY]).then(data => { prospectRows = data[PROSPECT_KEY] || []; messengerRows = data[MESSENGER_KEY] || []; render(); });
