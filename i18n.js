// === INTERNATIONALIZATION SYSTEM ===
let currentLanguage = 'en';
let translations = {};

// Load translation file
async function loadTranslations(langCode) {
    try {
        const response = await fetch(`/locales/${langCode}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load ${langCode} translations`);
        }
        translations[langCode] = await response.json();
        currentLanguage = langCode;
        console.log(`Loaded ${langCode} translations`);
        return true;
    } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to English if available
        if (langCode !== 'en' && translations['en']) {
            currentLanguage = 'en';
            return true;
        }
        return false;
    }
}

// Translation function
function t(key) {
    if (!translations[currentLanguage]) {
        return key;
    }
    return translations[currentLanguage][key] || key;
}

// Update all translatable elements
function updateAllText() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
            element.value = t(key);
        } else if (element.hasAttribute('placeholder')) {
            element.placeholder = t(key);
        } else {
            element.textContent = t(key);
        }
    });
    
    // Update page title
    document.title = t('appTitle');
}

// Switch language and update UI
async function switchLanguage(langCode) {
    const success = await loadTranslations(langCode);
    if (success) {
        updateAllText();
        
        // Update dropdowns with translated text
        if (typeof populateCategoryDropdowns === 'function') {
            populateCategoryDropdowns();
        }
        
        // Update empty table message
        if (typeof showEmptyTable === 'function') {
            const elmTable = document.getElementById('dataTable');
            if (elmTable && elmTable.innerHTML.includes('Select a Category')) {
                showEmptyTable();
            }
        }
        
        // Update DataTable if it exists
        if (typeof refreshTable === 'function') {
            refreshTable();
        }
        
        // Save language preference
        if (typeof saveLanguagePreference === 'function') {
            saveLanguagePreference(langCode);
        }
        
        console.log(`Switched to ${langCode}`);
    }
}

// Save language preference to settings
function saveLanguagePreference(langCode) {
    if (typeof objUserSettings !== 'undefined') {
        objUserSettings.language = langCode;
        if (typeof saveSettings === 'function') {
            saveSettings();
        }
    }
}

// Initialize translations on page load
async function initializeI18n() {
    // Try to get language from settings, fallback to browser language, then English
    let preferredLang = 'en';
    
    if (typeof objUserSettings !== 'undefined' && objUserSettings.language) {
        preferredLang = objUserSettings.language;
    } else {
        // Detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'].includes(browserLang)) {
            preferredLang = browserLang;
        }
    }
    
    await switchLanguage(preferredLang);
}

// Export functions for global use
window.t = t;
window.switchLanguage = switchLanguage;
window.initializeI18n = initializeI18n;