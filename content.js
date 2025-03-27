// Regular expressions for data extraction
const patterns = {
    // Strict email regex that won't match URLs or query parameters
    email: /(?:^|\s|[<([])([\w!#$%&'*+/=?^_`{|}~-]+(?:\.[\w!#$%&'*+/=?^_`{|}~-]+)*@(?:[\w](?:[\w-]*[\w])?\.)+[a-zA-Z]{2,})(?:$|\s|[>\)]])/gi,
    phone: /(?:\+\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/g,
    linkedin: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]+/g
};

let isScrapingEnabled = true;
let processedEmails = new Set();
let observer = null;
let isProcessing = false; // Flag to prevent concurrent processing
let lastProcessedUrl = ''; // Track last processed URL
let scanTimeout = null; // Track scan timeout

// Debug function
function debugLog(message, data = null) {
    const debug = true; // Set to true to enable detailed logging
    if (debug) {
        if (data) {
            console.log(`[B2B Scraper Debug] ${message}:`, data);
        } else {
            console.log(`[B2B Scraper Debug] ${message}`);
        }
    }
}

// Initialize scraping
function initScraping() {
    debugLog('Initializing scraping...');
    isScrapingEnabled = true;
    
    // Clear any existing scan timeout
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    // Reset processed emails when URL changes
    if (lastProcessedUrl !== window.location.href) {
        processedEmails.clear();
        lastProcessedUrl = window.location.href;
    }
    
    // Initial scan with delay
    scanTimeout = setTimeout(() => {
        debugLog('Running initial scan');
        scrapePageContent();
    }, 2000); // Wait for page to load
    
    // Set up observer
    setupObserver();
}

// Set up mutation observer
function setupObserver() {
    debugLog('Setting up observer');
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver(function(mutations) {
        if (isScrapingEnabled && !isProcessing) {
            // Debounce the mutation observer to prevent too frequent scans
            if (scanTimeout) {
                clearTimeout(scanTimeout);
            }
            scanTimeout = setTimeout(() => {
                debugLog('Significant DOM changes detected, rescanning');
                scrapePageContent();
            }, 1000);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false // Don't watch for attribute changes
    });
    
    debugLog('Observer setup complete');
}

// Helper function to clean and validate email
function cleanAndValidateEmail(email) {
    if (!email || typeof email !== 'string') return null;
    
    // Remove any surrounding characters
    email = email.trim().toLowerCase();
    
    // Remove any URL parameters or paths
    if (email.includes('?') || email.includes('/') || email.includes('=')) {
        return null;
    }
    
    // Remove any prefixes like mailto:
    email = email.replace(/^mailto:/, '');
    
    // Remove any surrounding brackets, spaces, or quotes
    email = email.replace(/^[\s<(['"]+|[\s>\)]'"]+$/g, '');
    
    // Validate basic email format
    if (!email.includes('@') || !email.includes('.')) return null;
    
    // Check for valid email pattern
    const validEmailRegex = /^[\w!#$%&'*+/=?^_`{|}~-]+(?:\.[\w!#$%&'*+/=?^_`{|}~-]+)*@(?:[\w](?:[\w-]*[\w])?\.)+[a-zA-Z]{2,}$/i;
    return validEmailRegex.test(email) ? email : null;
}

// Process a single lead
async function processLead(lead) {
    return new Promise((resolve, reject) => {
        if (processedEmails.has(lead.email)) {
            resolve({ status: 'duplicate' });
            return;
        }

        chrome.runtime.sendMessage({
            action: 'newLead',
            lead: lead
        }, response => {
            if (chrome.runtime.lastError) {
                console.error('Error sending lead:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                debugLog('Lead processed with response', response);
                if (response && response.status === 'success') {
                    processedEmails.add(lead.email);
                }
                resolve(response);
            }
        });
    });
}

// Process multiple leads sequentially
async function processLeads(leads) {
    if (isProcessing) {
        debugLog('Already processing leads, skipping...');
        return;
    }

    isProcessing = true;
    debugLog('Starting to process leads', leads.length);

    try {
        let successCount = 0;
        for (const lead of leads) {
            if (!processedEmails.has(lead.email)) {
                debugLog('Processing lead', lead);
                const response = await processLead(lead);
                if (response && response.status === 'success') {
                    successCount++;
                    debugLog('Successfully processed lead', lead.email);
                } else {
                    debugLog('Failed to process lead', { lead, response });
                }
            }
        }

        // Only update scan count if we successfully processed any leads
        if (successCount > 0) {
            chrome.runtime.sendMessage({
                action: 'incrementPagesScanned',
                url: window.location.href
            }, response => {
                debugLog('Scan count update response', response);
            });
        }
    } catch (error) {
        console.error('Error processing leads:', error);
    } finally {
        isProcessing = false;
    }
}

// Main scraping function
function scrapePageContent() {
    if (!isScrapingEnabled) return;
    debugLog('Starting page scan');

    const emails = new Set();
    
    try {
        // Method 1: Direct text search
        const fullText = document.body.innerText || '';
        debugLog('Full text length', fullText.length);
        let matches = fullText.match(patterns.email) || [];
        matches.forEach(match => {
            const email = cleanAndValidateEmail(match);
            if (email) emails.add(email);
        });
        
        // Method 2: Search in HTML
        const htmlContent = document.body.innerHTML || '';
        debugLog('HTML content length', htmlContent.length);
        matches = htmlContent.match(patterns.email) || [];
        matches.forEach(match => {
            const email = cleanAndValidateEmail(match);
            if (email) emails.add(email);
        });
        
        // Method 3: Direct DOM traversal
        debugLog('Starting DOM traversal');
        traverseNode(document.body, emails);
        
        // Method 4: Check all links
        const links = document.getElementsByTagName('a');
        debugLog('Number of links found', links.length);
        Array.from(links).forEach(link => {
            const href = link.href || '';
            if (href.startsWith('mailto:')) {
                const email = cleanAndValidateEmail(href);
                if (email) {
                    debugLog('Found mailto email', email);
                    emails.add(email);
                }
            }
            
            // Check link text
            const linkText = link.textContent || '';
            const linkMatches = linkText.match(patterns.email) || [];
            linkMatches.forEach(match => {
                const email = cleanAndValidateEmail(match);
                if (email) {
                    debugLog('Found email in link text', email);
                    emails.add(email);
                }
            });
        });
        
        // Method 5: Check input fields
        const inputs = document.getElementsByTagName('input');
        debugLog('Number of inputs found', inputs.length);
        Array.from(inputs).forEach(input => {
            const value = input.value || '';
            const placeholder = input.placeholder || '';
            [value, placeholder].forEach(text => {
                const inputMatches = text.match(patterns.email) || [];
                inputMatches.forEach(match => {
                    const email = cleanAndValidateEmail(match);
                    if (email) {
                        debugLog('Found email in input', email);
                        emails.add(email);
                    }
                });
            });
        });

        // Filter out any remaining invalid emails
        const validEmails = new Set(
            Array.from(emails).filter(email => cleanAndValidateEmail(email))
        );

        debugLog('Total unique valid emails found', validEmails.size);
        debugLog('Valid Emails:', Array.from(validEmails));

        // Create leads from valid emails
        const leads = Array.from(validEmails).map(email => ({
            name: findNameNearEmail(email),
            email: email,
            phone: findPhoneNumber(),
            website: window.location.hostname,
            company: findCompanyName(),
            source: window.location.href
        })).filter(isValidLead);

        // Process leads if we found any
        if (leads.length > 0) {
            debugLog('Processing leads', leads);
            processLeads(leads);
        }

    } catch (error) {
        console.error('[B2B Scraper Error]', error);
    }
}

function traverseNode(node, emails) {
    try {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            const matches = text.match(patterns.email);
            if (matches) {
                matches.forEach(match => {
                    const email = cleanAndValidateEmail(match);
                    if (email) {
                        debugLog('Found emails in text node', email);
                        emails.add(email);
                    }
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip hidden elements
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return;
            }

            // Check attributes
            ['href', 'data-email', 'title', 'alt', 'value', 'placeholder'].forEach(attr => {
                if (node.hasAttribute(attr)) {
                    const attrValue = node.getAttribute(attr);
                    const matches = attrValue.match(patterns.email);
                    if (matches) {
                        matches.forEach(match => {
                            const email = cleanAndValidateEmail(match);
                            if (email) {
                                debugLog(`Found emails in ${attr} attribute`, email);
                                emails.add(email);
                            }
                        });
                    }
                }
            });

            // Recursively check child nodes
            node.childNodes.forEach(child => traverseNode(child, emails));
        }
    } catch (error) {
        console.error('[B2B Scraper Traverse Error]', error);
    }
}

function findNameNearEmail(email) {
    // Only try to extract name from email if it follows first.last@domain.com pattern
    const emailName = email.split('@')[0];
    if (emailName.includes('.')) {
        const parts = emailName.split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .filter(part => part.length > 1); // Filter out single letters
        if (parts.length === 2) { // Only use if we have exactly first and last name
            return parts.join(' ');
        }
    }

    // If we can't extract from email, return null
    return null;
}

function findPhoneNumber() {
    const text = document.body.innerText;
    const matches = text.match(patterns.phone);
    if (!matches) return null;

    // Format phone number
    const phone = matches[0].replace(/[^\d+]/g, '');
    return phone.length >= 10 ? phone : null;
}

function findCompanyName() {
    // Try meta tags first
    const metaTags = [
        'meta[property="og:site_name"]',
        'meta[name="application-name"]',
        'meta[name="company"]'
    ];
    
    for (const selector of metaTags) {
        const meta = document.querySelector(selector);
        if (meta && meta.content) {
            return meta.content.trim();
        }
    }
    
    // Try common company name elements
    const companyElements = document.querySelector('.company-name, .organization, [itemprop="organization"]');
    if (companyElements && companyElements.textContent) {
        return companyElements.textContent.trim();
    }
    
    // Fall back to domain name
    return window.location.hostname.replace('www.', '').split('.')[0];
}

function isValidEmail(email) {
    return !!cleanAndValidateEmail(email);
}

function isValidLead(lead) {
    return lead.email && 
           lead.email.includes('@') && 
           lead.email.includes('.') && 
           lead.email.length > 5;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    debugLog('Content script received message:', request);
    if (request.action === 'stopScraping') {
        isScrapingEnabled = false;
        if (observer) {
            observer.disconnect();
        }
        if (scanTimeout) {
            clearTimeout(scanTimeout);
        }
        sendResponse({status: 'stopped'});
    } else if (request.action === 'startScraping') {
        isScrapingEnabled = true;
        initScraping();
        sendResponse({status: 'started'});
    }
    return true; // Keep the message channel open for async response
});

// Start scraping immediately
debugLog('Content script loaded, starting initialization...');
// Wait for page to be ready
if (document.readyState === 'complete') {
    initScraping();
} else {
    window.addEventListener('load', initScraping);
}

// Also listen for DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM content loaded, ensuring scraping is initialized');
    if (!observer) {
        initScraping();
    }
}); 