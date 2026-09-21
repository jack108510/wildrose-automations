import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("rose-onboarding.html", "utf8");
assert.match(page, /params\.get\('proof'\)===\'1\'/, "onboarding must accept a proof handoff URL");
assert.match(page, /name="proof"/, "proof onboarding must submit an explicit proof flag");
assert.match(page, /7-day proof/, "proof onboarding must clearly state the time-bounded offer");
assert.match(page, /15 included AI minutes/, "proof onboarding must state the included-use cap");
console.log("rose proof onboarding page tests passed");
