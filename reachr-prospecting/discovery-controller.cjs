function selectDiscoveryController(tabs = []) {
  const pages = tabs.filter(tab => tab?.type === 'page');
  return pages.find(tab => /fb-autoposter\/dashboard(?:\.html)?(?:[/?#]|$)/.test(tab.url || ''))
    || pages.find(tab => /(^|\.)facebook\.com\/groups\//.test(new URL(tab.url).hostname + new URL(tab.url).pathname))
    || pages.find(tab => /(^|\.)facebook\.com$/i.test(new URL(tab.url).hostname))
    || pages[0]
    || null;
}

function dashboardIsUsable(tab) {
  return Boolean(tab && /fb-autoposter\/dashboard(?:\.html)?(?:[/?#]|$)/.test(tab.url || ''));
}

module.exports = { selectDiscoveryController, dashboardIsUsable };
