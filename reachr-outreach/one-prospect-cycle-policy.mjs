import { pickNextProspect } from './send-next-prospect.mjs';
import { selectRouteCandidates } from './route-state-policy.mjs';

export const DEFAULT_SOURCE_MAX_GROUPS = 4;
export const DEFAULT_SOURCE_ADDITIONS = 8;
export const DEFAULT_VERIFY_LIMIT = 5;

/**
 * Produce a non-mutating plan for one serialized prospect cycle. Discovery and
 * verification can replenish the queue, but dispatch is capped at one exact,
 * recipient-verified Messenger send in the cycle.
 */
export function planOneProspectCycle({
  queue,
  discovered,
  state,
  now = new Date(),
  verifyLimit = DEFAULT_VERIFY_LIMIT,
  sourceMaxGroups = DEFAULT_SOURCE_MAX_GROUPS,
  sourceAdditions = DEFAULT_SOURCE_ADDITIONS,
} = {}) {
  const outbound = pickNextProspect(queue, now);
  return {
    source: {
      maxGroups: Number(sourceMaxGroups),
      additionsTarget: Number(sourceAdditions),
    },
    routeCandidates: selectRouteCandidates(discovered, queue?.prospects || [], state || { records: {} }, now, Number(verifyLimit)),
    send: {
      ...outbound,
      maxOutboundMessages: 1,
    },
  };
}
