// content.js - IEEE Validator page automation

console.log('IEEE Validator Extension: Content script loaded');

// Configuration
const CONFIG = {
    TYPING_DELAY: 300,
    BUTTON_CLICK_DELAY: 1000,
    MAX_WAIT_TIME: 15000,
    MAX_RETRIES: 5,
    RETRY_DELAY: 2000,
    POLL_INTERVAL: 1000
};

// DOM Selectors (based on actual page structure)
const SELECTORS = {
    INPUT: 'input[type="text"]',
    SUBMIT_BUTTON: 'button[type="submit"], input[type="submit"]',
    RESULT_CONTAINER: 'body' // Watch entire body for changes
};

// Result detection patterns
const PATTERNS = {
    VALID: 'Membership status: Active',
    INVALID: 'Error: Member not found or membership status is not active.'
};

let currentValidation = null;
let isProcessing = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startValidation') {
        if (isProcessing) {
            console.log('[CONTENT] Already processing, ignoring request');
            sendResponse({ status: 'busy' });
            return true;
        }

        console.log('[CONTENT] Received validation request for', message.membershipIds.length, 'IDs');
        const membershipIds = message.membershipIds;

        // Send immediate response to acknowledge receipt
        sendResponse({ status: 'started', count: membershipIds.length });

        // Start processing asynchronously (don't wait for response)
        processAllValidations(membershipIds).catch(error => {
            console.error('[CONTENT] Processing error:', error);
            chrome.runtime.sendMessage({
                action: 'validationError',
                error: 'Processing failed: ' + error.message
            });
        });

        return true; // Keep the message channel open
    }
});

async function processAllValidations(membershipIds) {
    isProcessing = true;

    for (let i = 0; i < membershipIds.length; i++) {
        const membershipId = membershipIds[i];
        console.log(`Processing ${i + 1}/${membershipIds.length}: ${membershipId}`);

        let validity = 'Error';
        let retries = 0;

        // Retry loop
        while (retries < CONFIG.MAX_RETRIES) {
            try {
                validity = await validateMembershipId(membershipId);
                if (validity !== 'Error') break; // Success, exit retry loop
            } catch (error) {
                console.error(`Error validating ${membershipId}:`, error);
            }

            retries++;
            if (retries < CONFIG.MAX_RETRIES) {
                console.log(`Retry ${retries}/${CONFIG.MAX_RETRIES} for ${membershipId}`);
                await sleep(CONFIG.RETRY_DELAY);
            }
        }

        // Send result back to popup
        chrome.runtime.sendMessage({
            action: 'validationResult',
            membershipId: membershipId,
            validity: validity,
            index: i,
            total: membershipIds.length
        });

        // Small delay between validations
        if (i < membershipIds.length - 1) {
            await sleep(500);
        }
    }

    // Notify completion
    chrome.runtime.sendMessage({
        action: 'validationComplete'
    });

    isProcessing = false;
}

async function validateMembershipId(membershipId) {
    try {
        // Step 0: Store the current page state BEFORE submission
        const beforeSubmit = document.body.innerText;
        console.log(`[START] Validating ${membershipId}`);

        // Step 1: Find and clear input field
        const inputField = document.querySelector(SELECTORS.INPUT);
        if (!inputField) {
            console.error('Input field not found');
            return 'Error';
        }

        // Clear existing value
        inputField.value = '';
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.focus();

        await sleep(CONFIG.TYPING_DELAY);

        // Step 2: Type membership ID
        inputField.value = membershipId;
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
        const validity = await waitForValidationResult(beforeSubmit);

        console.log(`[RESULT] ${membershipId} => ${validity}`);
        return validity;

    } catch (error) {
        console.error('Validation error:', error);
        return 'Error';
    }
}

function waitForValidationResult(previousPageText) {
    return new Promise((resolve) => {
        let resolved = false;
        let pollCount = 0;
        const maxPolls = CONFIG.MAX_WAIT_TIME / CONFIG.POLL_INTERVAL;

        console.log('[WAIT] Waiting for result...');

        // Strategy 1: MutationObserver for DOM changes
        const observer = new MutationObserver((mutations) => {
            if (resolved) return;

            const result = detectValidityFromDOM(previousPageText);
            if (result !== null) {
                resolved = true;
                observer.disconnect();
                clearInterval(pollInterval);
                console.log('[DETECTED-OBSERVER] Result found');
                resolve(result);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Strategy 2: Polling as fallback
        const pollInterval = setInterval(() => {
            if (resolved) return;

            pollCount++;
            const result = detectValidityFromDOM(previousPageText);

            console.log(`[POLL ${pollCount}/${maxPolls}] Checking for result...`);

            if (result !== null) {
                resolved = true;
                observer.disconnect();
                clearInterval(pollInterval);
                console.log('[DETECTED-POLL] Result found');
                resolve(result);
            } else if (pollCount >= maxPolls) {
                // Timeout
                console.log('[TIMEOUT] Max polls reached');
                resolved = true;
                observer.disconnect();
                clearInterval(pollInterval);
                resolve('Error');
            }
        }, CONFIG.POLL_INTERVAL);

        // Initial check after a small delay
        setTimeout(() => {
            if (resolved) return;

            const result = detectValidityFromDOM(previousPageText);
            if (result !== null) {
                resolved = true;
                observer.disconnect();
                clearInterval(pollInterval);
                console.log('[DETECTED-INITIAL] Result found');
                resolve(result);
            }
        }, 1000);
    });
}

function detectValidityFromDOM(previousPageText) {
    const currentBodyText = document.body.innerText;

    // Debug: log text lengths and whether it changed
    const textChanged = !previousPageText || (currentBodyText !== previousPageText);
    console.log(`[DEBUG] Text changed: ${textChanged}, Prev: ${previousPageText ? previousPageText.length : 0} chars, Current: ${currentBodyText.length} chars`);

    // REMOVED: Don't check if text changed - AJAX updates might not change total length!
    // if (previousPageText && currentBodyText === previousPageText) {
    //     return null; // Page hasn't updated yet
    // }

    // Check for valid membership
    const hasValidText = currentBodyText.includes(PATTERNS.VALID);
    console.log(`[DEBUG] Contains "${PATTERNS.VALID}": ${hasValidText}`);

    if (hasValidText) {
        console.log('Detected: Valid membership');
        return 'Valid';
    }

    // Check for invalid membership
    const hasInvalidText = currentBodyText.includes(PATTERNS.INVALID);
    console.log(`[DEBUG] Contains error text: ${hasInvalidText}`);

    if (hasInvalidText) {
        console.log('Detected: Invalid membership');
        return 'Invalid';
    }

    // Debug: show a snippet of page text
    if (currentBodyText.includes('Membership status')) {
        const idx = currentBodyText.indexOf('Membership status');
        console.log('[DEBUG] Found "Membership status" at position', idx, '- snippet:', currentBodyText.substring(idx, idx + 100));
    }

    // No result detected yet
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to check if page is ready
function isPageReady() {
    const inputField = document.querySelector(SELECTORS.INPUT);
    const submitButton = document.querySelector(SELECTORS.SUBMIT_BUTTON);
    return inputField && submitButton;
}

// Log ready state
if (document.readyState === 'complete') {
    if (isPageReady()) {
        console.log('IEEE Validator Extension: Page is ready for automation');
    }
} else {
    window.addEventListener('load', () => {
        if (isPageReady()) {
            console.log('IEEE Validator Extension: Page is ready for automation');
        }
    });
}
