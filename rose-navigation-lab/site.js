const siteBasePath = new URL(".", document.currentScript.src).pathname;
const pages = [
  { title: "Shipping and delivery", url: `${siteBasePath}shipping.html`, description: "Delivery times, shipping costs, and tracking." },
  { title: "Returns and exchanges", url: `${siteBasePath}returns.html`, description: "Return policy, exchanges, and refunds." },
  { title: "Ridge Shell", url: `${siteBasePath}rain-jacket.html`, description: "Waterproof trail jacket product." },
  { title: "Size guide", url: `${siteBasePath}size-guide.html`, description: "Measurements and jacket sizing." },
];
if (new URLSearchParams(location.search).has("test") && !new URLSearchParams(location.search).has("arrived")) sessionStorage.clear();
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, options = {}) => {
  const url = new URL(input, location.href);
  const json = value => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
  if (url.pathname === "/api/chat/start") return json({ chatId: "rose-navigation-lab" });
  if (url.pathname === "/api/chat/message") {
    const message = String(JSON.parse(options.body || "{}").content || "").toLowerCase();
    const matches = /polic|help pages/.test(message) ? pages.slice(0, 2) : pages.filter(page => {
      if (/ship|deliver|track/.test(message)) return page.url.endsWith("/shipping.html");
      if (/return|refund|exchange/.test(message)) return page.url.endsWith("/returns.html");
      if (/size|fit|measurement/.test(message)) return page.url.endsWith("/size-guide.html");
      if (/jacket|rain|product|ridge|shell/.test(message)) return page.url.endsWith("/rain-jacket.html");
      return false;
    });
    const test = new URLSearchParams(location.search).get("test");
    return json({ reply: matches.length ? "I found these pages for you." : "Try asking for shipping, returns, the rain jacket, or the size guide.", sitePages: matches.map(page => ({ ...page, url: new URL(`${page.url}${test ? `?test=${encodeURIComponent(test)}&arrived=1` : ""}`, location.origin).href })) });
  }
  if (url.pathname === "/api/rose-site-navigation") {
    const query = String(JSON.parse(options.body || "{}").query || "").toLowerCase();
    return json({ ok: true, pages: pages.filter(page => `${page.title} ${page.description}`.toLowerCase().includes(query)).map(page => ({ ...page, url: new URL(page.url, location.origin).href })) });
  }
  if (url.pathname === "/api/rose-site-capabilities") return json({ ok: true });
  return originalFetch(input, options);
};

window.addEventListener("DOMContentLoaded", () => {
  const status = document.querySelector("#lab-status");
  document.querySelectorAll("[data-open-rose]").forEach(button => button.addEventListener("click", () => {
    document.querySelector(".wr-fab")?.click();
    document.querySelector('[data-view="chat"].wr-tab')?.click();
    document.querySelector(".wr-input")?.focus();
  }));
  document.querySelectorAll("[data-rose-prompt]").forEach(button => button.addEventListener("click", () => {
    document.querySelector(".wr-fab")?.click();
    document.querySelector('[data-view="chat"].wr-tab')?.click();
    const input = document.querySelector(".wr-input");
    if (!input) return;
    input.value = button.dataset.rosePrompt;
    document.querySelector(".wr-send")?.click();
    if (status) status.textContent = `Sent: ${input.value || button.dataset.rosePrompt}`;
  }));
  const test = new URLSearchParams(location.search).get("test");
  if (!test) return;
  if (new URLSearchParams(location.search).has("arrived")) {
    const restored = document.querySelector(".wr-panel.open") && document.querySelector(".wr-chat-log")?.textContent.includes("You're on");
    document.body.dataset.testResult = restored ? "pass" : "fail";
    if (status) status.textContent = restored ? `PASS: ${test} navigation and chat restoration` : `FAIL: ${test} chat did not restore`;
    sessionStorage.clear();
    return;
  }
  const prompts = { unique: "take me to shipping", ordinal: "show the policies" };
  const input = document.querySelector(".wr-input");
  document.querySelector(".wr-fab")?.click();
  document.querySelector('[data-view="chat"].wr-tab')?.click();
  input.value = prompts[test] || prompts.unique;
  document.querySelector(".wr-send")?.click();
  if (test === "ordinal") {
    const choose = async () => {
      for (let i = 0; i < 50 && document.querySelectorAll('[data-rose-page-results="true"] a').length < 2; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (document.querySelectorAll('[data-rose-page-results="true"] a').length < 2) return;
      input.value = "open the second one";
      document.querySelector(".wr-send")?.click();
    };
    choose();
  }
  setTimeout(() => {
    if (!new URLSearchParams(location.search).has("arrived")) {
      document.body.dataset.testResult = "fail";
      if (status) status.textContent = `FAIL: ${test} did not navigate`;
    }
  }, 5000);
});
