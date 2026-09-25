import crypto from 'node:crypto';

const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const stamp = value => Number.isFinite(Date.parse(value || '')) ? new Date(value).toISOString() : null;
const latest = (...values) => values.filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;

export function canonicalMessengerRoute(raw) {
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || !['m.me', 'www.messenger.com', 'messenger.com', 'www.facebook.com', 'facebook.com'].includes(url.hostname)) return null;
  const pathname = url.pathname.replace(/\/+$/, '');
  if (/marketplace/i.test(pathname)) return null;
  const numeric = /^(?:\/messages\/t\/|\/t\/|\/)(\d+)$/.exec(pathname);
  if (numeric) return `facebook-thread:${numeric[1]}`;
  if (url.hostname === 'm.me' && /^\/[a-z0-9._-]+$/i.test(pathname)) return `facebook-handle:${pathname.slice(1).toLowerCase()}`;
  return `${url.hostname.replace(/^www\./, '')}${pathname.toLowerCase()}`;
}

function marketplace(record) {
  return [record.sourceGroup, record.sourceEvidence, record.sourceUrl, record.messengerUrl, record.messagingSource, record.source, record.channel, record.surface, record.placement]
    .some(value => /marketplace/i.test(String(value || '')));
}

function addMessage(group, direction, body, observedAt, source) {
  const text = String(body || '').trim();
  if (!text) return;
  const key = `${direction}:${norm(text)}`;
  if (group.messageKeys.has(key)) return;
  group.messageKeys.add(key);
  group.messages.push({ direction, body: text, observedAt: stamp(observedAt), source });
}

export function buildCommandCenterConversations(ledger, replyState, management = {}, importedRows = []) {
  const groups = new Map();
  const aliasGroups = new Map();
  for (const record of ledger.prospects || []) {
    if (!['messenger_confirmed', 'messenger_ui_confirmed'].includes(record.delivery) || marketplace(record)) continue;
    const route = canonicalMessengerRoute(record.messengerUrl);
    if (!route || !String(record.businessName || '').trim()) continue;
    let group = groups.get(route);
    if (!group) {
      group = { id: crypto.createHash('sha256').update(route).digest('hex').slice(0, 24), businessName: record.businessName, recipientName: record.recipientName || record.businessName, messengerUrl: record.messengerUrl, accounts: new Set(), aliases: new Set(), messages: [], messageKeys: new Set(), candidatePreviews: [], candidateKeys: new Set(), sentAt: null };
      groups.set(route, group);
    }
    if (record.senderAccount) group.accounts.add(record.senderAccount);
    for (const alias of [record.businessName, record.recipientName]) if (norm(alias)) group.aliases.add(norm(alias));
    group.sentAt = latest(group.sentAt, stamp(record.sentAt));
    addMessage(group, 'outbound', record.sentMessage, record.sentAt, 'confirmed_send');
    addMessage(group, 'outbound', record.lastReplySentMessage, record.lastReplySentAt, 'recorded_follow_up');
  }
  for (const group of groups.values()) for (const alias of group.aliases) {
    if (!aliasGroups.has(alias)) aliasGroups.set(alias, new Set());
    aliasGroups.get(alias).add(group);
  }
  for (const reply of Object.values(replyState.seen || {})) {
    if (reply.classification?.reason === 'outbound_or_empty' || marketplace(reply)) continue;
    const replyRoute = canonicalMessengerRoute(reply.messengerUrl);
    let group = replyRoute ? groups.get(replyRoute) : null;
    if (!group) {
      const matches = aliasGroups.get(norm(reply.businessName));
      if (matches?.size === 1) group = [...matches][0];
    }
    if (!group) continue;
    const body = String(reply.preview || '').replace(/^Unread message:\s*/i, '').trim();
    if (!body || /^you:/i.test(body)) continue;
    const verified = reply.threadTextVerified === true && group.aliases.has(norm(reply.threadSpeaker));
    if (verified) addMessage(group, 'inbound', body, reply.observedAt, 'verified_thread');
    else if (!group.candidateKeys.has(norm(body))) {
      group.candidateKeys.add(norm(body));
      group.candidatePreviews.push({ body, observedAt: stamp(reply.observedAt), label: 'Unverified preview' });
    }
  }
  for (const row of importedRows) {
    const group = groups.get(canonicalMessengerRoute(row.conversation?.messenger_url));
    if (!group || !group.aliases.has(norm(row.conversation?.business_name))) continue;
    for (const message of row.messages || []) {
      if (message.direction === 'inbound' && row.conversation?.verified_inbound) addMessage(group, 'inbound', message.body, message.observed_at, 'verified_thread');
      if (message.direction === 'outbound') addMessage(group, 'outbound', message.body, message.observed_at, 'recorded_follow_up');
    }
  }
  return [...groups.values()].map(group => {
    const inboundBodies = new Set(group.messages.filter(message => message.direction === 'inbound').map(message => norm(message.body)));
    group.candidatePreviews = group.candidatePreviews.filter(item => !inboundBodies.has(norm(item.body)));
    group.messages.sort((a, b) => Date.parse(a.observedAt || 0) - Date.parse(b.observedAt || 0));
    group.candidatePreviews.sort((a, b) => Date.parse(b.observedAt || 0) - Date.parse(a.observedAt || 0));
    const lastMessage = group.messages.at(-1);
    const candidate = group.candidatePreviews[0];
    const updatedAt = latest(group.sentAt, lastMessage?.observedAt, candidate?.observedAt);
    const saved = management[group.id] || {};
    const newestInbound = latest(...group.messages.filter(message => message.direction === 'inbound').map(message => message.observedAt), candidate?.observedAt);
    const newActivityAfterReview = newestInbound && stamp(saved.updatedAt) && Date.parse(newestInbound) > Date.parse(saved.updatedAt);
    const status = newActivityAfterReview ? 'needs_review' : ['needs_review', 'awaiting_reply', 'interested', 'waiting', 'closed'].includes(saved.status)
      ? saved.status : (group.messages.some(message => message.direction === 'inbound') || candidate ? 'needs_review' : 'awaiting_reply');
    const candidateIsLatest = Boolean(candidate && (!lastMessage?.observedAt || Date.parse(candidate.observedAt || 0) > Date.parse(lastMessage.observedAt || 0)));
    return { id: group.id, businessName: group.businessName, recipientName: group.recipientName, messengerUrl: group.messengerUrl, accounts: [...group.accounts], sentAt: group.sentAt, updatedAt, status, note: String(saved.note || ''), verifiedReplyCount: group.messages.filter(message => message.direction === 'inbound').length, candidateCount: group.candidatePreviews.length, latestPreview: candidateIsLatest ? candidate.body : lastMessage?.body || '', latestPreviewVerified: !candidateIsLatest, messages: group.messages, candidatePreviews: group.candidatePreviews };
  }).sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0) || (a.status === 'needs_review' ? 0 : 1) - (b.status === 'needs_review' ? 0 : 1));
}
