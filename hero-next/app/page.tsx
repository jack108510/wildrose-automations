"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { FormEvent, useState } from "react";
import RoseWidget from "@/components/RoseWidget";

const TileField = dynamic(() => import("@/components/TileField"), { ssr: false });

function Reveal({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  return <span className={className} aria-label={text}>
    {Array.from(text).map((letter, index) => <motion.span key={`${letter}-${index}`} aria-hidden="true" className="reveal-letter"
      initial={reduced ? false : { opacity: 0, filter: "blur(12px)", y: 24 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.6, delay: reduced ? 0 : 0.35 + index * 0.038, ease: [0.2, 0.7, 0.2, 1] }}>
      {letter === " " ? "\u00a0" : letter}
    </motion.span>)}
  </span>;
}

function StatCard() {
  return <motion.div className="stat-card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.7 }}>
    <div className="stat-head"><span className="stat-orb" aria-hidden="true" /><span><strong>Rose</strong><small>Front Desk Agent</small></span><span className="stat-more">•••</span></div>
    <div className="stat-rule" />
    <span className="stat-label">Quote requests captured <em>Sample data</em></span>
    <div className="stat-bottom"><strong>37</strong><span className="stat-pill">+18%</span><svg viewBox="0 0 100 35" aria-hidden="true"><motion.path d="M2 30 L18 27 L30 25 L42 20 L54 23 L67 14 L79 16 L90 8 L98 5" fill="none" stroke="#d7262e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.7, delay: 1.7 }} /></svg></div>
  </motion.div>;
}

export default function Home() {
  const reducedMotion = !!useReducedMotion();
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState("");

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
      <div className="field" aria-hidden="true"><TileField open={widgetOpen} reducedMotion={reducedMotion} /></div>
      <div className="field-mist" aria-hidden="true" />

      <nav className="hero-nav" aria-label="Wildrose navigation">
        <a className="logo-link" href="/" aria-label="Wildrose Automations home"><img src="/logos/wildrose.png" alt="" /><span>WILDROSE</span></a>
        <div className="nav-links"><a href="#rose">ROSE</a><a href="#try-rose">ROSE SETUP</a><a href="/ai-tool-mockup-final.html?buy=1">PRICING</a><a href="https://jack108510.github.io/rose-dashboard-preview/login.html">LOGIN</a></div>
        <a className="buy-button" href="/ai-tool-mockup-final.html?buy=1">BUY AGENT <span aria-hidden="true">↗</span></a>
      </nav>

      <div className="hero-headline">
        <div className="hero-kicker">WILDROSE AUTOMATIONS <span>—</span> INTRODUCING ROSE</div>
        <h1><span className="title-line-one"><Reveal text="Your Website" /></span><span className="title-line-two"><span className="title-should"><Reveal text="Should" /></span><span className="title-talk"><Reveal text="Talk." /></span><span className="title-rose">ROSE<span className="title-spark">✦</span></span></span></h1>
      </div>

      <div className={`hero-object${widgetOpen ? " is-open" : ""}`}><span className="live-overline">LIVE ON THIS PAGE <span aria-hidden="true">↘</span></span><RoseWidget open={widgetOpen} onOpen={() => setWidgetOpen(true)} reducedMotion={reducedMotion} /></div>

      <div className="corner-left">
        <motion.p className="corner-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>YOUR BUSINESS, ALWAYS ON.<br /><span>ROSE ANSWERS QUESTIONS, CAPTURES QUOTE REQUESTS, AND GETS THE DETAILS TO YOU WHILE YOUR VISITOR IS STILL THERE.</span></motion.p>
        <StatCard />
      </div>
      <div className="corner-right"><button type="button" className="plus-button" aria-label="See Rose on my site" onClick={() => document.getElementById("try-rose")?.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" })}>+</button><span>SEE ROSE ON MY SITE<br /><em>NOTHING TO INSTALL</em></span></div>
      <div className="hero-bottom-marker">01 / THE FRONT DESK THAT NEVER CLOSES <span>SCROLL TO EXPLORE ↓</span></div>
    </section>

    <section className="try-section" id="try-rose">
      <div className="try-inner"><span className="try-kicker">02 / SEE IT FOR YOURSELF</span><h2>Rose, on <em>your</em> website.</h2><p>Enter a public website address. We’ll build an interactive preview with Rose on your site. Nothing is installed.</p>
        <form onSubmit={submitWebsite} noValidate><label htmlFor="website">YOUR WEBSITE</label><div className="try-input-row"><input id="website" type="url" inputMode="url" autoComplete="url" placeholder="yourbusiness.com" value={website} onChange={event => { setWebsite(event.target.value); setFormError(""); }} /><button type="submit">Build my preview <span aria-hidden="true">→</span></button></div>{formError && <span className="form-error" role="alert">{formError}</span>}</form>
      </div>
    </section>
  </main>;
}
