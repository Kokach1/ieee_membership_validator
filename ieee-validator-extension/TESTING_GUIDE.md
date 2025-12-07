# 🧪 Testing the Reload-Based Extension

## What Changed

The extension now works **with** page reloads instead of fighting them:
- ✅ Each validation causes a controlled page reload
- ✅ State persists in `chrome.storage` across reloads
- ✅ Content script automatically continues after each reload
- ✅ Popup shows live progress by polling storage

---

## How to Test

### Step 1: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "IEEE Membership Validator Automation"
3. Click **🔄 Reload**

### Step 2: Open the IEEE Page

1. Navigate to: https://services24.ieee.org/membership-validator.html
2. Log in if required
3. **Wait for page to fully load**

### Step 3: Test with 1 ID First

1. Create a test Excel file with **just 1 membership ID**:
   - Column: `membership_id`
   - Value: `101780121` (or any valid ID)

2. Click the extension icon
3. Upload the test file
4. Click **"Start Validation"**

**Expected behavior**:
- Page reloads immediately
- Extension popup shows "Processing 1 of 1..."
- Result appears in table (Valid/Invalid)
- Status disappears, "Export Results" button enables

### Step 4: Test with Multiple IDs

1. Upload your Excel with 3-5 IDs
2. Click "Start Validation"
3. **Watch the page reload multiple times** (once per ID)
4. Watch the popup table update live

**Expected behavior**:
- Page reloads 3-5 times (one per ID)
- Each reload takes ~2-3 seconds
- Progress bar advances: "Processing 1 of 5...", "Processing 2 of 5...", etc.
- Results appear in table as they complete
- When done, status disappears and export enables

### Step 5: Test Popup Resilience

1. Start validation with several IDs
2. **Close the popup** while it's running
3. **Reopen the popup**

**Expected behavior**:
- Popup resumes showing live progress
- Doesn't restart validation
- Continues from where it left off

---

## Debugging

### Check Chrome Storage

1. Right-click popup → Inspect
2. Go to **Application** tab → **Storage** → **Local Storage** → **chrome-extension://...**
3. Look for the `validation` key
4. Should see: `{ active: true, currentIndex: 2, total: 5, ids: [...], results: {...} }`

### Check Content Script Console

1. Press F12 on the IEEE page
2. Watch for logs:
```
[CONTENT] IEEE Validator Extension: Content script loaded
[CONTENT] Active validation detected: 2 / 5
[CONTENT] Reading result for ID: 101780122
[CONTENT] Result: Valid
[CONTENT] Submitting next ID: 101780123 ( 3 / 5 )
[CONTENT] Typed ID: 101780123
[CONTENT] Clicking submit - page will reload...
```

### Common Issues

**❌ "No active validation" every time**:
- Storage isn't being set correctly
- Check popup console for errors

**❌ Page reloads but stuck on same ID**:
- Result detection might be failing
- Check what `detectResultFromPage()` returns

**❌ Popup doesn't show progress**:
- Polling might not be working
- Check popup console for errors

---

## What to Watch

✅ **Good signs**:
- Logs show "[CONTENT] Active validation detected"
- Page reloads automatically
- Different ID appears in input field after each reload
- Popup progress bar advances
- Results appear in table

❌ **Bad signs**:
- Page doesn't reload
- Same ID keeps appearing
- Popup stuck at "Processing 0 of X"
- No logs in content script console

---

**Start with just 1 ID to verify the basic flow works!**
