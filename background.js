// Background service worker for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Pranke Extension Scraper installed');
});

// Storage keys
const STORAGE_KEYS = {
  IS_SCRAPING: 'isScraping',
  KEYWORDS: 'keywords',
  CURRENT_KEYWORD_INDEX: 'currentKeywordIndex',
  RESULTS: 'results',
  STATUS: 'status'
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveState') {
    // Save scraping state
    chrome.storage.local.set({
      [STORAGE_KEYS.IS_SCRAPING]: message.isScraping,
      [STORAGE_KEYS.KEYWORDS]: message.keywords,
      [STORAGE_KEYS.CURRENT_KEYWORD_INDEX]: message.currentKeywordIndex,
      [STORAGE_KEYS.RESULTS]: message.results,
      [STORAGE_KEYS.STATUS]: message.status
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'getState') {
    // Get scraping state
    chrome.storage.local.get([
      STORAGE_KEYS.IS_SCRAPING,
      STORAGE_KEYS.KEYWORDS,
      STORAGE_KEYS.CURRENT_KEYWORD_INDEX,
      STORAGE_KEYS.RESULTS,
      STORAGE_KEYS.STATUS
    ], (data) => {
      sendResponse(data);
    });
    return true;
  }
  
  if (message.action === 'addResults') {
    // Add results to existing stored results
    chrome.storage.local.get([STORAGE_KEYS.RESULTS], (data) => {
      const existingResults = data[STORAGE_KEYS.RESULTS] || [];
      const allResults = existingResults.concat(message.results);
      chrome.storage.local.set({
        [STORAGE_KEYS.RESULTS]: allResults
      }, () => {
        sendResponse({ success: true, totalResults: allResults.length });
      });
    });
    return true;
  }
  
  if (message.action === 'clearState') {
    // Clear all scraping state
    chrome.storage.local.remove([
      STORAGE_KEYS.IS_SCRAPING,
      STORAGE_KEYS.KEYWORDS,
      STORAGE_KEYS.CURRENT_KEYWORD_INDEX,
      STORAGE_KEYS.RESULTS,
      STORAGE_KEYS.STATUS
    ], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'downloadJSON' || message.action === 'downloadCSV') {
    // Trigger download via active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'triggerDownload',
          data: message.data,
          filename: message.filename
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }
  
  // Forward status updates to popup
  if (message.action === 'updateStatus' || 
      message.action === 'scrapingComplete' || 
      message.action === 'scrapingError') {
    // These will be handled by popup.js listener
    return false;
  }
});

