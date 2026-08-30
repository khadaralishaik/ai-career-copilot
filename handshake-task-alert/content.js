const DEFAULT_INTERVAL = 10000;
const KEYWORDS = [
  'task available',
  'tasks available',
  'available task',
  'start task',
  'begin task',
  'new task',
  'claim task',
  'accept task'
];

let lastSignature = '';
let timer = null;

function visibleText() {
  return (document.body?.innerText || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function findTaskSignal(text) {
  for (const keyword of KEYWORDS) {
    const index = text.indexOf(keyword);
    if (index >= 0) {
      return {
        keyword,
        excerpt: text.slice(Math.max(0, index - 100), Math.min(text.length, index + 180))
      };
    }
  }
  return null;
}

async function check() {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL } = await chrome.storage.local.get({ enabled: true, intervalMs: DEFAULT_INTERVAL });
  if (!enabled) return;

  const text = visibleText();
  const signal = findTaskSignal(text);
  const signature = signal ? `${signal.keyword}|${signal.excerpt}` : '';

  if (signal && signature !== lastSignature) {
    lastSignature = signature;
    chrome.runtime.sendMessage({
      type: 'HANDSHAKE_TASK_FOUND',
      title: `Detected “${signal.keyword}” on your dashboard.`,
      excerpt: signal.excerpt
    });
  }

  if (!signal) lastSignature = '';
  schedule(intervalMs);
}

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(check, Math.max(5000, Number(ms) || DEFAULT_INTERVAL));
}

chrome.storage.onChanged.addListener(() => schedule(DEFAULT_INTERVAL));
check();
