# IEEE Membership Validator Chrome Extension

A Chrome extension that automates IEEE membership validation from Excel files.

## Features

✅ **Excel Upload** - Upload .xlsx files with membership IDs  
✅ **Automated Validation** - Automatically validates each ID on IEEE's website  
✅ **Reliability** - Handles slow/unreliable internet with retry mechanism  
✅ **Live Results** - Real-time table updates with color-coded status  
✅ **Export Results** - Download validated results as Excel file  

## Installation

1. **Download the Extension**
   - Navigate to the `ieee-validator-extension` folder

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `ieee-validator-extension` folder

3. **Verify Installation**
   - You should see the IEEE Validator icon in your extensions toolbar
   - The extension is now ready to use!

## Usage

### Step 1: Prepare Your Excel File

Create an Excel file (.xlsx) with the following structure:

| membership_id | name (optional) | email (optional) | dept (optional) |
|---------------|-----------------|------------------|-----------------|
| 12345678      | John Doe        | john@email.com   | CS Dept         |
| 87654321      | Jane Smith      | jane@email.com   | EE Dept         |

**Required Column:**
- `membership_id` - The IEEE membership ID to validate

**Optional Columns:**
- `name`, `email`, `dept` - These will be preserved in the output

### Step 2: Open IEEE Validator Page

1. Navigate to: https://services24.ieee.org/membership-validator.html
2. **Log in if required** (the extension does NOT handle login)
3. Make sure the page is fully loaded

### Step 3: Run Validation

1. Click the extension icon in your toolbar
2. Click "📁 Upload Excel File" and select your file
3. Click "▶ Start Validation"
4. Watch the progress bar and live results
5. Wait for all validations to complete

### Step 4: Export Results

1. After validation completes, click "💾 Export Results"
2. The file `validated_members.xlsx` will download
3. Open the file to see the results with a new `validity` column

## Excel Output Format

The exported file will have these columns:

| membership_id | validity | name | email | dept |
|---------------|----------|------|-------|------|
| 12345678      | Valid    | ...  | ...   | ...  |
| 87654321      | Invalid  | ...  | ...   | ...  |
| 99999999      | Error    | ...  | ...   | ...  |

**Validity Values:**
- **Valid** ✅ - Membership is active
- **Invalid** ❌ - Membership not found or not active
- **Error** ⚠️ - Could not validate (network issues, page problems, etc.)

## How It Works

### Automation Process

1. **Input** - User uploads Excel file with membership IDs
2. **Parsing** - Extension uses XLSX.js to read the file
3. **Injection** - Content script runs on IEEE validator page
4. **Automation** - For each membership ID:
   - Clears the input field
   - Types the membership ID
   - Clicks submit
   - Waits for page response (MutationObserver)
   - Detects "Active" or "Error" message
   - Sends result back to popup
5. **Display** - Results shown in real-time table
6. **Export** - Download results as Excel file

### Reliability Features

- **MutationObserver** - Detects DOM changes when results load
- **Polling Fallback** - Checks every 1 second if observer misses changes
- **Retry Mechanism** - Up to 5 retries with 2-second delays
- **Timeout Handling** - 15-second max wait per validation
- **Error Recovery** - Marks problematic IDs as "Error" and continues

### Detection Logic

The extension detects validation results by searching for specific text:

- **Valid**: Page contains "Membership status: Active"
- **Invalid**: Page contains "Error: Member not found or membership status is not active."

## Configuration

You can adjust timing in `content.js`:

```javascript
const CONFIG = {
  TYPING_DELAY: 300,        // Delay after typing ID (ms)
  BUTTON_CLICK_DELAY: 500,  // Delay after clicking submit (ms)
  MAX_WAIT_TIME: 15000,     // Max wait for result (ms)
  MAX_RETRIES: 5,           // Number of retry attempts
  RETRY_DELAY: 2000,        // Delay between retries (ms)
  POLL_INTERVAL: 1000       // Polling check interval (ms)
};
```

## Troubleshooting

### "Please open the IEEE Membership Validator page first!"
- Make sure you're on https://services24.ieee.org/membership-validator.html
- Refresh the page if needed

### "Failed to communicate with page"
- Refresh the IEEE validator page
- Reload the extension in `chrome://extensions/`
- Try again

### Extension icon doesn't appear
- Check if the extension is enabled in `chrome://extensions/`
- Make sure you loaded the correct folder
- Try reloading Chrome

### Validation gets stuck
- Check your internet connection
- The extension may be waiting for a slow response
- Click the extension icon to see the current status
- If needed, close and reopen the extension popup to reset

### Results show "Error" for all IDs
- Verify you're logged into the IEEE validator page
- Check if the page structure has changed
- Look at browser console (F12) for error messages

## Performance Notes

- **Sequential Processing** - IDs are validated one at a time to avoid rate limiting
- **Processing Time** - Approximately 5-20 seconds per ID (depending on network)
- **100 IDs** ≈ 10-30 minutes
- **Keep Page Active** - Don't navigate away during validation

## Technical Details

### Files Structure

```
ieee-validator-extension/
├── manifest.json         # Extension configuration
├── popup.html           # Extension popup UI
├── popup.js             # Popup logic & Excel handling
├── content.js           # Page automation script
├── styles.css           # UI styling
├── lib/
│   └── xlsx.full.min.js # XLSX library for Excel
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This file
```

### Technologies Used

- **Chrome Extension API** (Manifest V3)
- **SheetJS / XLSX.js** - Excel file parsing and generation
- **MutationObserver API** - Detect page changes
- **Chrome Messaging API** - Communication between popup and content script

### Permissions

- `activeTab` - Access to current tab
- `scripting` - Inject content scripts
- `storage` - Store extension state
- `https://services24.ieee.org/*` - Access IEEE validator page

## Privacy & Security

- ✅ Extension only runs on IEEE validator page
- ✅ No data is sent to external servers
- ✅ All processing happens locally in your browser
- ✅ Your Excel data never leaves your computer (except to IEEE's official site)
- ✅ Open source - inspect the code yourself

## Limitations

- **Manual Login Required** - You must log into IEEE manually
- **Sequential Only** - Processes one ID at a time
- **No Background Processing** - Extension popup must stay open
- **Page-Specific** - Only works on IEEE's validator page

## Support

If you encounter issues:

1. Check the browser console (F12 → Console)
2. Check the extension background page console:
   - Go to `chrome://extensions/`
   - Find this extension
   - Click "background page" or "service worker"
3. Verify your Excel file format matches requirements
4. Make sure you're on the correct IEEE page

## License

MIT License - Free to use and modify

---

**Created with ❤️ for IEEE volunteers automating membership validation**
