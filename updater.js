// === AUTO-UPDATER MODULE ===
const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

// Handle automatic app updates
class AppUpdater {
    constructor() {
        // Configure updater
        autoUpdater.autoDownload = false;
        autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'BSchoenth245',
            repo: 'Collectors-Dream'
        });
        
        console.log('App version:', app.getVersion());
        console.log('Checking for updates...');
        
        // Check for updates
        setTimeout(() => {
            autoUpdater.checkForUpdatesAndNotify();
        }, 3000);
        
        // === UPDATE EVENT HANDLERS ===
        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for update...');
        });
        
        autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available. Download now?`,
                buttons: ['Download', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
        });
        
        autoUpdater.on('update-not-available', () => {
            console.log('No updates available');
        });
        
        autoUpdater.on('error', (err) => {
            console.error('Updater error:', err);
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: `Version ${info.version} downloaded. Restart to install?`,
                buttons: ['Restart', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });
    }
}

module.exports = AppUpdater;