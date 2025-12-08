# Installation Guide

## Prerequisites
- **Google Chrome Browser** (or Chromium-based browser like Edge, Brave)
- **Excel file** with IEEE membership IDs
- **IEEE account** with login credentials

---

## Step 1: Download the Extension

Download or clone this extension folder to your computer. Make sure you have these files:
```
ieee-validator-extension/
  ├── manifest.json
  ├── popup.html
  ├── popup.js
  ├── content.js
  ├── styles.css
  ├── icon48.png
  └── lib/
      └── xlsx.full.min.js
```

---

## Step 2: Install in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. **Enable "Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"** button
4. Select the `ieee-validator-extension` folder
5. Extension installed! You'll see it in your extensions list

### Optional: Pin the Extension
- Click the puzzle piece icon 🧩 in Chrome toolbar
- Find "IEEE Membership Validator Automation"
- Click the pin icon 📌 to show it in your toolbar

---

## Step 3: Prepare Your Excel File

### ✅ Required Format

Your Excel file **MUST** have a column named **`membership_id`** (case-sensitive).

**Example:**

| membership_id | name          | email               | dept        |
|---------------|---------------|---------------------|-------------|
| 101780121     | John Doe      | john@example.com    | Engineering |
| 101780122     | Jane Smith    | jane@example.com    | Computer    |
| 101780123     | Bob Johnson   | bob@example.com     | Electrical  |

### Important Excel Rules:

1. **Column name must be exactly:** `membership_id` (all lowercase, with underscore)
2. **Other columns:** Can have any names, any data - they'll all be preserved in export
3. **Supported formats:** `.xlsx` or `.xls`
4. **No empty rows** at the top (headers should be in row 1)
5. **IDs can be:** Numbers or text (the extension converts them to text automatically)

### ⚠️ Common Mistakes:

❌ Column named `Membership ID` (has space)  
❌ Column named `MembershipID` (no underscore)  
❌ Column named `id` (missing "membership_")  
❌ No header row  
❌ Using CSV instead of Excel

---

## Step 4: Login to IEEE Portal

**⚠️ IMPORTANT:** Before using the extension, you must be logged into the IEEE portal.

1. **Go to:** `https://services24.ieee.org/membership-validator.html`
2. **Click "Sign In"** (if not already logged in)
3. **Enter your IEEE credentials:**
   - Email/Username
   - Password
4. **Complete login** and return to the validator page

**Without logging in, the extension cannot validate membership IDs!**

---

## Step 5: Using the Extension

### First Time Setup:

1. **Make sure you're logged into the IEEE validator page** (Step 4 above)

2. **Click the extension icon** in your toolbar

3. **Upload your Excel file:**
   - Click "Choose File" button, OR
   - Drag & drop the Excel file onto the upload area

4. **Check for warnings:**
   - If you see duplicate IDs warning, decide if you want to proceed
   - All duplicates will be validated separately

5. **Click "▶ Start Validation"**
   - Watch the live progress
   - See results appear in real-time
   - Dashboard shows statistics

6. **Wait for completion:**
   - Desktop notification will appear
   - All buttons re-enable

7. **Click "💾 Export Results":**
   - Downloads `validated_members.xlsx`
   - Contains all your original columns + validity column

---

## Important Things to Keep in Mind

### ✅ Do's:
- **Login to IEEE portal first** (most important!)
- Keep the IEEE validator tab open during validation
- Wait for "Validation complete" notification
- Export results before closing the popup
- Check the summary dashboard for quick stats

### ❌ Don'ts:
- Don't close the IEEE validator tab during validation
- Don't refresh the page manually (extension handles reloads)
- Don't click "Start Validation" multiple times
- Don't submit IDs directly on the page (use the extension only)
- Don't use the extension without being logged in

---

## Features You Should Know

### 🎯 **Drag & Drop Upload**
Instead of clicking "Choose File", just drag your Excel file onto the gray upload area!

### ⏸️ **Cancel Button**
Click "✕ Cancel" to stop validation at any time. Results up to that point are saved.

### 📊 **Summary Dashboard**
Watch live counts:
- **Green card**: Valid members
- **Red card**: Invalid members  
- **Orange card**: Errors (network/system issues)
- **Blue card**: Total IDs
- **Success Rate**: Percentage of valid IDs

### 🔔 **Desktop Notifications**
When validation completes, you'll get a notification showing:
- Total IDs processed
- Time taken
- Valid vs Invalid count

### 💾 **Resume Support**
You can close the popup during validation! Just reopen it to see current progress.

---

## Troubleshooting

### "Please open the IEEE Membership Validator page first!"
**Solution:** Open https://services24.ieee.org/membership-validator.html in a tab

### "Excel must have a 'membership_id' column!"
**Solution:** Rename your ID column to exactly `membership_id` (lowercase, with underscore)

### Extension shows "No file selected"
**Solution:** Click "Choose File" and select your .xlsx or .xls file

### Validation stuck on one ID
**Solution:** Click "✕ Cancel", reload the extension at `chrome://extensions/`, and try again

### Exported file missing columns
**Solution:** This shouldn't happen! The extension exports ALL your original columns. If it does, report as a bug.

### Validation not working / showing errors
**Solution:** Make sure you're **logged into the IEEE portal** before starting validation

---

## Excel File Example

Save this as `test_members.xlsx`:

| membership_id | name          | email             | department | year |
|---------------|---------------|-------------------|------------|------|
| 101780121     | Alice Wonder  | alice@ieee.org    | ECE        | 2023 |
| 101780122     | Bob Builder   | bob@ieee.org      | CSE        | 2024 |
| 101780123     | Charlie Brown | charlie@ieee.org  | EEE        | 2023 |

After validation, exported file will be:

| membership_id | validity | name          | email             | department | year |
|---------------|----------|---------------|-------------------|------------|------|
| 101780121     | Valid    | Alice Wonder  | alice@ieee.org    | ECE        | 2023 |
| 101780122     | Invalid  | Bob Builder   | bob@ieee.org      | CSE        | 2024 |
| 101780123     | Valid    | Charlie Brown | charlie@ieee.org  | EEE        | 2023 |

---

## Support

If you encounter issues:
1. Check this guide first
2. Make sure you're logged into IEEE portal
3. Reload the extension at `chrome://extensions/`
4. Try with a small test file (2-3 IDs) first
5. Check Chrome DevTools Console for error messages (F12 → Console tab)
6. **Contact:** jeswinjoy3695@gmail.com for help

---

**Made with ❤️ by Kokachi**

