# B2B Lead Scraper Chrome Extension

A powerful Chrome extension that automatically scrapes and collects B2B contact information from websites you visit. The extension runs in the background and extracts valuable contact details including names, email addresses, phone numbers, company information, and more in CSV table format.
image.png

## Features

- 🔄 Automatic background scraping
- 📊 Clean and minimal UI
- 🌓 Light/Dark theme support
- 📱 Phone number detection
- 📧 Email address extraction
- 🏢 Company information gathering
- 📍 Address detection
- 🔗 LinkedIn profile detection
- 📁 CSV export functionality
- 🎯 Duplicate lead prevention
- 📊 Real-time statistics
- ⌨️ Keyboard shortcuts

## Installation

1. Clone this repository (https://github.com/jeremymartinezq/B2B-Lead-Scraper.git) or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar to open the interface
2. Toggle the scraping on/off using the switch in the popup
3. Browse websites as normal - the extension will automatically collect contact information
4. View collected leads in the popup interface
5. Export leads to CSV using the "Export to CSV" button
6. Clear collected data using the "Clear Data" button if needed
7. Toggle between light and dark themes using the theme switch

## Keyboard Shortcuts

- Toggle scraping: `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac)

## Data Collection

The extension collects the following information when available:

- Names
- Email addresses
- Phone numbers
- Company names
- Job titles/positions
- Physical addresses
- Website URLs
- LinkedIn profiles
- Source URLs
- Timestamp of collection

## Privacy & Security

- All data is stored locally in your browser
- No data is sent to external servers
- You can clear collected data at any time
- The extension only activates on websites you visit while it's enabled

## Development

### Project Structure

```
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── content.js            # Content script for scraping
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Building from Source

1. Install dependencies (none required)
2. Make any desired modifications to the source code
3. Load the extension in Chrome using Developer mode

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 