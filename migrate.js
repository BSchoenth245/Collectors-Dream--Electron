const LOCAL_API = 'http://127.0.0.1:8000';
const CLOUD_API = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Check if user is logged in
if (!localStorage.getItem('authToken')) {
    window.location.href = 'auth.html';
}

document.getElementById('skipMigration').addEventListener('click', () => {
    Swal.fire({
        title: 'Skip Migration?',
        text: 'You can migrate your data later from the settings menu',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, skip',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = 'index.html';
        }
    });
});

document.getElementById('startMigration').addEventListener('click', async () => {
    const statusMessage = document.getElementById('statusMessage');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const startButton = document.getElementById('startMigration');
    const skipButton = document.getElementById('skipMigration');
    const migrationDetails = document.getElementById('migrationDetails');
    const itemCount = document.getElementById('itemCount');
    const categoryCount = document.getElementById('categoryCount');
    
    startButton.disabled = true;
    skipButton.disabled = true;
    progressContainer.style.display = 'block';
    migrationDetails.style.display = 'block';
    
    try {
        // Step 1: Check if local MongoDB is accessible
        statusMessage.textContent = 'Connecting to local database...';
        updateProgress(5);
        
        // Try to fetch local data (without auth - local server doesn't have it yet)
        let localData, localCategories, localSettings;
        
        try {
            const localDataResponse = await fetch(`${LOCAL_API}/api/collection`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!localDataResponse.ok) throw new Error('Cannot access local data');
            localData = await localDataResponse.json();
        } catch (error) {
            throw new Error('Cannot connect to local database. Make sure your local server is running.');
        }
        
        updateProgress(15);
        
        // Fetch categories and settings
        try {
            localCategories = await fetch(`${LOCAL_API}/api/categories`, {
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json());
            
            localSettings = await fetch(`${LOCAL_API}/api/settings`, {
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json());
        } catch (error) {
            console.warn('Could not fetch categories/settings:', error);
            localCategories = {};
            localSettings = { darkMode: false, theme: 'default', language: 'en' };
        }
        
        statusMessage.textContent = `Found ${localData.length} items, ${Object.keys(localCategories).length} categories`;
        updateProgress(25);
        
        if (localData.length === 0 && Object.keys(localCategories).length === 0) {
            Swal.fire({
                title: 'No Data Found',
                text: 'No local data to migrate. Starting with a fresh collection.',
                icon: 'info'
            }).then(() => {
                window.location.href = 'index.html';
            });
            return;
        }
        
        // Step 2: Upload categories first
        statusMessage.textContent = 'Uploading categories to cloud...';
        updateProgress(30);
        
        let uploadedCategories = 0;
        for (const [key, category] of Object.entries(localCategories)) {
            try {
                await fetch(`${CLOUD_API}/api/categories`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ key, category })
                });
                uploadedCategories++;
                categoryCount.textContent = uploadedCategories;
            } catch (error) {
                console.error('Error uploading category:', key, error);
            }
        }
        
        updateProgress(45);
        
        // Step 3: Upload collection items
        statusMessage.textContent = 'Uploading collection items to cloud...';
        
        let uploadedItems = 0;
        const totalItems = localData.length;
        
        for (let i = 0; i < totalItems; i++) {
            const item = localData[i];
            
            // Remove MongoDB internal fields
            const { _id, __v, userId, ...itemData } = item;
            
            try {
                await fetch(`${CLOUD_API}/api/collection`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(itemData)
                });
                
                uploadedItems++;
                itemCount.textContent = uploadedItems;
                
                // Update progress (45% to 85%)
                const itemProgress = 45 + ((i + 1) / totalItems * 40);
                updateProgress(itemProgress);
                statusMessage.textContent = `Uploading items (${uploadedItems}/${totalItems})...`;
                
            } catch (error) {
                console.error('Error uploading item:', error);
            }
        }
        
        // Step 4: Upload settings
        statusMessage.textContent = 'Uploading settings...';
        updateProgress(90);
        
        try {
            await fetch(`${CLOUD_API}/api/settings`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(localSettings)
            });
        } catch (error) {
            console.error('Error uploading settings:', error);
        }
        
        // Complete
        updateProgress(100);
        statusMessage.textContent = 'Migration complete!';
        
        await Swal.fire({
            title: 'Migration Successful!',
            html: `
                <p><strong>${uploadedItems}</strong> items migrated</p>
                <p><strong>${uploadedCategories}</strong> categories migrated</p>
                <p>Your data is now safely stored in the cloud!</p>
            `,
            icon: 'success',
            confirmButtonText: 'Go to My Collection'
        });
        
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Migration error:', error);
        
        progressBar.classList.remove('progress-bar-animated');
        progressBar.classList.add('bg-danger');
        statusMessage.textContent = 'Migration failed';
        
        Swal.fire({
            title: 'Migration Failed',
            text: error.message || 'There was an error migrating your data. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        
        startButton.disabled = false;
        skipButton.disabled = false;
    }
});

function updateProgress(percent) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
}

// Auto-detect if migration is needed
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user already has cloud data
        const response = await fetch(`${CLOUD_API}/api/collection`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const cloudData = await response.json();
            
            if (cloudData.length > 0) {
                // User already has cloud data
                const result = await Swal.fire({
                    title: 'Cloud Data Detected',
                    text: `You already have ${cloudData.length} items in your cloud collection. Do you still want to migrate local data?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, merge data',
                    cancelButtonText: 'No, go to app'
                });
                
                if (!result.isConfirmed) {
                    window.location.href = 'index.html';
                }
            }
        }
    } catch (error) {
        console.error('Error checking cloud data:', error);
    }
});