// popup.js - Extension popup logic (Reload-based architecture)

let membershipData = [];
let pollInterval = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');
const exportBtn = document.getElementById('exportBtn');
const statusSection = document.getElementById('statusSection');
const statusText = document.getElementById('statusText');
const progressFill = document.getElementById('progressFill');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const errorMessage = document.getElementById('errorMessage');

// File Upload Handler
fileInput.addEventListener('change', handleFileUpload);
startBtn.addEventListener('click', startValidation);
cancelBtn.addEventListener('click', cancelValidation);
exportBtn.addEventListener('click', exportResults);

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  fileName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Validate Excel structure
      if (jsonData.length === 0) {
        showError('Excel file is empty!');
        return;
      }

      if (!jsonData[0].hasOwnProperty('membership_id')) {
        showError('Excel must have a "membership_id" column!');
        return;
      }

      // Store ALL columns from Excel - preserve entire row
      membershipData = jsonData.map(row => {
        // Convert membership_id to string, keep everything else
        return {
          ...row,  // Spread all original columns
          membership_id: String(row.membership_id || '').trim()
        };
      });

      startBtn.disabled = false;
      hideError();

      console.log('[POPUP] Loaded', membershipData.length, 'membership IDs');

    } catch (error) {
      showError('Failed to parse Excel file: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
  setTimeout(() => hideError(), 5000);
}

function hideError() {
  errorMessage.classList.remove('active');
}

async function startValidation() {
  if (membershipData.length === 0) return;

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes('services24.ieee.org/membership-validator')) {
    showError('Please open the IEEE Membership Validator page first!');
    return;
  }

  console.log('[POPUP] Starting validation for', membershipData.length, 'IDs');

  // Initialize validation state in storage
  const membershipIds = membershipData.map(item => item.membership_id);

  await chrome.storage.local.set({
    validation: {
      active: true,
      currentIndex: 0,
      currentId: null,  // Will be set by content script
      total: membershipIds.length,
      ids: membershipIds,
      results: {},
      metadata: membershipData  // Store full data for export
    }
  });

  // Update UI
  startBtn.disabled = true;
  cancelBtn.disabled = false;
  exportBtn.disabled = true;
  statusSection.classList.add('active');
  resultsSection.classList.add('active');

  // Tell content script to start
  chrome.tabs.sendMessage(tab.id, { action: 'startValidation' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Error:', chrome.runtime.lastError.message);
    } else {
      console.log('[POPUP] Validation started');
    }
  });

  // Start polling for updates
  startPolling();
}

async function cancelValidation() {
  console.log('[POPUP] Cancelling validation');

  const result = await chrome.storage.local.get('validation');
  const state = result.validation;

  if (state) {
    state.active = false;
    await chrome.storage.local.set({ validation: state });
  }

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  statusSection.classList.remove('active');
  startBtn.disabled = false;
  cancelBtn.disabled = true;
  exportBtn.disabled = false;

  showError('Validation cancelled by user');
}

function startPolling() {
  // Poll storage every 500ms for updates
  pollInterval = setInterval(async () => {
    const result = await chrome.storage.local.get('validation');
    const state = result.validation;

    if (!state) return;

    // Update progress
    const processed = state.currentIndex;
    const total = state.total;

    updateProgress(processed, total);
    updateResultsTable(state.results, state.metadata);

    // Check if done
    if (!state.active) {
      console.log('[POPUP] Validation complete');
      clearInterval(pollInterval);
      pollInterval = null;

      statusSection.classList.remove('active');
      startBtn.disabled = false;
      cancelBtn.disabled = true;
      exportBtn.disabled = false;
    }
  }, 500);
}

function updateResultsTable(results, metadata) {
  resultsBody.innerHTML = '';

  // Display all IDs with their current status
  metadata.forEach(item => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = item.membership_id;

    const validityCell = document.createElement('td');
    const badge = document.createElement('span');

    const validity = results[item.membership_id] || 'Pending';
    badge.textContent = validity;

    if (validity === 'Valid') {
      badge.className = 'validity-valid';
    } else if (validity === 'Invalid') {
      badge.className = 'validity-invalid';
    } else if (validity === 'Error') {
      badge.className = 'validity-error';
    } else {
      badge.className = 'validity-processing';
    }

    validityCell.appendChild(badge);

    row.appendChild(idCell);
    row.appendChild(validityCell);
    resultsBody.appendChild(row);
  });
}

function updateProgress(current, total) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  progressFill.style.width = percentage + '%';
  progressFill.textContent = percentage + '%';
  statusText.innerHTML = `<span class="spinner"></span>Processing ${current} of ${total}...`;
}

async function exportResults() {
  const result = await chrome.storage.local.get('validation');
  const state = result.validation;

  if (!state || !state.metadata) {
    showError('No results to export');
    return;
  }

  // Prepare data for export - include ALL columns from original data
  const exportData = state.metadata.map(item => {
    const row = {
      membership_id: item.membership_id,
      validity: state.results[item.membership_id] || 'Pending'
    };

    // Add ALL other columns from original Excel
    Object.keys(item).forEach(key => {
      if (key !== 'membership_id') {
        row[key] = item[key];
      }
    });

    return row;
  });

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results');

  // Download file
  XLSX.writeFile(workbook, 'validated_members.xlsx');

  console.log('[POPUP] Exported', exportData.length, 'results');
}

// Check for ongoing validation on popup open
async function checkOngoingValidation() {
  const result = await chrome.storage.local.get('validation');
  const state = result.validation;

  if (state && state.active) {
    console.log('[POPUP] Resuming monitoring of active validation');

    statusSection.classList.add('active');
    resultsSection.classList.add('active');
    startBtn.disabled = true;
    cancelBtn.disabled = false;

    // Resume polling
    startPolling();
  }
}

// Run on popup load
checkOngoingValidation();
