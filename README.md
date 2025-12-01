# Pranke Extension Scraper

A Chrome extension that automates scraping of the Pranke Trading Partner directory search results. The extension searches for trading partners using keywords, extracts table data, and exports results to CSV format.

## Features

- 🔍 **Automated Search**: Automatically searches for trading partners using keywords from a text file
- 💾 **State Persistence**: Saves progress across page reloads using Chrome storage
- 📊 **Progress Tracking**: Real-time progress overlay on the webpage showing:
  - Current keyword being processed
  - Progress percentage
  - Total results found
  - Status messages
- 📥 **CSV Export**: Exports all results to a CSV file with proper column formatting
- 🔄 **Auto-Resume**: Automatically continues scraping after page reloads
- 🎯 **Smart Element Detection**: Automatically finds and interacts with form elements

## Installation

1. **Download or clone this repository**
   ```bash
   git clone <repository-url>
   cd pranke_extension_scrapper
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/` in Chrome
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `pranke_extension_scrapper` folder
   - The extension should now appear in your extensions list

## Usage

### Prerequisites

- Navigate to the Pranke TnrSearch page:
  ```
  https://wss.pranke.com/PrankeWebExtensions/(S(...))/TnrSearch/TnrSearch?lang=en_US
  ```

### Starting the Scraper

1. **Click the extension icon** in Chrome's toolbar
2. **Click "Start Scraping"** button in the popup
3. **Monitor progress** via the floating overlay on the webpage (top-right corner)
4. **Wait for completion** - the CSV file will download automatically when finished

### Keywords File

The extension reads keywords from `keywords.txt` (one keyword per line). The file should contain:
```
A
B
C
...
```

The extension will:
- Process all keywords sequentially
- Search for each keyword using "starts with" option
- Extract all matching results
- Combine all results into a single CSV file

## Project Structure

```
pranke_extension_scrapper/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and event handlers
├── content.js             # Main content script (runs on Pranke website)
├── background.js          # Background service worker (handles storage)
├── keywords.txt           # List of keywords to search (one per line)
├── table.html             # Sample table structure (reference)
└── README.md              # This file
```

## How It Works

1. **Initialization**: User clicks "Start Scraping" in the popup
2. **Keyword Loading**: Extension loads keywords from `keywords.txt`
3. **State Management**: Progress is saved to Chrome storage before each search
4. **Search Process**:
   - Selects "starts with" radio button
   - Enters keyword in search box
   - Clicks search button (triggers page reload)
5. **Data Extraction**: After page reload:
   - Waits for results table to load
   - Extracts data from table rows
   - Saves results to storage
6. **Continuation**: Automatically continues with next keyword
7. **Completion**: When all keywords processed:
   - Downloads CSV file with all results
   - Clears saved state

## CSV Output Format

The exported CSV file contains the following columns (matching table headers):

- **NAME**: Company/trading partner name
- **TNR**: Trading number
- **GLN/UNB-ID**: GLN/UNB identifier
- **CUSTOMER .INI FILE**: URL to download customer INI file
- **SENDER .INI FILE**: URL to download sender INI file

Example:
```csv
NAME,TNR,GLN/UNB-ID,CUSTOMER .INI FILE,SENDER .INI FILE
A & G, Skive,3300033932,5790002425349,https://...,https://...
```

## Technical Details

### Manifest V3
- Uses Chrome Extension Manifest V3
- Requires permissions: `activeTab`, `storage`, `scripting`
- Host permission for `wss.pranke.com`

### State Persistence
- Uses `chrome.storage.local` to persist:
  - Current keyword index
  - All extracted results
  - Keywords list
  - Scraping status
- State survives page reloads

### Progress Overlay
- Created dynamically on the webpage
- Positioned fixed in top-right corner
- Updates in real-time during scraping
- Automatically recreated after page reloads

## Troubleshooting

### Extension not working
- Ensure you're on the correct Pranke TnrSearch page
- Check browser console (F12) for errors
- Reload the extension in `chrome://extensions/`

### Progress overlay not showing
- Check if scraping is actually running
- Look for the overlay in top-right corner
- Refresh the page if needed

### CSV not downloading
- Check browser download settings
- Ensure popup blocker isn't interfering
- Check console for download errors

### Page reload issues
- The extension automatically handles page reloads
- Progress is saved before each search
- Extension will resume from last keyword if interrupted

## Development

### Making Changes

1. **Edit files** as needed
2. **Reload extension** in `chrome://extensions/` (click reload icon)
3. **Refresh the Pranke page** to load updated content script
4. **Test changes** by starting a new scraping session

### Key Files to Modify

- `content.js`: Main scraping logic, element detection, data extraction
- `popup.js`: UI interactions and status updates
- `background.js`: Storage management
- `keywords.txt`: List of search keywords

## License

This project is provided as-is for educational and automation purposes.

## Notes

- The extension processes keywords sequentially to avoid overwhelming the server
- Each search triggers a page reload (as designed by the Pranke website)
- State is automatically saved before each search to handle reloads gracefully
- The progress overlay provides real-time feedback even when extension popup closes

