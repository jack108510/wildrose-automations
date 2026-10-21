(() => {
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const isMessenger = () => /(^|\.)messenger\.com$/.test(location.hostname) || /messenger/i.test(location.pathname) || /\/messages\//.test(location.pathname);
  const threadHref = element => element?.closest('a[href]')?.href || '';
  const textFor = element => clean(element?.innerText || element?.textContent || '');

  function visibleThreadCandidates() {
    if (!isMessenger()) return [];
    const links = [...document.querySelectorAll('a[href]')]
      .filter(a => /\/t\/|\/messages\/t\//.test(a.getAttribute('href') || ''));
    const seen = new Set();
    const rows = [];
    for (const link of links) {
      const url = link.href;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const item = link.closest('[role="row"], li, [role="gridcell"], div') || link;
      const text = textFor(item);
      if (!text || text.length < 2) continue;
      const parts = text.split(/\n+/).map(clean).filter(Boolean);
      const name = parts[0] || 'Messenger conversation';
      const unread = /\b\d+ new messages?\b/i.test(text) || /unread/i.test(item.getAttribute('aria-label') || '');
      rows.push({
        threadUrl: url,
        name,
        lastMessage: parts.slice(1).join(' · ').slice(0, 500),
        unread,
        status: unread ? 'needs_approval' : 'awaiting_reply',
        lastActivityAt: new Date().toISOString(),
        source: 'Messenger inbox scan',
        createdAt: new Date().toISOString(),
      });
    }
    return rows.slice(0, 200);
  }

  function findComposer() {
    return [...document.querySelectorAll('[contenteditable="true"], textarea')]
      .find(el => el.offsetParent !== null && !/search/i.test(`${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`));
  }
  function insertText(element, text) {
    element.focus();
    if (element.matches('[contenteditable="true"]')) {
      document.execCommand('selectAll', false, null);
      if (document.execCommand('insertText', false, text)) return true;
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      return true;
    }
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  function findSendButton() {
    return [...document.querySelectorAll('button, [role="button"]')].find(button => {
      const label = `${button.getAttribute('aria-label') || ''} ${textFor(button)}`.toLowerCase();
      return /(^|\s)send(\s|$)/.test(label) && button.offsetParent !== null && button.getAttribute('aria-disabled') !== 'true' && !button.disabled;
    });
  }
  async function sendApprovedReply(text) {
    if (!isMessenger()) throw new Error('Open the intended Messenger conversation before sending.');
    const composer = findComposer();
    if (!composer) throw new Error('Messenger composer not found. Nothing was sent.');
    // Never overwrite or append to text the operator has already started writing.
    // A non-empty composer must be cleared deliberately by the operator first.
    if (clean(composer.innerText || composer.value || '')) {
      throw new Error('Messenger composer already contains unsent text. Clear it manually before approving this reply. Nothing was sent.');
    }
    insertText(composer, text);
    await new Promise(resolve => setTimeout(resolve, 350));
    if (clean(composer.innerText || composer.value || '') !== clean(text)) {
      throw new Error('Messenger draft did not match the approved reply. Nothing was sent.');
    }
    const send = findSendButton();
    if (!send) throw new Error('Messenger Send button not available. Draft was not sent.');
    send.click();
    return { ok: true, sentAt: new Date().toISOString() };
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'SCAN_MESSENGER_THREADS') {
      try { reply({ ok: true, rows: visibleThreadCandidates() }); } catch (error) { reply({ ok: false, error: error.message }); }
      return;
    }
    if (message?.type === 'SEND_APPROVED_MESSENGER_REPLY') {
      sendApprovedReply(message.text).then(reply).catch(error => reply({ ok: false, error: error.message }));
      return true;
    }
  });
})();
