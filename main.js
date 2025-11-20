// === ELECTRON MAIN PROCESS ===
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const AppUpdater = require('./updater');
const MongoInstaller = require('./mongo-installer');

let objMainWindow;
let objWizardWindow;
let objServer;
const objInstaller = new MongoInstaller();

// Create MongoDB setup wizard
function createWizard() {
    objWizardWindow = new BrowserWindow({
        width: 600,
        height: 500,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets', 'colored-logo.png')
    });

    objWizardWindow.loadFile('mongo-wizard.html');
    
    objWizardWindow.on('closed', () => {
        objWizardWindow = null;
    });
}

// Create main application window
function createWindow() {
    objMainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            cache: false
        },
        icon: path.join(__dirname, 'assets', 'colored-logo.png')
    });

    // Start the Express server (it will handle loading the URL)
    startServer();

    objMainWindow.on('closed', () => {
        objMainWindow = null;
    });
}

// Get user data directory
function getUserDataDir() {
    return app.getPath('userData');
}

// Check if this is first run
function isFirstRun() {
    const strConfigPath = path.join(getUserDataDir(), 'config.json');
    return !fs.existsSync(strConfigPath);
}

// Mark as configured
function markConfigured() {
    const strDataDir = getUserDataDir();
    const strConfigPath = path.join(strDataDir, 'config.json');
    
    if (!fs.existsSync(strDataDir)) {
        fs.mkdirSync(strDataDir, { recursive: true });
    }
    
    fs.writeFileSync(strConfigPath, JSON.stringify({ configured: true, timestamp: Date.now() }));
}

// Start Express server
function startServer() {
    console.log('Starting server...');
    
    // Check if port is available first
    const net = require('net');
    const server = net.createServer();
    
    server.listen(8000, (err) => {
        if (err) {
            console.log('Port 8000 is busy, trying 8001');
            startServerOnPort(8001);
        } else {
            server.close();
            startServerOnPort(8000);
        }
    });
    
    server.on('error', (err) => {
        console.log('Port check failed:', err.message);
        startServerOnPort(8001);
    });
}

function startServerOnPort(port) {
    try {
        process.env.PORT = port;
        objServer = require('./server.js');
        console.log(`Server started on port ${port}`);
        
        // Update the URL to load
        setTimeout(() => {
            const url = `http://localhost:${port}`;
            console.log('Loading URL:', url);
            objMainWindow.loadURL(url).catch(err => {
                console.error('Failed to load URL:', err);
                objMainWindow.loadFile('index.html');
            });
        }, 3000);
        
    } catch (error) {
        console.error('Failed to start server:', error);
        console.error('Error details:', error.stack);
        objMainWindow.loadFile('index.html');
    }
}

// === IPC HANDLERS ===
ipcMain.on('check-mongodb', async (event) => {
    try {
        const objResult = await objInstaller.checkMongoDB();
        event.reply('mongodb-status', objResult);
    } catch (error) {
        console.error('Error checking MongoDB:', error);
        event.reply('mongodb-status', { found: false, error: error.message });
    }
});

ipcMain.on('install-mongodb', async (event) => {
    try {
        const objResult = await objInstaller.installMongoDB((objProgress) => {
            if (event.sender && !event.sender.isDestroyed()) {
                event.reply('install-progress', objProgress);
            }
        });
        if (event.sender && !event.sender.isDestroyed()) {
            event.reply('install-result', objResult);
        }
    } catch (error) {
        console.error('Error installing MongoDB:', error);
        if (event.sender && !event.sender.isDestroyed()) {
            event.reply('install-result', { success: false, error: error.message });
        }
    }
});

ipcMain.on('skip-mongodb', (event) => {
    markConfigured();
    if (objWizardWindow) {
        objWizardWindow.close();
    }
    createWindow();
});

ipcMain.on('continue-to-app', (event) => {
    markConfigured();
    if (objWizardWindow) {
        objWizardWindow.close();
    }
    createWindow();
});

// === ELECTRON APP LIFECYCLE ===
app.whenReady().then(async () => {
    try {
        if (isFirstRun()) {
            createWizard();
        } else {
            createWindow();
        }
        new AppUpdater();
    } catch (error) {
        console.error('Error during app startup:', error);
        createWindow();
    }
});

// Handle app quit when all windows closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle uncaught exceptions to prevent app crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle app activation (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});