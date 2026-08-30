const enabled = document.querySelector('#enabled');
const interval = document.querySelector('#interval');

chrome.storage.local.get({ enabled: true, intervalMs: 10000 }).then((s) => {
  enabled.checked = s.enabled;
  interval.value = Math.round(s.intervalMs / 1000);
});

document.querySelector('#save').addEventListener('click', async () => {
  const seconds = Math.max(5, Number(interval.value) || 10);
  await chrome.storage.local.set({ enabled: enabled.checked, intervalMs: seconds * 1000 });
  window.close();
});
