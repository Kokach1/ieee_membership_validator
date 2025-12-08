// popup.js - Extension popup logic (Reload-based architecture)

let membershipData = [];
let pollInterval = null;
let validationStartTime = null;

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

// New feature elements
const dropZone = document.getElementById('dropZone');
const summaryDashboard = document.getElementById('summaryDashboard');
const validCount = document.getElementById('validCount');
const invalidCount = document.getElementById('invalidCount');
const errorCount = document.getElementById('errorCount');
const totalCount = document.getElementById('totalCount');
const successRate = document.getElementById('successRate');

// File Upload Handler
fileInput.addEventListener('change', handleFileUpload);
startBtn.addEventListener('click', startValidation);
cancelBtn.addEventListener('click', cancelValidation);
exportBtn.addEventListener('click', exportResults);

// Drag and Drop handlers
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

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
        return {
          ...row,
          membership_id: String(row.membership_id || '').trim()
        };
      });

      // FEATURE 1: Check for duplicate IDs
      const idCounts = {};
      const duplicates = [];

      membershipData.forEach(item => {
        const id = item.membership_id;
        idCounts[id] = (idCounts[id] || 0) + 1;
        if (idCounts[id] === 2) {
          duplicates.push(id);
        }
      });

      if (duplicates.length > 0) {
        showError(`⚠️ Warning: Found ${duplicates.length} duplicate ID(s): ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}`);
      }

      startBtn.disabled = false;
      hideError();

      console.log('[POPUP] Loaded', membershipData.length, 'membership IDs');
      if (duplicates.length > 0) {
        console.warn('[POPUP] Duplicates:', duplicates);
      }

    } catch (error) {
      showError('Failed to parse Excel file: ' + error.message);
    }
  };

  reader.readAsArrayBuffer(file);
}

// FEATURE 3: Drag & Drop Functions
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].name.match(/\.(xlsx|xls)$/i)) {
    fileInput.files = files;
    handleFileUpload({ target: { files: files } });
  } else {
    showError('Please drop an Excel file (.xlsx or .xls)');
  }
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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes('services24.ieee.org/membership-validator')) {
    showError('Please open the IEEE Membership Validator page first!');
    return;
  }

  console.log('[POPUP] Starting validation for', membershipData.length, 'IDs');

  validationStartTime = Date.now();

  const membershipIds = membershipData.map(item => item.membership_id);

  await chrome.storage.local.set({
    validation: {
      active: true,
      currentIndex: 0,
      currentId: null,
      total: membershipIds.length,
      ids: membershipIds,
      results: {},
      metadata: membershipData
    }
  });

  startBtn.disabled = true;
  cancelBtn.disabled = false;
  exportBtn.disabled = true;
  statusSection.classList.add('active');
  resultsSection.classList.add('active');
  summaryDashboard.classList.add('active');

  // FEATURE 2: Set badge
  chrome.action.setBadgeText({ text: '0' });
  chrome.action.setBadgeBackgroundColor({ color: '#00529B' });

  chrome.tabs.sendMessage(tab.id, { action: 'startValidation' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Error:', chrome.runtime.lastError.message);
    } else {
      console.log('[POPUP] Validation started');
    }
  });

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

  chrome.action.setBadgeText({ text: '' });

  showError('Validation cancelled by user');
}

function startPolling() {
  pollInterval = setInterval(async () => {
    const result = await chrome.storage.local.get('validation');
    const state = result.validation;

    if (!state) return;

    const processed = state.currentIndex;
    const total = state.total;

    updateProgress(processed, total);
    updateResultsTable(state.results, state.metadata);

    // FEATURE 4: Update dashboard
    updateSummaryDashboard(state.results, state.metadata);

    // FEATURE 2: Update badge
    chrome.action.setBadgeText({ text: String(processed) });

    if (!state.active) {
      console.log('[POPUP] Validation complete');
      clearInterval(pollInterval);
      pollInterval = null;

      statusSection.classList.remove('active');
      startBtn.disabled = false;
      cancelBtn.disabled = true;
      exportBtn.disabled = false;

      // FEATURE 2: Show completion notification
      showCompletionNotification(state.results, state.metadata);

      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
    }
  }, 500);
}

function updateResultsTable(results, metadata) {
  resultsBody.innerHTML = '';

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

// FEATURE 4: Update Summary Dashboard
function updateSummaryDashboard(results, metadata) {
  let valid = 0, invalid = 0, errors = 0;

  Object.values(results).forEach(result => {
    if (result === 'Valid') valid++;
    else if (result === 'Invalid') invalid++;
    else if (result === 'Error') errors++;
  });

  const total = metadata.length;
  const processed = Object.keys(results).length;
  const successRateValue = processed > 0 ? Math.round((valid / processed) * 100) : 0;

  validCount.textContent = valid;
  invalidCount.textContent = invalid;
  errorCount.textContent = errors;
  totalCount.textContent = total;
  successRate.textContent = `${successRateValue}%`;
}

// FEATURE 2: Completion Notification
function showCompletionNotification(results, metadata) {
  let valid = 0, invalid = 0;

  Object.values(results).forEach(result => {
    if (result === 'Valid') valid++;
    else if (result === 'Invalid') invalid++;
  });

  const total = metadata.length;
  const duration = validationStartTime ? Math.round((Date.now() - validationStartTime) / 1000) : 0;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'IEEE Validation Complete',
    message: `✅ Processed ${total} IDs in ${duration}s\\n${valid} Valid | ${invalid} Invalid`,
    priority: 2
  });

  // Optional sound (browser beep)
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLI fds==');
  audio.play().catch(() => { }); // Play if allowed
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

  const exportData = state.metadata.map(item => {
    const row = {
      membership_id: item.membership_id,
      validity: state.results[item.membership_id] || 'Pending'
    };

    Object.keys(item).forEach(key => {
      if (key !== 'membership_id') {
        row[key] = item[key];
      }
    });

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results');

  XLSX.writeFile(workbook, 'validated_members.xlsx');

  console.log('[POPUP] Exported', exportData.length, 'results');
}

async function checkOngoingValidation() {
  const result = await chrome.storage.local.get('validation');
  const state = result.validation;

  if (state && state.active) {
    console.log('[POPUP] Resuming monitoring of active validation');

    statusSection.classList.add('active');
    resultsSection.classList.add('active');
    summaryDashboard.classList.add('active');
    startBtn.disabled = true;
    cancelBtn.disabled = false;

    startPolling();
  }
}

checkOngoingValidation();

