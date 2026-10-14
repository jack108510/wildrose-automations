"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FormEvent, useState } from "react";
import RoseWidget from "@/components/RoseWidget";

export default function Home() {
  const reducedMotion = !!useReducedMotion();
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState("");
  const rise = (delay: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, delay: reducedMotion ? 0 : delay, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
  });

  function submitWebsite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let entered = website.trim();
    if (!entered) { setFormError("Enter your website address."); return; }
    if (!/^https?:\/\//i.test(entered)) entered = `https://${entered}`;
    try {
      const url = new URL(entered);
      if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) throw new Error();
      window.location.assign(`/ai-tool-mockup-final.html?website=${encodeURIComponent(url.href)}`);
    } catch { setFormError("Enter a valid public website address."); }
  }

  return <main>
    <section className="hero" id="rose" aria-label="Rose by Wildrose Automations">
      <nav className="hero-nav" aria-label="Wildrose navigation">
        <a className="logo-link" href="/" aria-label="Wildrose Automations home"><img src="/logos/wildrose.png" alt="" /><span>WILDROSE</span></a>
        <div className="nav-links"><a href="#rose">ROSE</a><a href="#try-rose">ROSE SETUP</a><a href="/ai-tool-mockup-final.html?buy=1">PRICING</a><a href="https://workground.wildroseautomations.ca/login.html">LOGIN</a></div>
        <a className="buy-button" href="/ai-tool-mockup-final.html?buy=1">BUY AGENT <span aria-hidden="true">↗</span></a>
      </nav>

      <div className="hero-body">
        <div className="hero-copy">
          <motion.div className="eyebrow" {...rise(0.12)}><span className="eyebrow-dot" /> WILDROSE / ROSE AI <span className="eyebrow-index">01 / 03</span></motion.div>
          <motion.h1 {...rise(0.22)}>Your website<br />should <em>talk.</em></motion.h1>
          <motion.p className="hero-lead" {...rise(0.38)}>The front desk your website has been missing. Rose answers visitors in voice or chat, gathers the details, and gets them to you while they’re still there.</motion.p>
          <motion.div className="hero-actions" {...rise(0.52)}>
            <a className="primary-action" href="#try-rose">See Rose on my site <span aria-hidden="true">↗</span></a>
            <a className="quiet-action" href="/ai-tool-mockup-final.html?buy=1">Explore plans <span aria-hidden="true">→</span></a>
          </motion.div>
          <motion.div className="capabilities" {...rise(0.7)} aria-label="Rose capabilities"><span><b>01</b> VOICE</span><span><b>02</b> CHAT</span><span><b>03</b> QUOTE INTAKE</span></motion.div>
        </div>

        <div className="rose-stage">
          <div className="stage-grid" aria-hidden="true" />
          <div className="stage-halo" aria-hidden="true" />
          <div className="stage-ring stage-ring-one" aria-hidden="true" />
          <div className="stage-ring stage-ring-two" aria-hidden="true" />
          <div className="stage-topline"><span className="live-dot" /> LIVE ON THIS PAGE <span>VOICE + CHAT</span></div>
          <motion.div className="widget-entry" {...rise(0.58)}><RoseWidget /></motion.div>
          <div className="stage-bottomline"><span>MEET YOUR NEW FRONT DESK</span><span>ASK ROSE A QUESTION ↗</span></div>
        </div>
      </div>
      <div className="hero-footer"><span>WILDROSE AUTOMATIONS © 2026</span><a href="#try-rose">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
    </section>

    <section className="try-section" id="try-rose">
      <div className="try-inner"><span className="try-kicker">02 / SEE IT FOR YOURSELF</span><h2>Rose, on <em>your</em> website.</h2><p>Enter a public website address. We’ll build an interactive preview with Rose on your site. Nothing is installed.</p>
        <form onSubmit={submitWebsite} noValidate><label htmlFor="website">YOUR WEBSITE</label><div className="try-input-row"><input id="website" type="url" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" value={website} onChange={event => { setWebsite(event.target.value); setFormError(""); }} /><button type="submit">Build my preview <span aria-hidden="true">→</span></button></div>{formError && <span className="form-error" role="alert">{formError}</span>}</form>
      </div>
    </section>
  </main>;
}
