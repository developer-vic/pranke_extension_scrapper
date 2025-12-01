document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const statusDiv = document.getElementById('status');

  function updateStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
  }

  startBtn.addEventListener('click', async () => {
    try {
      startBtn.disabled = true;
      updateStatus('Starting scraper...', 'info');

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on the correct page
      if (!tab.url.includes('wss.pranke.com/PrankeWebExtensions')) {
        updateStatus('Please navigate to the Pranke TnrSearch page first!', 'error');
        startBtn.disabled = false;
        return;
      }

      // Inject content script and start scraping
      await chrome.tabs.sendMessage(tab.id, { action: 'startScraping' });
      updateStatus('Scraping in progress... Check console for details.', 'info');
      
    } catch (error) {
      console.error('Error:', error);
      updateStatus('Error: ' + error.message, 'error');
      startBtn.disabled = false;
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateStatus') {
      updateStatus(message.text, message.type || 'info');
    } else if (message.action === 'scrapingComplete') {
      updateStatus('Scraping completed! File downloaded.', 'success');
      startBtn.disabled = false;
    } else if (message.action === 'scrapingError') {
      updateStatus('Error: ' + message.text, 'error');
      startBtn.disabled = false;
    }
  });
});

