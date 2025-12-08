# How It Works

## Overview
This Chrome extension automates the validation of IEEE membership IDs by interacting with the official IEEE validator webpage.

## The Process

### 1. **Upload Your Data**
- You provide an Excel file with membership IDs
- Extension reads all the data from your file
- Checks for duplicate IDs and warns you

### 2. **Automated Validation**
- Opens the IEEE validator page in your browser
- Automatically fills in each membership ID
- Clicks the validate button
- Reads the result (Valid/Invalid/Error)
- Moves to the next ID

### 3. **Live Updates**
- **Progress Bar**: Shows how many IDs processed
- **Results Table**: Displays each ID's status in real-time
- **Summary Dashboard**: Counts Valid, Invalid, and Errors
- **Browser Badge**: Small number on the extension icon

### 4. **Page Reload Architecture**
The IEEE validator page reloads after each submission. The extension handles this by:
- Saving progress in browser storage before each reload
- Resuming automatically when the page loads
- Maintaining state across reloads

### 5. **Export Results**
- Click "Export Results" when done
- Downloads an Excel file with all your original data
- Adds a "validity" column showing Valid/Invalid/Error

## Key Features

### ✅ **Duplicate Detection**
Warns you if the same membership ID appears multiple times in your Excel file.

### 🎯 **Drag & Drop**
Drag your Excel file directly onto the upload area instead of clicking browse.

### 📊 **Summary Dashboard**
Live statistics showing:
- Valid count (green)
- Invalid count (red)
- Error count (orange)
- Total count (blue)
- Success rate percentage

### 🔔 **Completion Notification**
Desktop notification when all IDs are validated showing total time and summary.

### ⏸️ **Cancel Anytime**
Stop the validation process mid-way if needed.

### 💾 **Resume Support**
Close the popup during validation and it continues in the background. Reopen to see progress.

## Behind the Scenes

1. **Content Script** (`content.js`): Runs on the IEEE page, fills forms, reads results
2. **Popup** (`popup.js`): Your control panel, shows progress, handles Excel files
3. **Chrome Storage**: Saves validation state so nothing is lost during page reloads
4. **XLSX Library**: Reads and writes Excel files (.xlsx, .xls)

## Why It's Fast & Reliable

- Processes IDs one at a time (prevents overwhelming the server)
- Saves progress after each validation
- Survives browser crashes
- Works with any number of IDs (tested with 40+)
- Handles errors gracefully (network issues, invalid IDs, etc.)
