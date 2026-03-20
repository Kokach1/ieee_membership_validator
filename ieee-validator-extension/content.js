// content.js - IEEE Validator page automation (Reload-based architecture)

console.log('[CONTENT] IEEE Validator Extension: Content script loaded');

// Configuration
const CONFIG = {
    TYPING_DELAY: 300,
    SUBMIT_DELAY: 500
};

// DOM Selectors
const SELECTORS = {
    INPUT: 'input[type="text"]',
    SUBMIT_BUTTON: 'button[type="submit"], input[type="submit"]'
};

// Result detection patterns
const PATTERNS = {
    VALID: 'Membership status: Active',
    INVALID: 'Error: Member not found or membership status is not active.',
    SOCIETY_LABEL: 'Society membership(s):'
};

// Main function - runs on every page load
async function init() {
    console.log('[CONTENT] Initializing...');

    // Check if there's an active validation
    const result = await chrome.storage.local.get('validation');
    const state = result.validation;

    if (!state || !state.active) {
        console.log('[CONTENT] No active validation');
        return;
    }

    console.log('[CONTENT] Active validation detected:', state.currentIndex + 1, '/', state.total);

    // Initialize societies object if missing (backward compat)
    if (!state.societies) {
        state.societies = {};
    }

    // Check if we just submitted an ID (not the initial load)
    if (state.currentId) {
        console.log('[CONTENT] Reading result for ID:', state.currentId);

        // Read the result from the current page
        const validity = detectResultFromPage();
        console.log('[CONTENT] Result:', validity);

        // Save the result
        state.results[state.currentId] = validity;

        // Extract society info only for valid members
        if (validity === 'Valid') {
            const society = detectSocietyFromPage();
            state.societies[state.currentId] = society;
            console.log('[CONTENT] Society:', society);
        } else {
            state.societies[state.currentId] = null;
        }

        // Move to next ID
        state.currentIndex++;
    }

    // Check if we're done
    if (state.currentIndex >= state.total) {
        console.log('[CONTENT] Validation complete!');
        state.active = false;
        await chrome.storage.local.set({ validation: state });
        return;
    }

    // Get next ID and submit it
    const nextId = state.ids[state.currentIndex];
    state.currentId = nextId;

    // Save state before submitting (page will reload)
    await chrome.storage.local.set({ validation: state });

    console.log('[CONTENT] Submitting next ID:', nextId, '(', state.currentIndex + 1, '/', state.total, ')');

    // Submit the ID (this will cause a page reload)
    await submitId(nextId);
}

// Detect the validation result from the current page
function detectResultFromPage() {
    const pageText = document.body.innerText;

    if (pageText.includes(PATTERNS.VALID)) {
        return 'Valid';
    }

    if (pageText.includes(PATTERNS.INVALID)) {
        return 'Invalid';
    }

    // If we can't detect, assume error
    return 'Error';
}

// Detect society membership(s) from the current page
function detectSocietyFromPage() {
    const pageText = document.body.innerText;

    if (!pageText.includes(PATTERNS.SOCIETY_LABEL)) {
        return null;
    }

    try {
        // Get the text after "Society membership(s):"
        const afterLabel = pageText.split(PATTERNS.SOCIETY_LABEL)[1];
        if (!afterLabel) return null;

        // Only look at the first 10 lines after the label to avoid footer
        const lines = afterLabel.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 10);

        // Only keep lines that contain "IEEE" — all society names start with it
        const societies = [];
        for (const line of lines) {
            // Stop at footer boundary
            if (line.includes('About IEEE')) break;
            const cleaned = line.replace(/^[•\-\*\s]+/, '').trim();
            if (cleaned.includes('IEEE')) {
                societies.push(cleaned);
            }
        }

        if (societies.length === 0) return null;
        return societies.join(', ');
    } catch (error) {
        console.error('[CONTENT] Error detecting society:', error);
        return null;
    }
}

// Submit a membership ID
async function submitId(membershipId) {
    try {
        // Find input field
        const inputField = document.querySelector(SELECTORS.INPUT);
        if (!inputField) {
            console.error('[CONTENT] Input field not found');
            return;
        }

        // Clear and type the ID
        inputField.value = '';
        inputField.focus();
        await sleep(CONFIG.TYPING_DELAY);

        inputField.value = membershipId;
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('[CONTENT] Typed ID:', membershipId);
        await sleep(CONFIG.TYPING_DELAY);

        // Find and click submit button
        const submitButton = document.querySelector(SELECTORS.SUBMIT_BUTTON);
        if (!submitButton) {
            console.error('[CONTENT] Submit button not found');
            return;
        }

        console.log('[CONTENT] Clicking submit - page will reload...');
        submitButton.click();

    } catch (error) {
        console.error('[CONTENT] Error submitting ID:', error);
    }
}

// Listen for start command from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startValidation') {
        console.log('[CONTENT] Received start command');

        // The state is already in storage, just trigger init
        init();

        sendResponse({ status: 'started' });
        return true;
    }
});

// Helper function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-run init when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // Already loaded
    init();
}

console.log('[CONTENT] Script initialized, waiting for page load...');
