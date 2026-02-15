// === DEPENDENCIES & SETUP ===
require('dotenv').config(); // Load environment variables
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Import models and middleware
const User = require('./models/User');
const { authenticateToken } = require('./middleware/auth');

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
const strMongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/CollectorDream';
mongoose.connect(strMongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully to:', strMongoURI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB'))
.catch(err => console.log('MongoDB connection error:', err));

// === DATABASE SCHEMA ===
const Schema = mongoose.Schema;

// Update data schema to include userId
const dataSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true  // Index for faster queries
    },
    category: {
        type: String,
        required: true,
        index: true  // Index for faster category filtering
    }
    // All other fields are dynamic (strict: false)
}, { strict: false, timestamps: true });

const Data = mongoose.model('Data', dataSchema, 'collection');

// === AUTHENTICATION ROUTES (MUST BE BEFORE STATIC FILES) ===

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                message: existingUser.email === email 
                    ? 'Email already registered' 
                    : 'Username already taken' 
            });
        }

        // Create new user
        const user = new User({ username, email, password });
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Token expires in 7 days
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find user (allow login with username OR email)
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token with different expiry based on rememberMe
        const expiresIn = rememberMe ? '30d' : '7d';
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Verify token (check if user is still authenticated)
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            valid: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying token' });
    }
});

// Logout (client-side will delete token, but this endpoint can be used for logging)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // In a more complex setup, you might invalidate the token in a blacklist
    res.json({ message: 'Logout successful' });
});

// === VERSION CHECK ENDPOINT ===
app.get('/api/version', (req, res) => {
    res.json({ version: '1.2.0', timestamp: Date.now() });
});

// === COLLECTION ROUTES (PROTECTED) ===

// GET all collection items (filtered by user)
app.get('/api/collection', authenticateToken, async (req, res) => {
    console.log('GET /api/collection - Loading records for user:', req.user.userId);
    try {
        const arrAllData = await Data.find({ userId: req.user.userId });
        console.log('Found', arrAllData.length, 'records');
        res.json(arrAllData);
    } catch (error) {
        console.log('Error loading collection:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST new collection item (with userId)
app.post('/api/collection', authenticateToken, async (req, res) => {
    try {
        const objNewData = new Data({
            ...req.body,
            userId: req.user.userId  // Automatically add user ID
        });
        const objSavedData = await objNewData.save();
        res.status(201).json(objSavedData);
    } catch(err){
        res.status(400).json({message: err.message});
    }
});

// GET single item (verify ownership)
app.get('/api/collection/:id', authenticateToken, async (req, res) => {
    try {
        const strId = req.params.id;
        const objDocument = await Data.findOne({ 
            _id: strId, 
            userId: req.user.userId  // Verify user owns this item
        });
        if (!objDocument) {
            return res.status(404).json({ message: "Document not found or access denied" });
        }
        res.json(objDocument);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

// PUT update item (verify ownership)
app.put('/api/collection/:id', authenticateToken, async (req, res) => {
    try {
        const strId = req.params.id;
        // Don't allow userId to be changed
        const { userId, ...updateData } = req.body;
        
        const objUpdatedData = await Data.findOneAndUpdate(
            { _id: strId, userId: req.user.userId },
            updateData,
            { new: true }
        );
        if (!objUpdatedData) {
            return res.status(404).json({ message: "Document not found or access denied" });
        }
        res.json(objUpdatedData);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

// DELETE item (verify ownership)
app.delete('/api/collection/:id', authenticateToken, async (req, res) => {
    try {
        const strId = req.params.id;
        const objDocument = await Data.findOneAndDelete({ 
            _id: strId, 
            userId: req.user.userId 
        });
        if (!objDocument) {
            return res.status(404).json({ message: "Document not found or access denied" });
        }
        res.json({ message: "Document deleted successfully", deletedData: objDocument });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format" });
        }
        res.status(500).json({ message: error.message });
    }
});

// === CATEGORY ROUTES (USER-SPECIFIC) ===

// GET categories (user-specific)
app.get('/api/categories', authenticateToken, (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), `categories_${req.user.userId}.json`);
        let objCategories = {};
        if (fs.existsSync(strCategoriesPath)) {
            objCategories = JSON.parse(fs.readFileSync(strCategoriesPath, 'utf8'));
        }
        res.json(objCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST categories (user-specific)
app.post('/api/categories', authenticateToken, async (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), `categories_${req.user.userId}.json`);
        let objCategories = {};
        if (fs.existsSync(strCategoriesPath)) {
            objCategories = JSON.parse(fs.readFileSync(strCategoriesPath, 'utf8'));
        }
        const { key: strKey, category: objCategory, migrate = false } = req.body;
        
        const objOldCategory = objCategories[strKey];
        objCategories[strKey] = objCategory;
        fs.writeFileSync(strCategoriesPath, JSON.stringify(objCategories, null, 4));
        
        if (migrate && objOldCategory) {
            await migrateCategoryItems(strKey, objOldCategory, objCategory, req.user.userId);
        }
        
        res.json({ message: 'Category saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE category (user-specific)
app.delete('/api/categories/:key', authenticateToken, (req, res) => {
    try {
        const strCategoriesPath = path.join(getUserDataPath(), `categories_${req.user.userId}.json`);
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

// Helper function to migrate category items
async function migrateCategoryItems(strCategoryKey, objOldCategory, objNewCategory, userId) {
    const arrItems = await Data.find({ category: strCategoryKey, userId: userId });
    
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
            if (strFieldName !== '_id' && strFieldName !== '__v' && 
                strFieldName !== 'category' && strFieldName !== 'userId' &&
                !arrNewFieldNames.includes(strFieldName)) {
                objUpdates[strFieldName] = undefined;
            }
        });
        
        if (Object.keys(objUpdates).length > 0) {
            await Data.findByIdAndUpdate(
                objItem._id, 
                { 
                    $unset: Object.fromEntries(Object.entries(objUpdates).filter(([k,v]) => v === undefined)), 
                    $set: Object.fromEntries(Object.entries(objUpdates).filter(([k,v]) => v !== undefined)) 
                }
            );
        }
    }
}

// === SETTINGS ROUTES (USER-SPECIFIC) ===

// GET settings (user-specific)
app.get('/api/settings', authenticateToken, (req, res) => {
    try {
        const strSettingsPath = path.join(getUserDataPath(), `settings_${req.user.userId}.json`);
        let objSettings = { darkMode: false, theme: 'default', language: 'en' };
        if (fs.existsSync(strSettingsPath)) {
            objSettings = JSON.parse(fs.readFileSync(strSettingsPath, 'utf8'));
        }
        res.json(objSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST settings (user-specific)
app.post('/api/settings', authenticateToken, (req, res) => {
    try {
        const strSettingsPath = path.join(getUserDataPath(), `settings_${req.user.userId}.json`);
        const objSettings = req.body;
        fs.writeFileSync(strSettingsPath, JSON.stringify(objSettings, null, 4));
        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// === LANGUAGE FILES ROUTE ===
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
    console.log('Serving auth.html (login page)');
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// Handle 404s
app.use((req, res) => {
    console.log('404 - Route not found:', req.url);
    res.status(404).send('Not Found: ' + req.url);
});

// === HELPER FUNCTIONS ===

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

// Ensure required directories exist
function ensureRequiredFiles() {
    const userDataDir = getUserDataPath();
    
    // Create user data directory if it doesn't exist
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log('Created user data directory:', userDataDir);
    }
    
    // Note: Individual user files will be created as needed
    console.log('User data directory:', userDataDir);
}

// === START SERVER ===
if (!module.parent) {
    ensureRequiredFiles();
    app.listen(intPort, () => {
        console.log(`Server running on port ${intPort}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
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