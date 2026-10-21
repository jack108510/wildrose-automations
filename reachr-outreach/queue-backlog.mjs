import fs from 'node:fs';

export function queuedCount(queue) {
  return Array.isArray(queue?.prospects)
    ? queue.prospects.filter(prospect => prospect?.status === 'queued').length
    : 0;
}

export function hasSufficientQueuedBacklog(queue, minimum) {
  return queuedCount(queue) >= Number(minimum);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [queuePath, minimum = '10'] = process.argv.slice(2);
  if (!queuePath) throw Error('Usage: queue-backlog.mjs <prospects.json> [minimum]');
  const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  process.stdout.write(`${queuedCount(queue)}\n`);
}
