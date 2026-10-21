const ALARM = 'reachr-daily-review';
function nextNine() { const now = new Date(), next = new Date(now); next.setHours(9, 0, 0, 0); if (next <= now) next.setDate(next.getDate() + 1); return next.getTime(); }
async function schedule() { await chrome.alarms.clear(ALARM); chrome.alarms.create(ALARM, { when: nextNine(), periodInMinutes: 1440 }); }
chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) { chrome.action.setBadgeBackgroundColor({ color: '#d17a48' }); chrome.action.setBadgeText({ text: '50' }); } });
