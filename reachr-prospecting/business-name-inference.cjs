function tidy(value = '') {
  return String(value).replace(/\s+/g, ' ').replace(/^[\s:–—-]+|[\s,;:–—-]+$/g, '').trim();
}

function inferBusinessName(authorName = '', observedText = '') {
  const text = String(observedText || '');
  const called = text.match(/\b(?:company|business|brand|studio|shop|salon|service)\s+(?:is\s+)?called\s+([A-Z][A-Za-z0-9&'’.-]*(?:\s+(?!I\b|We\b|Our\b|The\b|It\b|They\b)[A-Z&][A-Za-z0-9&'’.-]*){0,5})/);
  if (called?.[1]) return tidy(called[1]);

  const active = text.match(/(?:^|[.!?]\s+)([A-Z][A-Za-z0-9&'’-]+(?:\s+[A-Z&][A-Za-z0-9&'’-]+){1,4})\s+(?:offers|provides|specializes|serves|is accepting)\b/);
  if (active?.[1]) return tidy(active[1]);

  return tidy(authorName);
}

module.exports = { inferBusinessName };
