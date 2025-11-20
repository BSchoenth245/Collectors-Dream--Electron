// === DEPENDENCIES & SETUP ===
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const intPort = process.env.PORT || 8000;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Prevent caching of API responses
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// === DATABASE CONNECTION ===
const strMongoURI = 'mongodb://127.0.0.1:27017/CollectorDream';
mongoose.connect(strMongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.log('MongoDB connection error:', err));

// === DATABASE SCHEMA ===
const Schema = mongoose.Schema;
const dataSchema = new Schema({}, { strict: false });
const Data = mongoose.model('Data', dataSchema, 'collection');

// === API ROUTES (MUST BE BEFORE STATIC FILES) ===

// Version check endpoint
app.get('/api/version', (req, res) => {
    res.json({ version: '1.1.2', timestamp: Date.now() });
});

// Individual collection record routes (MUST BE FIRST)
app.get('/api/collection/:id', async (req, res) => {
    try {
        const strId = req.params.id;
        const objDocument = await Data.findById(strId);
        if (!objDocument) {
            return res.status(404).json({ message: "Document not found" });
        }
        res.json(objDocument);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/collection/:id', async (req, res) => {
    try {
        const strId = req.params.id;
        const objUpdatedData = await Data.findByIdAndUpdate(strId, req.body, { new: true });
        if (!objUpdatedData) {
            return res.status(404).json({ message: "Document not found" });
        }
        res.json(objUpdatedData);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/collection/:id', async (req, res) => {
    try {
        const strId = req.params.id;
        const objDocument = await Data.findById(strId);
        if (!objDocument) {
            return res.status(404).json({ message: "Document not found" });
        }
        const objDeletedData = await Data.findByIdAndDelete(strId);
        res.json({ message: "Document deleted successfully", deletedData: objDeletedData });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

// General collection routes (AFTER specific ID routes)
app.get('/api/collection', async (req, res) => {
    console.log('GET /api/collection - Loading all records');
    try {
        const arrAllData = await Data.find();
        console.log('Found', arrAllData.length, 'records');
        res.json(arrAllData);
    } catch (error) {
        console.log('Error loading collection:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/collection', async (req, res) => {
    try {
        const objNewData = Data(req.body);
        const objSavedData = await objNewData.save();
        res.status(201).json(objSavedData);
    } catch(err){
        res.status(400).json({message: err.message});
    }
});

// Category routes
app.get('/api/categories', (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), 'categories.json');
        let objCategories = {};
        if (fs.existsSync(strCategoriesPath)) {
            objCategories = JSON.parse(fs.readFileSync(strCategoriesPath, 'utf8'));
        }
        res.json(objCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), 'categories.json');
        let objCategories = {};
        if (fs.existsSync(strCategoriesPath)) {
            objCategories = JSON.parse(fs.readFileSync(strCategoriesPath, 'utf8'));
        }
        const { key: strKey, category: objCategory, migrate = false } = req.body;
        
        const objOldCategory = objCategories[strKey];
        objCategories[strKey] = objCategory;
        fs.writeFileSync(strCategoriesPath, JSON.stringify(objCategories, null, 4));
        
        if (migrate && objOldCategory) {
            await migrateCategoryItems(strKey, objOldCategory, objCategory);
        }
        
        res.json({ message: 'Category saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

async function migrateCategoryItems(strCategoryKey, objOldCategory, objNewCategory) {
    const arrItems = await Data.find({ category: strCategoryKey });
    
    for (const objItem of arrItems) {
        const objUpdates = {};
        
        // Add new fields with default values
        objNewCategory.fields.forEach(objNewField => {
            if (!objItem.hasOwnProperty(objNewField.name)) {
                objUpdates[objNewField.name] = objNewField.type === 'boolean' ? false : 
                                              objNewField.type === 'number' ? 0 : '';
            }
        });
        
        // Remove fields no longer in category
        const arrNewFieldNames = objNewCategory.fields.map(f => f.name);
        Object.keys(objItem.toObject()).forEach(strFieldName => {
            if (strFieldName !== '_id' && strFieldName !== '__v' && strFieldName !== 'category' && 
                !arrNewFieldNames.includes(strFieldName)) {
                objUpdates[strFieldName] = undefined;
            }
        });
        
        if (Object.keys(objUpdates).length > 0) {
            await Data.findByIdAndUpdate(objItem._id, { $unset: Object.fromEntries(Object.entries(objUpdates).filter(([k,v]) => v === undefined)), $set: Object.fromEntries(Object.entries(objUpdates).filter(([k,v]) => v !== undefined)) });
        }
    }
}

app.delete('/api/categories/:key', (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), 'categories.json');
        let objCategories = {};
        if (fs.existsSync(strCategoriesPath)) {
            objCategories = JSON.parse(fs.readFileSync(strCategoriesPath, 'utf8'));
        }
        const strKey = req.params.key;
        if (!objCategories[strKey]) {
            return res.status(404).json({ message: 'Category not found' });
        }
        delete objCategories[strKey];
        fs.writeFileSync(strCategoriesPath, JSON.stringify(objCategories, null, 4));
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Settings routes
app.get('/api/settings', (req, res) => {
    try {
        const strSettingsPath = path.join(getUserDataPath(), 'settings.json');
        let objSettings = { darkMode: false, theme: 'default', language: 'en' };
        if (fs.existsSync(strSettingsPath)) {
            objSettings = JSON.parse(fs.readFileSync(strSettingsPath, 'utf8'));
        }
        res.json(objSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/settings', (req, res) => {
    try {
        const strSettingsPath = path.join(getUserDataPath(), 'settings.json');
        const objSettings = req.body;
        fs.writeFileSync(strSettingsPath, JSON.stringify(objSettings, null, 4));
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Language files route
app.get('/locales/:lang.json', (req, res) => {
    try {
        const langFile = path.join(__dirname, 'locales', `${req.params.lang}.json`);
        if (fs.existsSync(langFile)) {
            res.json(JSON.parse(fs.readFileSync(langFile, 'utf8')));
        } else {
            res.status(404).json({ error: 'Language file not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === STATIC FILES (AFTER ALL API ROUTES) ===
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        console.log('Serving static file:', path);
    }
}));

// === ROOT ROUTE (LAST) ===
app.get('/', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404s without catch-all route
app.use((req, res) => {
    console.log('404 - Route not found:', req.url);
    res.status(404).send('Not Found: ' + req.url);
});

// Get user data directory for writable files
function getUserDataPath() {
    const os = require('os');
    
    if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Local', 'CollectorsDream');
    } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'CollectorsDream');
    } else {
        return path.join(os.homedir(), '.config', 'collectors-dream');
    }
}

// Ensure required files exist
function ensureRequiredFiles() {
    const userDataDir = getUserDataPath();
    
    // Create user data directory if it doesn't exist
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log('Created user data directory:', userDataDir);
    }
    
    const strCategoriesPath = path.join(userDataDir, 'categories.json');
    if (!fs.existsSync(strCategoriesPath)) {
        fs.writeFileSync(strCategoriesPath, '{}');
        console.log('Created categories.json at:', strCategoriesPath);
    }
    
    const strSettingsPath = path.join(userDataDir, 'settings.json');
    if (!fs.existsSync(strSettingsPath)) {
        const defaultSettings = { darkMode: false, theme: 'default', language: 'en' };
        fs.writeFileSync(strSettingsPath, JSON.stringify(defaultSettings, null, 4));
        console.log('Created settings.json at:', strSettingsPath);
    }
}

// Start server
if (!module.parent) {
    ensureRequiredFiles();
    app.listen(intPort, () => {
        console.log(`Server running on port ${intPort}`);
    }).on('error', (err) => {
        console.error('Server failed to start:', err);
    });
} else {
    // When required by Electron
    try {
        ensureRequiredFiles();
        const server = app.listen(intPort, () => {
            console.log(`Server running on port ${intPort}`);
        });
        
        server.on('error', (err) => {
            console.error('Server error:', err);
        });
        
        module.exports = server;
    } catch (error) {
        console.error('Failed to start server in Electron:', error);
        throw error;
    }
}