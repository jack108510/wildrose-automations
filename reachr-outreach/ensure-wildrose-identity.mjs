import http from 'node:http';

const CDP = 'http://127.0.0.1:9223/json/list';
const PAGE_NAME = 'Wildrose Automations';
const PAGE_URL = 'https://www.facebook.com/profile.php?id=61572103491433';

function getJson(url) {
  return new Promise((resolve, reject) => http.get(url, response => {
    let body = '';
    response.on('data', chunk => { body += chunk; });
    response.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
    });
  }).on('error', reject));
}

async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  });
  return {
    socket,
    call(method, params = {}) {
      return new Promise(resolve => {
        const id = ++nextId;
        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  };
}

async function extensionEval(cdp, expression) {
  const response = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Reachr extension evaluation failed');
  return response.result?.result?.value;
}

export function pageSwitchCallbackVerified(switchResult) {
  return switchResult?.response?.success === true;
}

export function pageContextVerified(evidence = {}) {
  return evidence.createPostAs === true || (evidence.pageTimeline === true && evidence.commentAs === true);
}

export async function ensureWildroseIdentity() {
  const targets = await getJson(CDP);
  const extensionTarget = targets.find(target => target.url === 'chrome-extension://nglcanaclcaahancoecenliekemolfgp/background.js');
  if (!extensionTarget) throw new Error('Reachr Chrome extension service worker is unavailable. Refusing to send without Page identity verification.');
  const extension = await connect(extensionTarget.webSocketDebuggerUrl);
  try {
    const tabs = await extensionEval(extension, `new Promise(resolve => chrome.tabs.query({url:'*://www.facebook.com/*'}, tabs => resolve(tabs.map(tab => ({id:tab.id,url:tab.url})))) )`);
    let pageTab = tabs.find(tab => tab.url.includes('profile.php?id=61572103491433'));
    if (!pageTab) {
      pageTab = await extensionEval(extension, `new Promise(resolve => chrome.tabs.create({url:${JSON.stringify(PAGE_URL)}, active:false}, tab => resolve({id:tab.id,url:tab.url})))`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    const injected = await extensionEval(extension, `new Promise(resolve => chrome.scripting.executeScript({target:{tabId:${pageTab.id}},files:['content.js']}, () => resolve({error:chrome.runtime.lastError?.message||null})))`);
    if (injected?.error) throw new Error(`Could not inject Reachr Page switcher: ${injected.error}`);
    // The Page switch may navigate/close the source tab. A successful managed-Page
    // switch lets us proceed to the Messenger-specific actor gate below; it is not
    // itself treated as proof of the Messenger composer actor.
    const switchResult = await extensionEval(extension, `new Promise(resolve => { const timer=setTimeout(() => resolve({timeout:true}), 10000); chrome.tabs.sendMessage(${pageTab.id},{type:'SWITCH_FACEBOOK_IDENTITY',identityName:${JSON.stringify(PAGE_NAME)},identityUrl:${JSON.stringify(PAGE_URL)}}, response => { clearTimeout(timer); resolve({response,error:chrome.runtime.lastError?.message||null}); }); })`);
    // The callback only proves that the switch request was accepted. A navigation
    // timeout is not success, and even an accepted callback must be followed by
    // first-party Page-context verification below.
    const switchCallbackAccepted = pageSwitchCallbackVerified(switchResult);
    await new Promise(resolve => setTimeout(resolve, switchCallbackAccepted ? 5000 : 7000));

    const freshTargets = (await getJson(CDP)).filter(target => /https:\/\/(www\.)?facebook\.com\//.test(target.url));
    if (!freshTargets.length) throw new Error('Facebook tab disappeared while switching identity.');
    let verified = false;
    for (const pageTarget of freshTargets) {
      const page = await connect(pageTarget.webSocketDebuggerUrl);
      try {
        const verification = await page.call('Runtime.evaluate', { expression: `(() => ({switchPrompt:/Switch into Wildrose Automations/.test(document.body.innerText||''),pageTimeline:[...document.querySelectorAll('[aria-label]')].some(el => /Wildrose Automations.*s Timeline/i.test(el.getAttribute('aria-label')||'')),commentAs:[...document.querySelectorAll('[aria-label]')].some(el => /Comment as Wildrose Automations/i.test(el.getAttribute('aria-label')||'')),createPostAs:(document.body.innerText||'').includes("What's on your mind, Wildrose Automations")}))()`, returnByValue: true });
        const value = verification.result?.result?.value || {};
        if (!value.switchPrompt && pageContextVerified(value)) { verified = true; break; }
      } finally { page.socket.close(); }
    }
    if (!verified) throw new Error('Wildrose Page identity did not verify; refusing to send.');
    return { verified: true, identity: PAGE_NAME };
  } finally { extension.socket.close(); }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  ensureWildroseIdentity()
    .then(result => console.log(`IDENTITY_OK:${result.identity}`))
    .catch(error => { console.error(`IDENTITY_NOT_READY:${error.message}`); process.exit(1); });
}
