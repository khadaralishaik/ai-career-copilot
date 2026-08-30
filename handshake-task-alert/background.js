const DEFAULTS = { enabled: true, intervalMs: 10000 };

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set(current);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'HANDSHAKE_TASK_FOUND') return;

  chrome.storage.local.get({ enabled: true }).then(({ enabled }) => {
    if (!enabled) return;
    const tabId = sender.tab?.id;
    if (tabId) chrome.action.setBadgeText({ tabId, text: 'NEW' });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
    chrome.notifications.create(`handshake-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icon.svg',
      title: 'Handshake AI task available',
      message: message.title || 'A task appears to be available on your dashboard.',
      priority: 2
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'CLEAR_BADGE' && sender.tab?.id) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: '' });
  }
});
