const fs = require('fs');

console.log('🧹 Cleaning files for release...');

// Reset categories.json to empty for releases
fs.writeFileSync('categories.json', '{}');
console.log('✅ Cleared categories.json');

// Only reset settings.json if it doesn't exist
if (!fs.existsSync('settings.json')) {
    const defaultSettings = {
        "darkMode": false,
        "theme": "default"
    };
    fs.writeFileSync('settings.json', JSON.stringify(defaultSettings, null, 4));
    console.log('✅ Created default settings.json');
} else {
    console.log('✅ Preserved existing settings.json');
}

console.log('🎉 Release files cleaned successfully!');