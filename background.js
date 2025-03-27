// Initialize extension state
chrome.runtime.onInstalled.addListener(function() {
    console.log('Initializing extension...');
    chrome.storage.local.set({
        isScrapingEnabled: true,
        darkMode: false,
        leads: [],
        pagesScanned: 0,
        scannedUrls: []  // Changed from Set to array for storage compatibility
    });
});

// Track scanned pages to avoid duplicates
let scannedUrls = new Set();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    switch (request.action) {
        case 'startScraping':
            enableScraping();
            sendResponse({status: 'enabled'});
            break;

        case 'stopScraping':
            disableScraping();
            sendResponse({status: 'disabled'});
            break;

        case 'newLead':
            handleNewLead(request.lead, sendResponse);
            return true; // Keep the message channel open for async response

        case 'incrementPagesScanned':
            if (!scannedUrls.has(request.url)) {
                scannedUrls.add(request.url);
                incrementPagesScanned(sendResponse);
            } else {
                sendResponse({status: 'already counted'});
            }
            break;

        default:
            sendResponse({status: 'unknown action'});
    }
});

// Handle new lead data
async function handleNewLead(lead, sendResponse) {
    console.log('Processing new lead:', lead);
    try {
        const result = await chrome.storage.local.get(['leads', 'pagesScanned']);
        const leads = result.leads || [];
        
        // Add timestamp to the lead
        lead.date = new Date().toISOString();

        // Check for duplicates based on email
        const isDuplicate = leads.some(existingLead => 
            existingLead.email === lead.email && lead.email !== null
        );

        if (!isDuplicate && isValidLead(lead)) {
            leads.push(lead);
            await chrome.storage.local.set({ leads });
            
            // Notify popup to update its display
            try {
                await chrome.runtime.sendMessage({ 
                    action: 'updateStats',
                    stats: {
                        leadsCount: leads.length,
                        pagesScanned: result.pagesScanned
                    }
                });
            } catch (e) {
                console.log('Popup not open to receive update');
            }
            
            console.log('Lead saved successfully');
            sendResponse({status: 'success', leadsCount: leads.length});
        } else {
            console.log('Lead rejected (duplicate or invalid)');
            sendResponse({status: 'duplicate or invalid'});
        }
    } catch (error) {
        console.error('Error processing lead:', error);
        sendResponse({status: 'error', message: error.message});
    }
}

// Increment pages scanned counter
async function incrementPagesScanned(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['pagesScanned']);
        const newCount = (result.pagesScanned || 0) + 1;
        await chrome.storage.local.set({ pagesScanned: newCount });
        
        console.log('Pages scanned updated:', newCount);
        try {
            await chrome.runtime.sendMessage({ 
                action: 'updateStats',
                stats: { pagesScanned: newCount }
            });
        } catch (e) {
            console.log('Popup not open to receive update');
        }
        
        sendResponse({status: 'success', pagesScanned: newCount});
    } catch (error) {
        console.error('Error incrementing pages:', error);
        sendResponse({status: 'error', message: error.message});
    }
}

// Validate lead data
function isValidLead(lead) {
    return lead.email && lead.email.includes('@');
}

// Enable scraping
async function enableScraping() {
    console.log('Enabling scraping...');
    try {
        await chrome.storage.local.set({ isScrapingEnabled: true });
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content.js']
            });
        }
    } catch (error) {
        console.error('Error enabling scraping:', error);
    }
}

// Disable scraping
async function disableScraping() {
    console.log('Disabling scraping...');
    try {
        await chrome.storage.local.set({ isScrapingEnabled: false });
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            await chrome.tabs.sendMessage(tabs[0].id, { action: 'stopScraping' });
        }
    } catch (error) {
        console.error('Error disabling scraping:', error);
    }
}

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const result = await chrome.storage.local.get('isScrapingEnabled');
        if (result.isScrapingEnabled) {
            await chrome.scripting.executeScript({
                target: { tabId: activeInfo.tabId },
                files: ['content.js']
            });
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});

// Handle commands (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "toggle_scraping") {
        try {
            const result = await chrome.storage.local.get('isScrapingEnabled');
            if (result.isScrapingEnabled) {
                await disableScraping();
            } else {
                await enableScraping();
            }
        } catch (error) {
            console.error('Error handling command:', error);
        }
    }
}); 