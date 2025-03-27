document.addEventListener('DOMContentLoaded', function() {
    const scrapingToggle = document.getElementById('scraping-toggle');
    const themeToggle = document.getElementById('theme-toggle');
    const exportButton = document.getElementById('export-csv');
    const clearButton = document.getElementById('clear-data');
    const leadsCount = document.getElementById('leads-count');
    const pagesCount = document.getElementById('pages-count');
    const leadsTable = document.getElementById('leads-table');

    // Initialize theme
    chrome.storage.local.get('darkMode', function(result) {
        const isDarkMode = result.darkMode || false;
        themeToggle.checked = isDarkMode;
        updateTheme(isDarkMode);
    });

    // Initialize scraping status
    chrome.storage.local.get('isScrapingEnabled', function(result) {
        const isEnabled = result.isScrapingEnabled !== false; // Default to true
        scrapingToggle.checked = isEnabled;
        updateScrapingStatus(isEnabled);
    });

    // Theme toggle handler
    themeToggle.addEventListener('change', function() {
        const isDarkMode = this.checked;
        updateTheme(isDarkMode);
        chrome.storage.local.set({ darkMode: isDarkMode });
    });

    // Scraping toggle handler
    scrapingToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        updateScrapingStatus(isEnabled);
        chrome.storage.local.set({ isScrapingEnabled: isEnabled });
        chrome.runtime.sendMessage({ 
            action: isEnabled ? 'startScraping' : 'stopScraping' 
        }, response => {
            console.log('Toggle response:', response);
        });
    });

    // Export button handler
    exportButton.addEventListener('click', exportToCSV);

    // Clear button handler
    clearButton.addEventListener('click', clearData);

    // Update stats and table
    updateStats();
    updateLeadsTable();

    // Listen for messages from content script and background
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log('Popup received message:', request);
        if (request.action === 'updateStats') {
            if (request.stats) {
                updateStatsDisplay(request.stats);
            } else {
                updateStats();
            }
            updateLeadsTable();
        }
    });
});

function updateTheme(isDarkMode) {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

function updateScrapingStatus(isEnabled) {
    chrome.action.setIcon({
        path: {
            16: `icons/icon16${isEnabled ? '' : '_disabled'}.png`,
            48: `icons/icon48${isEnabled ? '' : '_disabled'}.png`,
            128: `icons/icon128${isEnabled ? '' : '_disabled'}.png`
        }
    });
}

function updateStats() {
    chrome.storage.local.get(['leads', 'pagesScanned'], function(result) {
        updateStatsDisplay({
            leadsCount: (result.leads || []).length,
            pagesScanned: result.pagesScanned || 0
        });
    });
}

function updateStatsDisplay(stats) {
    if (stats.leadsCount !== undefined) {
        document.getElementById('leads-count').textContent = stats.leadsCount;
    }
    if (stats.pagesScanned !== undefined) {
        document.getElementById('pages-count').textContent = stats.pagesScanned;
    }
}

function updateLeadsTable() {
    chrome.storage.local.get('leads', function(result) {
        const leads = result.leads || [];
        const table = document.createElement('table');
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Name', 'Email', 'Phone', 'Website', 'Source'];
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        
        // Show only the last 10 leads
        leads.slice(-10).forEach(lead => {
            const row = document.createElement('tr');
            
            [lead.name, lead.email, lead.phone, lead.website, lead.source].forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell || '-';
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        
        // Clear and update the table container
        const container = document.getElementById('leads-table');
        container.innerHTML = '';
        container.appendChild(table);
    });
}

function exportToCSV() {
    chrome.storage.local.get('leads', function(result) {
        const leads = result.leads || [];
        if (leads.length === 0) {
            alert('No leads to export!');
            return;
        }

        const headers = ['Name', 'Email', 'Phone', 'Address', 'Website', 'Company', 'Position', 'LinkedIn', 'Source', 'Date'];
        const csvContent = [
            headers.join(','),
            ...leads.map(lead => {
                return [
                    lead.name,
                    lead.email,
                    lead.phone,
                    lead.address,
                    lead.website,
                    lead.company,
                    lead.position,
                    lead.linkedin,
                    lead.source,
                    lead.date
                ].map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function clearData() {
    if (confirm('Are you sure you want to clear all leads? This action cannot be undone.')) {
        chrome.storage.local.set({
            leads: [],
            pagesScanned: 0
        }, function() {
            updateStats();
            updateLeadsTable();
        });
    }
} 