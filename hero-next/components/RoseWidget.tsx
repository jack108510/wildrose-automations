"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = { open: boolean; onOpen: () => void; reducedMotion: boolean };

export default function RoseWidget({ open, onOpen, reducedMotion }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tiltX = useSpring(x, { stiffness: 65, damping: 24 });
  const tiltY = useSpring(y, { stiffness: 65, damping: 24 });

  useEffect(() => {
    if (!mount.current) return;
    let script = document.getElementById("rose-hero-runtime") as HTMLScriptElement | null;
    if (!script && !mount.current.querySelector(".wr-ai")) {
      script = document.createElement("script");
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

  useEffect(() => {
    if (!ready || open) return;
    const panel = mount.current?.querySelector(".wr-panel");
    const status = panel?.querySelector(".wr-status");
    const note = panel?.querySelector(".wr-note");
    const orb = panel?.querySelector(".wr-orb");
    const voice = panel?.querySelector(".wr-voice > div");
    if (!panel || !status || !note || !orb || !voice) return;
    status.textContent = "Listening";
    note.textContent = "A short preview of a Rose conversation.";
    orb.classList.add("live", "listening");
    panel.classList.add("rose-cinematic");
    const transcript = document.createElement("div");
    transcript.className = "wr-live-transcript has-lines rose-demo-transcript";
    transcript.innerHTML = '<div class="wr-live-label">Conversation preview</div><div class="wr-live-lines"></div>';
    voice.appendChild(transcript);
    const lines = transcript.querySelector(".wr-live-lines");
    const timers: number[] = [];
    function typeLine(message: string, fromVisitor: boolean) {
      if (!lines) return;
      const line = document.createElement("div");
      line.className = `wr-live-line${fromVisitor ? " user" : ""}`;
      lines.appendChild(line);
      if (reducedMotion) { line.textContent = message; return; }
      let cursor = 0;
      const timer = window.setInterval(() => {
        line.textContent = message.slice(0, ++cursor);
        if (cursor >= message.length) window.clearInterval(timer);
      }, 24);
      timers.push(timer);
    }
    timers.push(window.setTimeout(() => typeLine("Visitor: Do you do weekend furnace repairs?", true), reducedMotion ? 0 : 900));
    timers.push(window.setTimeout(() => {
      typeLine("Rose: Yes — want me to book Saturday morning?", false);
      status.textContent = "Rose is answering";
      orb.classList.add("speaking");
    }, reducedMotion ? 0 : 2500));
    return () => { timers.forEach(timer => { window.clearTimeout(timer); window.clearInterval(timer); }); transcript.remove(); };
  }, [ready, open, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const panel = mount.current?.querySelector(".wr-panel");
    panel?.classList.remove("rose-cinematic");
    panel?.querySelector(".wr-orb")?.classList.remove("live", "listening", "speaking");
    const status = panel?.querySelector(".wr-status");
    const note = panel?.querySelector(".wr-note");
    if (status) status.textContent = "Ready when you are";
    if (note) note.textContent = "Tap start and speak naturally.";
    panel?.querySelector(".rose-demo-transcript")?.remove();
  }, [open]);

  return <div className={`widget-position ${open ? "widget-open" : ""}`}>
    <motion.div
      className="widget-3d-shell"
      initial={reducedMotion ? false : { opacity: 0, y: -100, scale: 0.55 }}
      animate={{ opacity: 1, y: reducedMotion ? 0 : [0, -9, 0], scale: open ? 1 : 0.78, rotateZ: open ? 0 : 25 }}
      transition={{ opacity: { duration: 0.7, delay: 0.75 }, scale: { duration: 0.8, delay: 0.75 }, rotateZ: { duration: 0.75 }, y: reducedMotion || open ? { duration: 0.6 } : { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.5 } }}
      style={{ rotateX: open || reducedMotion ? 0 : tiltX, rotateY: open || reducedMotion ? 0 : tiltY }}
      onPointerMove={event => {
        if (open || reducedMotion) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -10);
        y.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 12);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      <div className="widget-edge" aria-hidden="true" />
      <div className="widget-face">
        <div id="liveRoseVoice" ref={mount} />
        {!open && <button type="button" className="widget-activate" onClick={onOpen} aria-label="Open the live Rose assistant"><span>OPEN LIVE ROSE <b>↗</b></span></button>}
        <div className="widget-sheen" aria-hidden="true" />
      </div>
    </motion.div>
    {open && <p className="widget-live-hint">Rose is live. Choose Chat or Voice to try it.</p>}
  </div>;
}
