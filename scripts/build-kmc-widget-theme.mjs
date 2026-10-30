import fs from 'node:fs/promises';
const widget=new URL('../wildrose-widget-sandbox.js',import.meta.url);
const css=await fs.readFile(new URL('../rose-kmc-spark-theme.css',import.meta.url),'utf8');
let source=await fs.readFile(widget,'utf8');
const block=`  /* BEGIN KMC THEME: generated, edit rose-kmc-spark-theme.css */\n  const kmcTheme = ${JSON.stringify(css)};\n  /* END KMC THEME */`;
if(source.includes('/* BEGIN KMC THEME'))source=source.replace(/  \/\* BEGIN KMC THEME[\s\S]*?\/\* END KMC THEME \*\//,block);
else {
 source=source.replace('  const style = document.createElement("style");',block+'\n  const style = document.createElement("style");');
 source=source.replace('style.textContent = css;','style.textContent = css + kmcTheme;');
 source=source.replace('  root.className =',`  if (cfg.businessId === "rose-checkout-muyn52us-ksmk51") root.dataset.clientTheme = "kmc-spark";\n  root.className =`);
}
await fs.writeFile(widget,source);
