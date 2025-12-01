// Content script to interact with Pranke website
let isScraping = false;
let allResults = [];

// Wait for DOM to be ready
function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  });
}

// Save state to storage
async function saveState(keywords, currentIndex, results, status) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'saveState',
      isScraping: true,
      keywords: keywords,
      currentKeywordIndex: currentIndex,
      results: results,
      status: status
    }, (response) => {
      resolve(response);
    });
  });
}

// Get state from storage
async function getState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      resolve(response);
    });
  });
}

// Add results to storage
async function addResultsToStorage(results) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'addResults',
      results: results
    }, (response) => {
      resolve(response);
    });
  });
}

// Clear state from storage
async function clearState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'clearState' }, (response) => {
      resolve(response);
    });
  });
}

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startScraping') {
    if (!isScraping) {
      waitForDOM().then(() => {
        startScraping();
      });
    }
    sendResponse({ status: 'started' });
  } else if (message.action === 'triggerDownload') {
    // Download CSV file
    downloadCSV(message.data, message.filename);
    sendResponse({ success: true });
  } else if (message.action === 'continueScraping') {
    // Continue scraping from saved state
    waitForDOM().then(() => {
      continueScraping();
    });
    sendResponse({ status: 'continuing' });
  }
  return true;
});

// Check if we should continue scraping on page load
async function checkAndContinueScraping() {
  const state = await getState();
  if (state && state.isScraping) {
    console.log('Found saved scraping state, continuing...');
    // Wait a bit for page to fully load
    await sleep(500);
    continueScraping();
  }
}

// Progress overlay functions
function createProgressOverlay() {
  // Remove existing overlay if any
  const existing = document.getElementById('pranke-scraper-progress');
  if (existing) {
    existing.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'pranke-scraper-progress';
  overlay.innerHTML = `
    <div class="pranke-progress-content">
      <div class="pranke-progress-header">
        <h3>Pranke Scraper Progress</h3>
        <button id="pranke-close-progress" title="Close">×</button>
      </div>
      <div class="pranke-progress-body">
        <div class="pranke-status">Initializing...</div>
        <div class="pranke-progress-bar-container">
          <div class="pranke-progress-bar" id="pranke-progress-bar"></div>
        </div>
        <div class="pranke-stats">
          <div>Current: <span id="pranke-current-keyword">-</span></div>
          <div>Progress: <span id="pranke-progress-text">0/0</span></div>
          <div>Results: <span id="pranke-total-results">0</span></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add close button handler
  const closeBtn = overlay.querySelector('#pranke-close-progress');
  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  return overlay;
}

function updateProgressOverlay(status, currentIndex, totalKeywords, totalResults, currentKeyword) {
  let overlay = document.getElementById('pranke-scraper-progress');
  if (!overlay) {
    overlay = createProgressOverlay();
  }
  
  // Update status
  const statusEl = overlay.querySelector('.pranke-status');
  if (statusEl) {
    statusEl.textContent = status || 'Processing...';
  }
  
  // Update progress bar
  const progressBar = overlay.querySelector('#pranke-progress-bar');
  if (progressBar && totalKeywords > 0) {
    const percentage = ((currentIndex / totalKeywords) * 100).toFixed(1);
    progressBar.style.width = percentage + '%';
  }
  
  // Update stats
  const currentKeywordEl = overlay.querySelector('#pranke-current-keyword');
  if (currentKeywordEl) {
    currentKeywordEl.textContent = currentKeyword || '-';
  }
  
  const progressTextEl = overlay.querySelector('#pranke-progress-text');
  if (progressTextEl) {
    progressTextEl.textContent = `${currentIndex}/${totalKeywords}`;
  }
  
  const totalResultsEl = overlay.querySelector('#pranke-total-results');
  if (totalResultsEl) {
    totalResultsEl.textContent = totalResults || 0;
  }
}

function hideProgressOverlay() {
  const overlay = document.getElementById('pranke-scraper-progress');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Add CSS styles for the progress overlay
function injectProgressStyles() {
  if (document.getElementById('pranke-scraper-styles')) {
    return; // Already injected
  }
  
  const style = document.createElement('style');
  style.id = 'pranke-scraper-styles';
  style.textContent = `
    #pranke-scraper-progress {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: white;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 300px;
      max-width: 400px;
      font-family: Arial, sans-serif;
    }
    
    .pranke-progress-content {
      padding: 0;
    }
    
    .pranke-progress-header {
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 6px 6px 0 0;
    }
    
    .pranke-progress-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: bold;
    }
    
    #pranke-close-progress {
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      line-height: 24px;
      border-radius: 4px;
    }
    
    #pranke-close-progress:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .pranke-progress-body {
      padding: 16px;
    }
    
    .pranke-status {
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .pranke-progress-bar-container {
      width: 100%;
      height: 20px;
      background: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    
    .pranke-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 10px;
    }
    
    .pranke-stats {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 12px;
      color: #666;
    }
    
    .pranke-stats div {
      display: flex;
      justify-content: space-between;
    }
    
    .pranke-stats span {
      font-weight: bold;
      color: #333;
    }
  `;
  document.head.appendChild(style);
}

// Initialize: check for saved state when page loads
waitForDOM().then(() => {
  // Inject styles
  injectProgressStyles();
  
  // Check for saved state and show progress if scraping
  setTimeout(async () => {
    const state = await getState();
    if (state && state.isScraping) {
      const keywords = state.keywords || [];
      const currentIndex = state.currentKeywordIndex || 0;
      const results = state.results || [];
      updateProgressOverlay(
        state.status || 'Continuing...',
        currentIndex,
        keywords.length,
        results.length,
        keywords[currentIndex] || ''
      );
    }
    checkAndContinueScraping();
  }, 500);
});

async function loadKeywords() {
  try {
    const response = await fetch(chrome.runtime.getURL('keywords.txt'));
    const text = await response.text();
    const keywords = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    console.log(`Loaded ${keywords.length} keywords`);
    return keywords;
  } catch (error) {
    console.error('Error loading keywords:', error);
    return []; // Return empty array on error
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findRadioButton() {
  // Look for radio button with "starts with" text
  const radioButtons = document.querySelectorAll('input[type="radio"]');
  for (let radio of radioButtons) {
    // Check associated label
    const label = document.querySelector(`label[for="${radio.id}"]`) || 
                  radio.parentElement.querySelector('label') ||
                  radio.closest('label');
    if (label && label.textContent.toLowerCase().includes('starts with')) {
      return radio;
    }
    
    // Check parent element text
    const parent = radio.parentElement;
    if (parent && parent.textContent.toLowerCase().includes('starts with')) {
      return radio;
    }
    
    // Check nearby text nodes
    const nextSibling = radio.nextSibling;
    if (nextSibling && nextSibling.textContent && 
        nextSibling.textContent.toLowerCase().includes('starts with')) {
      return radio;
    }
  }
  
  // Alternative: look for radio button by value or name
  const startsWithRadio = Array.from(radioButtons).find(rb => {
    const parentText = rb.parentElement?.textContent?.toLowerCase() || '';
    return parentText.includes('starts with');
  });
  return startsWithRadio;
}

function findSearchInput() {
  // Look for input box - could be text input or textarea
  const inputs = document.querySelectorAll('input[type="text"], textarea');
  // Usually the search input is the first text input
  return inputs[0] || document.querySelector('input[type="text"]');
}

function findSearchButton() {
  // Look for search button - could be input[type="submit"] or button
  const buttons = document.querySelectorAll('input[type="submit"], button');
  for (let btn of buttons) {
    const text = btn.value || btn.textContent || '';
    if (text.toLowerCase().includes('search')) {
      return btn;
    }
  }
  // Fallback: return first submit button
  return document.querySelector('input[type="submit"]') || 
         document.querySelector('button[type="submit"]');
}

function extractTableData() {
  const table = document.querySelector('table#GrdResults');
  if (!table) {
    console.log('Table not found');
    return [];
  }

  const rows = table.querySelectorAll('tbody tr');
  const results = [];
  
  // Skip header row (first row)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length >= 3) {
      const nameCell = cells[0];
      const name = nameCell.textContent.trim();
      
      // Extract name text (might have warning icon or link)
      let nameText = name;
      const nameSpan = nameCell.querySelector('span[style*="color: rgb(90,90,90)"]');
      if (nameSpan) {
        nameText = nameSpan.textContent.trim();
      }
      
      const tnr = cells[1]?.textContent?.trim() || '';
      const gln = cells[2]?.textContent?.trim() || '';
      
      // Get download links - extract URL or link text
      const customerLink = cells[3]?.querySelector('a[href*="TnrDownload"]');
      const senderLink = cells[4]?.querySelector('a[href*="TnrDownload"]');
      
      const customerIniFile = customerLink ? customerLink.href : '';
      const senderIniFile = senderLink ? senderLink.href : '';
      
      // Use exact table header names
      const result = {
        "NAME": nameText,
        "TNR": tnr,
        "GLN/UNB-ID": gln,
        "CUSTOMER .INI FILE": customerIniFile,
        "SENDER .INI FILE": senderIniFile
      };
      
      results.push(result);
    }
  }
  
  return results;
}

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return stringValue;
}

function downloadCSV(data, filename) {
  if (!data || data.length === 0) {
    console.warn('No data to download');
    return;
  }
  
  // Define column order (matching table headers)
  const columns = ['NAME', 'TNR', 'GLN/UNB-ID', 'CUSTOMER .INI FILE', 'SENDER .INI FILE'];
  
  // Create CSV header
  const header = columns.map(escapeCSV).join(',');
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => escapeCSV(row[col] || '')).join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function performSearch(keyword, keywords, currentIndex) {
  console.log(`Searching for keyword: ${keyword}`);
  
  // Save state before clicking search (page will reload)
  await saveState(keywords, currentIndex, allResults, 
    `About to search for: ${keyword}`);
  
  // Find and select "starts with" radio button
  const radioBtn = findRadioButton();
  if (radioBtn) {
    radioBtn.checked = true;
    radioBtn.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(500);
  } else {
    console.warn('Could not find "starts with" radio button');
  }
  
  // Find and fill search input
  const searchInput = findSearchInput();
  if (!searchInput) {
    throw new Error('Could not find search input box');
  }
  
  searchInput.value = keyword;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
  
  // Find and click search button (this will cause page reload)
  const searchButton = findSearchButton();
  if (!searchButton) {
    throw new Error('Could not find search button');
  }
  
  // Click the button - page will reload
  searchButton.click();
  
  // After page reload, the checkAndContinueScraping function will continue
  // We don't wait here because the page is about to reload
}

async function startScraping() {
  if (isScraping) {
    console.log('Scraping already in progress');
    return;
  }
  
  isScraping = true;
  allResults = [];
  
  // Clear any previous state
  await clearState();
  
  try {
    // Load keywords
    const keywords = await loadKeywords();
    console.log(`Loaded ${keywords.length} keywords:`, keywords);
    
    // Show progress overlay
    updateProgressOverlay(
      `Starting to process ${keywords.length} keywords...`,
      0,
      keywords.length,
      0,
      keywords[0] || ''
    );
    
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      text: `Starting to process ${keywords.length} keywords...`,
      type: 'info'
    });
    
    // Save initial state
    await saveState(keywords, 0, [], 'Starting scraping');
    
    // Start with first keyword
    await processNextKeyword(keywords, 0);
    
  } catch (error) {
    console.error('Scraping error:', error);
    chrome.runtime.sendMessage({
      action: 'scrapingError',
      text: error.message
    });
    isScraping = false;
    await clearState();
    hideProgressOverlay();
  }
}

async function continueScraping() {
  const state = await getState();
  
  if (!state || !state.isScraping) {
    console.log('No active scraping state found');
    return;
  }
  
  // Prevent multiple instances
  if (isScraping) {
    console.log('Scraping already in progress');
    return;
  }
  
  isScraping = true;
  allResults = state.results || [];
  const keywords = state.keywords || [];
  let currentIndex = state.currentKeywordIndex || 0;
  
  console.log(`Continuing scraping from keyword ${currentIndex + 1}/${keywords.length}`);
  
  // Update progress overlay
  updateProgressOverlay(
    `Extracting results for: ${keywords[currentIndex]}`,
    currentIndex,
    keywords.length,
    allResults.length,
    keywords[currentIndex] || ''
  );
  
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    text: `Extracting results for keyword ${currentIndex + 1}/${keywords.length}: ${keywords[currentIndex]}`,
    type: 'info'
  });
  
  // Wait for page to fully load after reload
  await sleep(500);
  
  // Wait for table to appear/update
  let attempts = 0;
  while (attempts < 3) {
    const table = document.querySelector('table#GrdResults');
    if (table && table.querySelectorAll('tbody tr').length > 1) {
      console.log('Table found with results');
      break;
    }
    await sleep(500);
    attempts++;
  }
  
  // Extract table data from current page
  const results = extractTableData();
  const keyword = keywords[currentIndex];
  console.log(`Found ${results.length} results for keyword: ${keyword}`);
  
  // Add results to storage (no need to add searchKeyword - JSON matches table headers)
  await addResultsToStorage(results);
  allResults = allResults.concat(results);
  
  // Update progress with new results count
  updateProgressOverlay(
    `Extracted ${results.length} results for: ${keyword}`,
    currentIndex + 1,
    keywords.length,
    allResults.length,
    keywords[currentIndex] || ''
  );
  
  // Move to next keyword
  currentIndex++;
  
  // Check if we're done
  if (currentIndex >= keywords.length) {
    // All keywords processed - download and finish
    await finishScraping();
  } else {
    // Update state and process next keyword
    await saveState(keywords, currentIndex, allResults, 
      `Completed keyword ${currentIndex}/${keywords.length}, moving to next`);
    
    // Small delay before next search
    await sleep(500);
    
    // Process next keyword
    await processNextKeyword(keywords, currentIndex);
  }
}

async function processNextKeyword(keywords, index) {
  if (index >= keywords.length) {
    await finishScraping();
    return;
  }
  
  const keyword = keywords[index];
  
  // Update progress overlay
  updateProgressOverlay(
    `Searching for: ${keyword}`,
    index,
    keywords.length,
    allResults.length,
    keyword
  );
  
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    text: `Processing keyword ${index + 1}/${keywords.length}: ${keyword}`,
    type: 'info'
  });
  
  try {
    await performSearch(keyword, keywords, index);
    // Note: performSearch will cause page reload, so execution continues
    // in continueScraping() after page reloads
  } catch (error) {
    console.error(`Error processing keyword ${keyword}:`, error);
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      text: `Error with keyword ${keyword}: ${error.message}`,
      type: 'error'
    });
    
    // Update progress overlay with error
    updateProgressOverlay(
      `Error with keyword: ${keyword}`,
      index,
      keywords.length,
      allResults.length,
      keyword
    );
    
    // Try next keyword
    await processNextKeyword(keywords, index + 1);
  }
}

async function finishScraping() {
  // Get final results from storage
  const state = await getState();
  const finalResults = state?.results || allResults;
  const keywords = state?.keywords || [];
  
  console.log(`Scraping complete! Total results: ${finalResults.length}`);
  
  // Update progress overlay with completion
  updateProgressOverlay(
    `Scraping complete! Downloading CSV file...`,
    keywords.length,
    keywords.length,
    finalResults.length,
    'Complete'
  );
  
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    text: `Scraping complete! Found ${finalResults.length} results. Downloading...`,
    type: 'success'
  });
  
  // Download results as CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `pranke_results_${timestamp}.csv`;
  
  // Wait a moment for UI to update
  await sleep(500);
  
  // Download directly (more reliable than going through background)
  try {
    downloadCSV(finalResults, filename);
    console.log(`Downloaded ${filename} with ${finalResults.length} results`);
    
    // Update overlay to show success
    updateProgressOverlay(
      `✓ Download complete! ${finalResults.length} results saved.`,
      keywords.length,
      keywords.length,
      finalResults.length,
      'Complete'
    );
    
    // Hide overlay after 3 seconds
    setTimeout(() => {
      hideProgressOverlay();
    }, 3000);
  } catch (error) {
    console.error('Error downloading file:', error);
    // Try via background script as fallback
    chrome.runtime.sendMessage({
      action: 'downloadCSV',
      data: finalResults,
      filename: filename
    });
    
    updateProgressOverlay(
      `Error downloading file. Check console.`,
      keywords.length,
      keywords.length,
      finalResults.length,
      'Error'
    );
  }
  
  chrome.runtime.sendMessage({
    action: 'scrapingComplete',
    totalResults: finalResults.length
  });
  
  isScraping = false;
  await clearState();
}

