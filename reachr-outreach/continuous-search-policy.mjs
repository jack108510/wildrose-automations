export function advanceSourceCursor(state = {}, { totalSources, batchSize, foundEligible }) {
  const sourceOffset = Math.max(0, Number(state.sourceOffset) || 0);
  const pass = Math.max(0, Number(state.pass) || 0);
  const total = Math.max(0, Number(totalSources) || 0);
  const batch = Math.max(1, Number(batchSize) || 1);
  const preserved = state.sourceOrderSeed ? { sourceOrderSeed: state.sourceOrderSeed } : {};
  const nextOffset = sourceOffset + batch;
  if (foundEligible) {
    return nextOffset >= total
      ? { sourceOffset: 0, pass: pass + 1, ...preserved, outcome: 'found_eligible' }
      : { sourceOffset: nextOffset, pass, ...preserved, outcome: 'found_eligible' };
  }
  if (nextOffset >= total) return { sourceOffset: 0, pass: pass + 1, ...preserved, outcome: 'source_exhausted' };
  return { sourceOffset: nextOffset, pass, ...preserved, outcome: 'continue' };
}
