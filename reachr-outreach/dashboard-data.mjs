const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Edmonton', year: 'numeric', month: '2-digit', day: '2-digit'
});

const POSITIVE_REPLY_STATUSES = new Set([
  'waiting_for_email',
  'information_meeting',
  'meeting_booked',
  'interested',
  'qualified'
]);

function localDate(value) {
  return DATE_FORMATTER.format(value);
}

function isMarketplaceRecord(record) {
  return JSON.stringify(record).toLowerCase().includes('marketplace');
}

function addToDay(days, date, field) {
  if (!date) return;
  days[date] ||= { date, sent: 0, replies: 0, positiveReplies: 0 };
  days[date][field] += 1;
}

export function summarizeOutreach(records, now = new Date()) {
  const today = localDate(now);
  const confirmed = records.filter(record =>
    ['messenger_confirmed', 'messenger_ui_confirmed'].includes(record.delivery) && !isMarketplaceRecord(record)
  );
  const replied = confirmed.filter(record => Boolean(record.conversationStatus));
  const positiveReplies = replied.filter(record => POSITIVE_REPLY_STATUSES.has(record.conversationStatus));
  const sentToday = confirmed.filter(record => record.sentAt && localDate(new Date(record.sentAt)) === today);
  const days = {};

  for (const record of confirmed) {
    addToDay(days, record.sentAt && localDate(new Date(record.sentAt)), 'sent');
  }
  // The ledger has no inbound-reply timestamp. Use the recorded follow-up timestamp
  // as the reply-event day, and never manufacture a reply date from the send date.
  for (const record of replied) {
    addToDay(days, record.lastReplySentAt && localDate(new Date(record.lastReplySentAt)), 'replies');
  }
  for (const record of positiveReplies) {
    addToDay(days, record.lastReplySentAt && localDate(new Date(record.lastReplySentAt)), 'positiveReplies');
  }

  const dailyBreakdown = Object.values(days).sort((a, b) => b.date.localeCompare(a.date));
  const recentSends = [...sentToday].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)).slice(0, 8).map(record => ({
    businessName: record.businessName,
    sentAt: record.sentAt,
    delivery: record.delivery,
    routeType: record.routeType || 'Messenger'
  }));

  return {
    timezone: 'America/Edmonton',
    localDate: today,
    sentToday: sentToday.length,
    totalConfirmed: confirmed.length,
    replies: replied.length,
    positiveReplies: positiveReplies.length,
    needsReview: records.filter(record => record.status === 'needs_review').length,
    queued: records.filter(record => record.status === 'queued').length,
    dailyBreakdown,
    recentSends,
    updatedAt: new Date().toISOString()
  };
}
