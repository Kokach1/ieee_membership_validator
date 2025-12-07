// popup.js - Extension popup logic

let membershipData = [];
let validationResults = [];
let isProcessing = false;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const startBtn = document.getElementById('startBtn');
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

      membershipData = jsonData.map(row => ({
        membership_id: String(row.membership_id || '').trim(),
        name: row.name || '',
        email: row.email || '',
        dept: row.dept || '',
        validity: 'Pending'
      }));

      validationResults = [...membershipData];

      startBtn.disabled = false;
      hideError();

      // Initialize results table
      updateResultsTable();
      resultsSection.classList.add('active');

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
  if (isProcessing || membershipData.length === 0) return;

  // Check if we're on the correct page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  console.log('[POPUP] Current tab:', tab.id, tab.url);

  if (!tab.url || !tab.url.includes('services24.ieee.org/membership-validator')) {
    showError('Please open the IEEE Membership Validator page first!');
    return;
  }

  isProcessing = true;
  startBtn.disabled = true;
  exportBtn.disabled = true;
  statusSection.classList.add('active');

  // Reset results
  validationResults = membershipData.map(item => ({ ...item, validity: 'Processing' }));
  updateResultsTable();

  // Send message to content script to start validation
  console.log('[POPUP] Sending validation request for', membershipData.length, 'IDs to tab', tab.id);

  chrome.tabs.sendMessage(tab.id, {
    action: 'startValidation',
    membershipIds: membershipData.map(item => item.membership_id)
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[POPUP] Send message error:', chrome.runtime.lastError.message);
      showError('Cannot reach content script. Refresh the page and try again.');
      resetUI();
    } else {
      console.log('[POPUP] Message sent successfully');
    }
  });
}

// Listen for results from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[POPUP] Received message:', message.action);

  try {
    if (message.action === 'validationResult') {
      const { membershipId, validity, index, total } = message;
      console.log(`[POPUP] Result: ${membershipId} = ${validity} (${index + 1}/${total})`);

      // Update result
      const resultIndex = validationResults.findIndex(r => r.membership_id === membershipId);
      if (resultIndex !== -1) {
        validationResults[resultIndex].validity = validity;
      }

      // Update UI
      updateResultsTable();
      updateProgress(index + 1, total);
    }

    if (message.action === 'validationComplete') {
      console.log('[POPUP] Validation complete');
      isProcessing = false;
      statusSection.classList.remove('active');
      exportBtn.disabled = false;
    }

    if (message.action === 'validationError') {
      console.error('[POPUP] Validation error:', message.error);
      showError(message.error);
      resetUI();
    }
  } catch (error) {
    console.error('[POPUP] Error handling message:', error);
    showError('Internal error: ' + error.message);
  }
});

function updateResultsTable() {
  resultsBody.innerHTML = '';

  validationResults.forEach(result => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = result.membership_id;

    const validityCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.textContent = result.validity;

    if (result.validity === 'Valid') {
      badge.className = 'validity-valid';
    } else if (result.validity === 'Invalid') {
      badge.className = 'validity-invalid';
    } else if (result.validity === 'Error') {
      badge.className = 'validity-error';
    } else if (result.validity === 'Processing') {
      badge.className = 'validity-processing';
    } else {
      badge.className = 'validity-error';
      badge.textContent = 'Pending';
    }

    validityCell.appendChild(badge);

    row.appendChild(idCell);
    row.appendChild(validityCell);
    resultsBody.appendChild(row);
  });
}

function updateProgress(current, total) {
  const percentage = Math.round((current / total) * 100);
  progressFill.style.width = percentage + '%';
  progressFill.textContent = percentage + '%';
  statusText.innerHTML = `<span class="spinner"></span>Processing ${current} of ${total}...`;
}

function resetUI() {
  isProcessing = false;
  startBtn.disabled = false;
  statusSection.classList.remove('active');
}

function exportResults() {
  if (validationResults.length === 0) return;

  // Prepare data for export
  const exportData = validationResults.map(result => ({
    membership_id: result.membership_id,
    validity: result.validity,
    ...(result.name && { name: result.name }),
    ...(result.email && { email: result.email }),
    ...(result.dept && { dept: result.dept })
  }));

  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Results');

  // Download file
  XLSX.writeFile(workbook, 'validated_members.xlsx');
}
