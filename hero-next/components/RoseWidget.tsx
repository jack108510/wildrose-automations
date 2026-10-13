"use client";

import { useEffect, useRef, useState } from "react";

export default function RoseWidget() {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mount.current) return;
    if (!document.getElementById("rose-hero-runtime") && !mount.current.querySelector(".wr-ai")) {
      const script = document.createElement("script");
      script.id = "rose-hero-runtime";
      script.src = "/wildrose-widget-sandbox.js";
      script.dataset.apiBase = "https://wildrose-widget.wildeautomations.com";
      script.dataset.title = "Rose";
      script.dataset.subtitle = "AI intake assistant";
      script.dataset.accent = "#ff5722";
      script.dataset.logo = "/logos/wildrose.png";
      script.dataset.mount = "#liveRoseVoice";
      script.dataset.inline = "true";
      script.dataset.defaultView = "voice";
      script.dataset.fallbackUrl = "mailto:jack@wildroseautomations.ca";
      script.dataset.greeting = "Hi, I’m Rose. Ask questions about our services or tell me what you need a quote for, and I’ll help you reach the owner.";
      script.dataset.placeholder = "Ask a question or describe your request…";
      script.dataset.businessContext = "You are the visitor-facing assistant for Wildrose Automations. Help visitors with FAQs, capture quote requests and contact details, and offer owner handoff. Do not promise completed bookings, payments or integrations.";
      document.body.appendChild(script);
    }
    const observer = new MutationObserver(() => {
      if (mount.current?.querySelector(".wr-ai")) setReady(true);
    });
    observer.observe(mount.current, { childList: true, subtree: true });
    if (mount.current.querySelector(".wr-ai")) setReady(true);
    return () => observer.disconnect();
  }, []);

  return <div className="rose-widget-wrap">
    <div id="liveRoseVoice" className="rose-widget-mount" ref={mount} />
    {!ready && <div className="rose-loading" role="status">Opening Rose…</div>}
  </div>;
}
