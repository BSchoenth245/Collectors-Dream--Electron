const fs = require('fs');

console.log('🧹 Cleaning files for release...');

// Reset categories.json to empty
fs.writeFileSync('categories.json', '{}');
console.log('✅ Cleared categories.json');

// Reset settings.json to defaults
const defaultSettings = {
    "darkMode": false,
    "theme": "default"
};
fs.writeFileSync('settings.json', JSON.stringify(defaultSettings, null, 4));
console.log('✅ Reset settings.json to defaults');

console.log('🎉 Release files cleaned successfully!');