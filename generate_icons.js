const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

// Function to create an icon
function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(0, 0, size, size);

    // Text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', size/2, size/2);

    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
    
    // Create disabled version
    ctx.fillStyle = '#9E9E9E';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.fillText('B', size/2, size/2);
    
    const disabledBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, `icon${size}_disabled.png`), disabledBuffer);
}

// Generate icons of different sizes
[16, 48, 128].forEach(size => createIcon(size));

console.log('Icons generated successfully!');