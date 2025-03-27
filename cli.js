#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Chrome's local storage path (Windows)
const CHROME_USER_DATA = process.env.LOCALAPPDATA + '\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb';

// Extension ID placeholder - user needs to replace this with their extension ID
let EXTENSION_ID = '';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showHelp() {
    console.log(`
B2B Lead Scraper CLI
===================

Commands:
  help                Show this help message
  status             Show extension status and statistics
  export [filename]  Export leads to CSV file
  clear              Clear all stored leads
  config             Configure extension settings
  quit               Exit the CLI
`);
}

function getStoragePath() {
    if (!EXTENSION_ID) {
        console.error('Error: Extension ID not configured. Please run the config command first.');
        return null;
    }
    return path.join(CHROME_USER_DATA, EXTENSION_ID);
}

async function getExtensionData() {
    const storagePath = getStoragePath();
    if (!storagePath) return null;

    try {
        // This is a simplified version - in reality, you'd need to parse Chrome's LevelDB
        // For demonstration, we'll just show placeholder data
        return {
            isScrapingEnabled: true,
            leads: [],
            pagesScanned: 0
        };
    } catch (error) {
        console.error('Error reading extension data:', error);
        return null;
    }
}

async function showStatus() {
    const data = await getExtensionData();
    if (!data) return;

    console.log(`
Extension Status
===============
Scraping: ${data.isScrapingEnabled ? 'Enabled' : 'Disabled'}
Leads Collected: ${data.leads.length}
Pages Scanned: ${data.pagesScanned}
`);
}

async function exportLeads(filename) {
    const data = await getExtensionData();
    if (!data) return;

    const defaultFilename = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    const outputFile = filename || defaultFilename;

    try {
        // In a real implementation, you'd format the leads data as CSV
        console.log(`Exporting leads to ${outputFile}...`);
        console.log('Note: This is a demo. In a real implementation, this would export actual leads data.');
    } catch (error) {
        console.error('Error exporting leads:', error);
    }
}

async function clearData() {
    rl.question('Are you sure you want to clear all leads? This cannot be undone. (y/N) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
            try {
                console.log('Clearing all leads...');
                console.log('Note: This is a demo. In a real implementation, this would clear the actual data.');
            } catch (error) {
                console.error('Error clearing data:', error);
            }
        }
    });
}

async function configureExtension() {
    rl.question('Please enter your extension ID: ', (id) => {
        EXTENSION_ID = id;
        console.log('Extension ID configured successfully.');
    });
}

async function processCommand(cmd) {
    const [command, ...args] = cmd.trim().split(' ');

    switch (command.toLowerCase()) {
        case 'help':
            showHelp();
            break;
        case 'status':
            await showStatus();
            break;
        case 'export':
            await exportLeads(args[0]);
            break;
        case 'clear':
            await clearData();
            break;
        case 'config':
            await configureExtension();
            break;
        case 'quit':
        case 'exit':
            rl.close();
            break;
        default:
            console.log('Unknown command. Type "help" for available commands.');
    }
}

// Main CLI loop
console.log('Welcome to B2B Lead Scraper CLI');
console.log('Type "help" for available commands or "quit" to exit.');

rl.on('line', (line) => {
    processCommand(line);
});

rl.on('close', () => {
    console.log('Goodbye!');
    process.exit(0);
}); 