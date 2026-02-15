// === DATA DISPLAY FUNCTIONS ===
let objDataTable = null;

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }
});

// Fetch and display all collection data in DataTable
function fetchAndDisplayData() {
    console.log('Fetching data from API...');
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(API_URL + '/api/collection', {
        method: 'GET',
        headers: getAuthHeaders()  // Add this
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            // Token invalid, redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(arrData => {
        if (arrData) {
            console.log('Received data:', arrData);
            initializeDataTable(arrData);
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

// Initialize DataTable with data
function initializeDataTable(arrData) {
    console.log('Initializing DataTable with data:', arrData);
    // Wait for jQuery and DataTables to be available
    if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
        console.log('jQuery or DataTables not ready, waiting...');
        setTimeout(() => initializeDataTable(arrData), 100);
        return;
    }
    console.log('jQuery and DataTables are ready');
    
    // Destroy existing DataTable if it exists
    if (objDataTable) {
        objDataTable.destroy();
        $('#dataTable').empty();
    }
    
    // If no data, show empty table
    if (!arrData || arrData.length === 0) {
        console.log('No data found, showing empty table');
        $('#dataTable').html('<thead><tr><th>No Data</th></tr></thead><tbody><tr><td>No records found</td></tr></tbody>');
        return;
    }
    console.log('Processing', arrData.length, 'records for table');
    
    // Fields to exclude from table display
    const excludedFields = ['_id', '__v', 'userId', 'category', 'createdAt', 'updatedAt'];
    
    // Get all unique keys from data, excluding system fields
    const setAllKeys = new Set();
    arrData.forEach(objItem => {
        Object.keys(objItem).forEach(strKey => {
            if (!excludedFields.includes(strKey)) {
                setAllKeys.add(strKey);
            }
        });
    });
    const arrHeaders = [...setAllKeys];
    
    // Prepare columns configuration with better formatting
    const arrColumns = arrHeaders.map(strHeader => ({
        title: formatColumnName(strHeader), // Use formatting function
        data: strHeader,
        defaultContent: 'N/A',
        render: function(data, type, row) {
            if (typeof data === 'boolean') {
                return data ? 'Yes' : 'No';
            }
            return data || 'N/A';
        }
    }));
    
    // Add Actions column
    console.log('Adding Actions column to table');
    arrColumns.push({
        title: 'Actions',
        data: null,
        orderable: false,
        width: '100px',
        className: 'text-nowrap',
        render: function(data, type, row) {
            return `
                <button class="btn btn-sm btn-primary" onclick="viewRecord('${row._id}')">View</button>
            `;
        }
    });
    
    try {
        console.log('Attempting to initialize DataTable with columns:', arrColumns);
        
        // Ensure table element exists and is properly structured
        const elmTable = document.getElementById('dataTable');
        if (!elmTable) {
            throw new Error('Table element not found');
        }
        
        // Initialize DataTable
        objDataTable = $('#dataTable').DataTable({
            data: arrData,
            columns: arrColumns,
            responsive: true,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, t('all') || "All"]],
            order: [[0, 'asc']],
            language: {
                emptyTable: t('noData') || "No data available",
                zeroRecords: t('noRecords') || "No matching records found",
                search: t('search') || "Search:",
                lengthMenu: t('show') + " _MENU_ " + t('entries') || "Show _MENU_ entries",
                info: t('showing') + " _START_ " + t('to') + " _END_ " + t('of') + " _TOTAL_ " + t('entries') || "Showing _START_ to _END_ of _TOTAL_ entries",
                paginate: {
                    first: t('first') || "First",
                    last: t('last') || "Last",
                    next: t('next') || "Next",
                    previous: t('previous') || "Previous"
                }
            },
            destroy: true,
            autoWidth: false,
            scrollX: true  // Enable horizontal scrolling for long tables
        });
        console.log('DataTable initialized successfully');
    } catch (error) {
        console.error('Error initializing DataTable:', error);
        // Fallback to basic table
        console.log('Falling back to basic table');
        createBasicTable(arrData, arrHeaders);
    }
}

// Helper function to format column names properly
function formatColumnName(strFieldName) {
    // Convert snake_case or camelCase to Title Case
    return strFieldName
        .replace(/_/g, ' ')  // Replace underscores with spaces
        .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
        .split(' ')  // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())  // Capitalize each word
        .join(' ')  // Join back together
        .trim();  // Remove extra spaces
}

// Fallback function to create basic table if DataTables fails
function createBasicTable(arrData, arrHeaders) {
    const elmTable = document.getElementById('dataTable');
    elmTable.innerHTML = '';
    
    // Fields to exclude
    const excludedFields = ['_id', '__v', 'userId', 'category', 'createdAt', 'updatedAt'];
    
    // Filter headers to exclude system fields
    const arrDisplayHeaders = arrHeaders.filter(h => !excludedFields.includes(h));
    
    // Create header
    const elmThead = document.createElement('thead');
    const elmHeaderRow = document.createElement('tr');
    [...arrDisplayHeaders, 'Actions'].forEach(strHeader => {
        const elmTh = document.createElement('th');
        elmTh.textContent = formatColumnName(strHeader);
        elmHeaderRow.appendChild(elmTh);
    });
    elmThead.appendChild(elmHeaderRow);
    elmTable.appendChild(elmThead);
    
    // Create body
    const elmTbody = document.createElement('tbody');
    arrData.forEach(objItem => {
        const elmRow = document.createElement('tr');
        arrDisplayHeaders.forEach(strHeader => {
            const elmCell = document.createElement('td');
            const value = objItem[strHeader];
            if (typeof value === 'boolean') {
                elmCell.textContent = value ? 'Yes' : 'No';
            } else {
                elmCell.textContent = value || 'N/A';
            }
            elmRow.appendChild(elmCell);
        });
        // Actions cell
        const elmActionsCell = document.createElement('td');
        elmActionsCell.innerHTML = `
            <button class="btn btn-sm btn-primary" onclick="viewRecord('${objItem._id}')">View</button>
        `;
        elmRow.appendChild(elmActionsCell);
        elmTbody.appendChild(elmRow);
    });
    elmTable.appendChild(elmTbody);
}

// === DOM INITIALIZATION ===
// Ensure DOM is loaded and jQuery is available
$(document).ready(function() {
    // Show empty table message instead of loading all data
    showEmptyTable();
});

// Fallback for non-jQuery environments
document.addEventListener('DOMContentLoaded', () => {
    // Show empty table message instead of loading all data
    setTimeout(() => {
        if (typeof showEmptyTable === 'function') {
            showEmptyTable();
        }
    }, 500);
});

// Show empty table with instruction message
function showEmptyTable() {
    const elmTable = document.getElementById('dataTable');
    const headerText = t('selectCategory') || 'Select a Category';
    const messageText = t('selectCategoryToView') || 'Please select a category from the dropdown above to view records';
    elmTable.innerHTML = `<thead><tr><th>${headerText}</th></tr></thead><tbody><tr><td>${messageText}</td></tr></tbody>`;
}

// === TABLE MANAGEMENT ===
// Refresh table data
function refreshTable() {
    // Check if we're on the search tab and respect the current filter state
    const elmSearchTab = document.getElementById('search-tab');
    const elmCategorySelect = document.getElementById('searchCategorySelect');
    
    if (elmSearchTab && elmSearchTab.classList.contains('active')) {
        // We're on search tab - respect the category filter
        if (elmCategorySelect && elmCategorySelect.value) {
            filterByCategory();
        } else {
            showEmptyTable();
        }
    } else {
        // We're not on search tab - safe to load all data
        fetchAndDisplayData();
    }
}

// View specific record by ID
function viewRecord(strId) {
    console.log('Fetching record with ID:', strId);
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/collection/${strId}`, {
        headers: getAuthHeaders()  // ADD AUTH
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(objRecord => {
        if (objRecord) {
            showViewPanel(objRecord);
        }
    })
    .catch(error => {
        console.error('Error fetching record:', error);
        Swal.fire('Error!', 'Error loading record: ' + error.message, 'error');
    });
}

// === SLIDE PANEL FUNCTIONS ===
let currentRecord = null;
let isEditMode = false;

// Show view panel with record data
function showViewPanel(objRecord) {
    currentRecord = objRecord;
    isEditMode = false;
    
    const strCategory = objRecord.category;
    const objCategory = objCategories[strCategory];
    const strCategoryName = objCategory ? objCategory.name : 'Item';
    
    // Update panel title
    document.getElementById('slidePanelTitle').textContent = `View ${strCategoryName}`;
    
    // Populate content in view mode
    populatePanelContent(objRecord, false);
    
    // Show view mode buttons
    showViewModeButtons();
    
    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.panel-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'panel-overlay';
        overlay.onclick = closeSlidePanel;
        document.body.appendChild(overlay);
    }
    
    // Open panel and show overlay
    document.getElementById('slidePanel').classList.add('open');
    overlay.classList.add('active');
    document.body.classList.add('panel-open');
    
    // Add click outside handler
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);
}

// Populate panel content (view or edit mode)
function populatePanelContent(objRecord, boolEditMode) {
    const elmContent = document.getElementById('slidePanelContent');
    elmContent.innerHTML = '';
    
    // Get category info
    const strCategory = objRecord.category;
    const objCategory = objCategories[strCategory];
    
    // Create fields
    Object.keys(objRecord).forEach(strFieldName => {
        // Skip internal/system fields
        const excludedFields = ['_id', '__v', 'userId', 'category', 'createdAt', 'updatedAt'];
        if (excludedFields.includes(strFieldName)) {
            return; // Skip these fields
        }
        
        const currentValue = objRecord[strFieldName];
        const elmFieldDiv = document.createElement('div');
        
        // Get field definition
        let objFieldDef = null;
        if (objCategory && objCategory.fields) {
            objFieldDef = objCategory.fields.find(f => f.name === strFieldName);
        }
        
        const strFieldType = objFieldDef ? objFieldDef.type : (typeof currentValue === 'boolean' ? 'boolean' : typeof currentValue === 'number' ? 'number' : 'text');
        const strFieldLabel = objFieldDef ? objFieldDef.label : strFieldName.charAt(0).toUpperCase() + strFieldName.slice(1);
        
        if (boolEditMode) {
            // Edit mode - show form inputs
            elmFieldDiv.className = 'mb-3';
            
            if (strFieldType === 'boolean') {
                const boolChecked = currentValue ? 'checked' : '';
                elmFieldDiv.innerHTML = `
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" name="${strFieldName}" id="edit_${strFieldName}" ${boolChecked}>
                        <label class="form-check-label" for="edit_${strFieldName}">${strFieldLabel}</label>
                    </div>
                `;
            } else {
                const strInputType = strFieldType === 'number' ? 'text' : 'text';
                const strInputPattern = strFieldType === 'number' ? 'pattern="[0-9]*"' : '';
                const strValue = currentValue || '';
                elmFieldDiv.innerHTML = `
                    <label class="form-label">${strFieldLabel}:</label>
                    <input type="${strInputType}" ${strInputPattern} class="form-control" name="${strFieldName}" value="${strValue}" required>
                `;
            }
        } else {
            // View mode - show formatted display
            elmFieldDiv.className = 'field-display';
            
            let strDisplayValue;
            let strValueClass = 'field-value';
            
            if (currentValue === null || currentValue === undefined || currentValue === '') {
                strDisplayValue = 'Not set';
                strValueClass += ' empty';
            } else if (typeof currentValue === 'boolean') {
                strDisplayValue = currentValue ? 'Yes' : 'No';
                strValueClass += currentValue ? ' boolean-yes' : ' boolean-no';
            } else {
                strDisplayValue = currentValue.toString();
            }
            
            elmFieldDiv.innerHTML = `
                <div class="field-label">${strFieldLabel}</div>
                <div class="${strValueClass}">${strDisplayValue}</div>
            `;
        }
        
        elmContent.appendChild(elmFieldDiv);
    });
}

// Show view mode buttons
function showViewModeButtons() {
    const elmFooter = document.getElementById('slidePanelFooter');
    elmFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="editCurrentRecord(event)">Edit</button>
        <button class="btn btn-danger" onclick="deleteCurrentRecord(event)">Delete</button>
    `;
}

// Show edit mode buttons
function showEditModeButtons() {
    const elmFooter = document.getElementById('slidePanelFooter');
    elmFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="cancelEdit(event)">Cancel</button>
        <button class="btn btn-primary" onclick="saveCurrentRecord(event)">Save Changes</button>
    `;
}

// Switch to edit mode
function editCurrentRecord(event) {
    if (event) {
        event.stopPropagation();
    }
    if (!currentRecord) return;
    
    isEditMode = true;
    
    // Update title
    const strCategory = currentRecord.category;
    const objCategory = objCategories[strCategory];
    const strCategoryName = objCategory ? objCategory.name : 'Item';
    document.getElementById('slidePanelTitle').textContent = `Edit ${strCategoryName}`;
    
    // Switch to edit mode
    populatePanelContent(currentRecord, true);
    showEditModeButtons();
}

// Cancel edit and return to view mode
function cancelEdit(event) {
    if (event) {
        event.stopPropagation();
    }
    if (!currentRecord) return;
    
    isEditMode = false;
    
    // Update title
    const strCategory = currentRecord.category;
    const objCategory = objCategories[strCategory];
    const strCategoryName = objCategory ? objCategory.name : 'Item';
    document.getElementById('slidePanelTitle').textContent = `View ${strCategoryName}`;
    
    // Switch back to view mode
    populatePanelContent(currentRecord, false);
    showViewModeButtons();
}

// Save current record changes
function saveCurrentRecord(event) {
    if (event) {
        event.stopPropagation();
    }
    if (!currentRecord) return;
    
    const elmContent = document.getElementById('slidePanelContent');
    const elmInputs = elmContent.querySelectorAll('input');
    const objData = {};
    
    elmInputs.forEach(elmInput => {
        if (elmInput.type === 'hidden') return;
        
        let value;
        if (elmInput.type === 'checkbox') {
            value = elmInput.checked;
        } else if (elmInput.type === 'number' || elmInput.pattern === '[0-9]*') {
            value = Number(elmInput.value);
        } else {
            value = elmInput.value;
        }
        objData[elmInput.name] = value;
    });
    
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    // Send update request WITH AUTH
    fetch(`${API_URL}/api/collection/${currentRecord._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),  // ADD AUTH
        body: JSON.stringify(objData)
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(objUpdatedRecord => {
        if (objUpdatedRecord) {
            // Update current record
            currentRecord = { ...currentRecord, ...objData };
            
            // Switch back to view mode
            cancelEdit();
            
            // Refresh table
            filterByCategory();
            
            Swal.fire('Success!', 'Record updated successfully', 'success');
        }
    })
    .catch(error => {
        console.error('Error updating record:', error);
        Swal.fire('Error!', 'Error updating record: ' + error.message, 'error');
    });
}

// Delete current record
function deleteCurrentRecord(event) {
    if (event) {
        event.stopPropagation();
    }
    if (!currentRecord || !currentRecord._id) {
        console.error('No current record or missing ID:', currentRecord);
        Swal.fire('Error!', 'Cannot delete record - missing record ID', 'error');
        return;
    }
    
    console.log('Deleting record with ID:', currentRecord._id);
    
    Swal.fire({
        title: 'Delete Record?',
        text: 'This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            const recordId = currentRecord._id;
            console.log('Confirmed deletion of record:', recordId);
            
            const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
            
            fetch(`${API_URL}/api/collection/${recordId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()  // ADD AUTH
            })
            .then(response => {
                console.log('Delete response status:', response.status);
                if (response.status === 401 || response.status === 403) {
                    window.location.href = 'auth.html';
                    return;
                }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then((result) => {
                if (result) {
                    console.log('Delete successful:', result);
                    closeSlidePanel();
                    // Refresh the current filtered view
                    const elmCategorySelect = document.getElementById('searchCategorySelect');
                    if (elmCategorySelect && elmCategorySelect.value) {
                        filterByCategory();
                    } else {
                        showEmptyTable();
                    }
                    Swal.fire('Deleted!', 'Record has been deleted.', 'success');
                }
            })
            .catch(error => {
                console.error('Error deleting record:', error);
                Swal.fire('Error!', 'Error deleting record: ' + error.message, 'error');
            });
        }
    });
}

// Handle click outside panel
function handleClickOutside(event) {
    const elmPanel = document.getElementById('slidePanel');
    // Don't close if clicking inside the panel or on panel buttons
    if (elmPanel && !elmPanel.contains(event.target)) {
        closeSlidePanel();
    }
}

// Close slide panel
function closeSlidePanel() {
    document.getElementById('slidePanel').classList.remove('open');
    
    const overlay = document.querySelector('.panel-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    document.body.classList.remove('panel-open');
    document.removeEventListener('click', handleClickOutside);
    currentRecord = null;
    isEditMode = false;
}

// Legacy function for compatibility
function showEditModal(objRecord) {
    // Redirect to new slide panel system
    showViewPanel(objRecord);
}

// Legacy functions - now handled by slide panel
function updateRecord() {
    // Redirect to slide panel system
    console.log('updateRecord called - now handled by slide panel');
}

function deleteRecord(strId) {
    // Redirect to slide panel system
    console.log('deleteRecord called - now handled by slide panel');
}

// === CATEGORY MANAGEMENT ===
let objCategories = {};

// Load categories from server on page load
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/categories`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = 'auth.html';
            return;
        }
        return response.json();
    })
    .then(objData => {
        if (objData) {
            console.log('Loaded categories:', objData);
            objCategories = objData || {}; // Default to empty object
            populateCategoryDropdowns();
        }
    })
    .catch(error => {
        console.error('Error loading categories:', error);
        objCategories = {}; // Initialize as empty object on error
        populateCategoryDropdowns();
    });
});

// Populate dropdown menus with available categories
function populateCategoryDropdowns() {
    const elmCategorySelect = document.getElementById('categorySelect');
    const elmSearchSelect = document.getElementById('searchCategorySelect');
    const elmEditSelect = document.getElementById('editCategorySelect');
    const elmDeleteSelect = document.getElementById('deleteCategorySelect');
    
    // Clear existing options except first
    const chooseText = t('chooseCategory') || 'Choose a category...';
    elmCategorySelect.innerHTML = `<option value="">${chooseText}</option>`;
    elmSearchSelect.innerHTML = `<option value="">${chooseText}</option>`;
    elmEditSelect.innerHTML = `<option value="">${chooseText}</option>`;
    elmDeleteSelect.innerHTML = `<option value="">${chooseText}</option>`;
    
    // Add categories from JSON
    Object.keys(objCategories).forEach(strKey => {
        const objCategory = objCategories[strKey];
        
        // Safety check: skip if category is invalid
        if (!objCategory || !objCategory.name) {
            console.warn(`Invalid category ${strKey}:`, objCategory);
            return;
        }
        
        const elmOption1 = document.createElement('option');
        elmOption1.value = strKey;
        elmOption1.textContent = objCategory.name;
        elmCategorySelect.appendChild(elmOption1);
        
        const elmOption2 = document.createElement('option');
        elmOption2.value = strKey;
        elmOption2.textContent = objCategory.name;
        elmSearchSelect.appendChild(elmOption2);
        
        const elmOption3 = document.createElement('option');
        elmOption3.value = strKey;
        elmOption3.textContent = objCategory.name;
        elmEditSelect.appendChild(elmOption3);
        
        const elmOption4 = document.createElement('option');
        elmOption4.value = strKey;
        elmOption4.textContent = objCategory.name;
        elmDeleteSelect.appendChild(elmOption4);
    });
    
    // Update categories display
    renderCategoriesGrid();
}

// Render categories as cards
function renderCategoriesGrid() {
    const elmButtonContainer = document.getElementById('newCategoryButtonContainer');
    const elmGrid = document.getElementById('categoriesGrid');
    const arrCategoryKeys = Object.keys(objCategories);
    
    if (arrCategoryKeys.length === 0) {
        // No categories - show large centered button
        elmButtonContainer.className = 'new-category-button-container empty';
        elmGrid.innerHTML = '';
    } else {
        // Has categories - show small button and cards
        elmButtonContainer.className = 'new-category-button-container has-categories';
        
        // Create category cards
        elmGrid.innerHTML = '';
        arrCategoryKeys.forEach(strKey => {
            const objCategory = objCategories[strKey];
            
            // Safety check: ensure objCategory exists and has fields array
            if (!objCategory || !objCategory.fields) {
                console.warn(`Category ${strKey} is missing or has no fields:`, objCategory);
                return; // Skip this category
            }
            
            const elmCard = document.createElement('div');
            elmCard.className = 'category-card';
            elmCard.innerHTML = `
                <h5>${objCategory.name || 'Unnamed Category'}</h5>
                <p class="text-muted">${objCategory.fields.length} fields</p>
                <div class="category-card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editCategory('${strKey}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDeleteCategory('${strKey}')">Delete</button>
                </div>
            `;
            elmGrid.appendChild(elmCard);
        });
    }
}

// Load form fields based on selected category
function loadCategoryForm() {
    const elmCategorySelect = document.getElementById('categorySelect');
    const elmDataForm = document.getElementById('dataForm');
    const elmFormFields = document.getElementById('formFields');
    
    const strSelectedCategory = elmCategorySelect.value;
    
    if (!strSelectedCategory) {
        elmDataForm.style.display = 'none';
        return;
    }
    
    const objCategory = objCategories[strSelectedCategory];
    elmFormFields.innerHTML = '';
    
    objCategory.fields.forEach(objField => {
        const elmFieldDiv = document.createElement('div');
        elmFieldDiv.className = 'mb-3';
        
        if (objField.type === 'boolean') {
            elmFieldDiv.innerHTML = `
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" name="${objField.name}" id="${objField.name}">
                    <label class="form-check-label" for="${objField.name}">${objField.label}</label>
                </div>
            `;
        } else {
            const strInputType = objField.type === 'number' ? 'text' : objField.type;
            const strInputPattern = objField.type === 'number' ? 'pattern="[0-9]*"' : '';
            elmFieldDiv.innerHTML = `
                <label class="form-label">${objField.label}:</label>
                <input type="${strInputType}" ${strInputPattern} class="form-control" name="${objField.name}" required>
            `;
        }
        elmFormFields.appendChild(elmFieldDiv);
    });
    
    elmDataForm.style.display = 'block';
}

// Submit new item data to database
function submitCategoryData() {
    const elmCategorySelect = document.getElementById('categorySelect');
    const elmFormFields = document.getElementById('formFields');
    const elmInputs = elmFormFields.querySelectorAll('input');
    const objData = {
        category: elmCategorySelect.value // Add category identifier
    };
    
    elmInputs.forEach(elmInput => {
        let value;
        if (elmInput.type === 'checkbox') {
            value = elmInput.checked;
        } else if (elmInput.type === 'number' || elmInput.pattern === '[0-9]*') {
            value = Number(elmInput.value);
        } else {
            value = elmInput.value;
        }
        objData[elmInput.name] = value;
    });
    
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/collection`, {
        method: 'POST',
        headers: getAuthHeaders(),  // ADD AUTH
        body: JSON.stringify(objData)
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Failed to save data');
        }
        return response.json();
    })
    .then(objResult => {
        if (objResult) {
            Swal.fire('Success!', 'Data saved successfully!', 'success');
            elmInputs.forEach(elmInput => {
                if (elmInput.type === 'checkbox') {
                    elmInput.checked = false;
                } else {
                    elmInput.value = '';
                }
            });
        }
    })
    .catch(error => {
        console.error('Error saving data:', error);
        Swal.fire('Error!', 'Error saving data: ' + error.message, 'error');
    });
}

// === CATEGORY MANAGEMENT ===
let intNewFieldCount = 0;

// Show form to create new category
function showAddCategoryForm() {
    document.getElementById('addCategoryForm').style.display = 'block';
    document.getElementById('editCategoryForm').style.display = 'none';
    document.getElementById('deleteCategoryForm').style.display = 'none';
}

// Show form to edit existing category
function showEditCategoryForm() {
    document.getElementById('editCategoryForm').style.display = 'block';
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('deleteCategoryForm').style.display = 'none';
}

// Show form to delete category
function showDeleteCategoryForm() {
    document.getElementById('deleteCategoryForm').style.display = 'block';
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('editCategoryForm').style.display = 'none';
}

// Cancel category creation and reset form
function cancelAddCategory() {
    document.getElementById('addCategoryForm').style.display = 'none';
    document.getElementById('newCategoryName').value = '';
    document.getElementById('newCategoryFields').innerHTML = '';
    newFieldCount = 0;
}

// Cancel category editing and reset form
function cancelEditCategory() {
    document.getElementById('editCategoryForm').style.display = 'none';
    document.getElementById('editCategoryContent').style.display = 'none';
    document.getElementById('editCategorySelect').value = '';
    document.getElementById('editCategoryName').value = '';
    document.getElementById('editCategoryFields').innerHTML = '';
}

// Cancel category deletion and reset form
function cancelDeleteCategory() {
    document.getElementById('deleteCategoryForm').style.display = 'none';
    document.getElementById('deleteCategorySelect').value = '';
}

// Delete selected category
// Delete selected category
function deleteCategory() {
    const elmDeleteSelect = document.getElementById('deleteCategorySelect');
    const strCategoryKey = elmDeleteSelect.value;
    
    if (!strCategoryKey) {
        Swal.fire('Warning!', 'Please select a category to delete', 'warning');
        return;
    }
    
    const strCategoryName = objCategories[strCategoryKey].name;
    
    Swal.fire({
        title: 'Are you sure?',
        text: `Delete category "${strCategoryName}"? This cannot be undone!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((objResult) => {
        if (objResult.isConfirmed) {
            // Get API URL
            const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
            
            fetch(`${API_URL}/api/categories/${strCategoryKey}`, {
                method: 'DELETE',
                headers: getAuthHeaders()  // Use auth headers
            })
            .then(response => {
                if (response.status === 401 || response.status === 403) {
                    Swal.fire('Error!', 'Your session has expired. Please log in again.', 'error');
                    window.location.href = 'auth.html';
                    return;
                }
                if (!response.ok) {
                    throw new Error('Failed to delete category');
                }
                return response.json();
            })
            .then(objResult => {
                if (objResult) {
                    delete objCategories[strCategoryKey];
                    populateCategoryDropdowns();
                    cancelDeleteCategory();
                    Swal.fire('Deleted!', 'Category has been deleted.', 'success');
                }
            })
            .catch(error => {
                console.error('Error deleting category:', error);
                Swal.fire('Error!', 'Error deleting category: ' + error.message, 'error');
            });
        }
    });
}

// Edit category from card
function editCategory(strCategoryKey) {
    const elmEditSelect = document.getElementById('editCategorySelect');
    elmEditSelect.value = strCategoryKey;
    loadEditCategoryForm();
    showEditCategoryForm();
}

// Confirm delete category from card
function confirmDeleteCategory(strCategoryKey) {
    const strCategoryName = objCategories[strCategoryKey].name;
    
    Swal.fire({
        title: 'Delete Category?',
        text: `Delete category "${strCategoryName}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete category',
        cancelButtonText: 'Cancel'
    }).then((objResult) => {
        if (objResult.isConfirmed) {
            // Ask about associated items
            Swal.fire({
                title: 'Delete Associated Items?',
                text: 'Do you also want to delete all items that belong to this category?',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonColor: '#ef4444',
                denyButtonColor: '#7c3aed',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Delete items too',
                denyButtonText: 'Keep items',
                cancelButtonText: 'Cancel'
            }).then((itemResult) => {
                if (itemResult.isConfirmed || itemResult.isDenied) {
                    const boolDeleteItems = itemResult.isConfirmed;
                    deleteCategoryAndItems(strCategoryKey, boolDeleteItems);
                }
            });
        }
    });
}

// Delete category and optionally its items
function deleteCategoryAndItems(strCategoryKey, boolDeleteItems) {
    const objCategory = objCategories[strCategoryKey];
    const strCategoryName = objCategory.name;
    const arrCategoryFields = objCategory.fields ? objCategory.fields.map(objF => objF.name) : [];
    
    // Delete category
    fetch(`http://127.0.0.1:8000/api/categories/${strCategoryKey}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(objResult => {
        delete objCategories[strCategoryKey];
        
        if (boolDeleteItems) {
            // Delete associated items
            
            fetch('http://127.0.0.1:8000/api/collection')
            .then(response => response.json())
            .then(arrData => {
                const arrItemsToDelete = arrData.filter(objItem => {
                    const arrMatchingFields = arrCategoryFields.filter(strField => objItem.hasOwnProperty(strField));
                    return arrMatchingFields.length >= Math.ceil(arrCategoryFields.length * 0.6);
                });
                
                const arrDeletePromises = arrItemsToDelete.map(objItem => 
                    fetch(`http://127.0.0.1:8000/api/collection/${objItem._id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    })
                );
                
                Promise.all(arrDeletePromises)
                .then(() => {
                    populateCategoryDropdowns();
                    refreshTable();
                    Swal.fire('Deleted!', `Category "${strCategoryName}" and ${arrItemsToDelete.length} associated items have been deleted.`, 'success');
                })
                .catch(error => {
                    Swal.fire('Warning!', 'Category deleted but some items could not be deleted: ' + error.message, 'warning');
                });
            })
            .catch(error => {
                populateCategoryDropdowns();
                Swal.fire('Warning!', 'Category deleted but could not check for associated items: ' + error.message, 'warning');
            });
        } else {
            populateCategoryDropdowns();
            Swal.fire('Deleted!', `Category "${strCategoryName}" has been deleted. Associated items were kept.`, 'success');
        }
    })
    .catch(error => {
        Swal.fire('Error!', 'Error deleting category: ' + error.message, 'error');
    });
}

// Add new field to category creation form
function addNewField() {
    const elmFieldsContainer = document.getElementById('newCategoryFields');
    const elmFieldDiv = document.createElement('div');
    elmFieldDiv.className = 'mb-2 d-flex gap-2';
    elmFieldDiv.innerHTML = `
        <input type="text" placeholder="Field Name" class="form-control">
        <select class="form-select">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (Yes/No)</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    elmFieldsContainer.appendChild(elmFieldDiv);
    intNewFieldCount++;
}

// Load category data for editing
function loadEditCategoryForm() {
    const elmEditSelect = document.getElementById('editCategorySelect');
    const elmEditContent = document.getElementById('editCategoryContent');
    const elmEditNameInput = document.getElementById('editCategoryName');
    const elmEditFieldsContainer = document.getElementById('editCategoryFields');
    
    const strSelectedKey = elmEditSelect.value;
    
    if (!strSelectedKey) {
        elmEditContent.style.display = 'none';
        return;
    }
    
    const objCategory = objCategories[strSelectedKey];
    elmEditNameInput.value = objCategory.name;
    elmEditFieldsContainer.innerHTML = '';
    
    // Populate existing fields
    objCategory.fields.forEach(objField => {
        const elmFieldDiv = document.createElement('div');
        elmFieldDiv.className = 'mb-2 d-flex gap-2';
        elmFieldDiv.innerHTML = `
            <input type="text" value="${objField.label}" class="form-control">
            <select class="form-select">
                <option value="text" ${objField.type === 'text' ? 'selected' : ''}>Text</option>
                <option value="number" ${objField.type === 'number' ? 'selected' : ''}>Number</option>
                <option value="boolean" ${objField.type === 'boolean' ? 'selected' : ''}>Boolean (Yes/No)</option>
            </select>
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">Remove</button>
        `;
        elmEditFieldsContainer.appendChild(elmFieldDiv);
    });
    
    elmEditContent.style.display = 'block';
}

// Add new field to edit form
function addEditField() {
    const elmFieldsContainer = document.getElementById('editCategoryFields');
    const elmFieldDiv = document.createElement('div');
    elmFieldDiv.className = 'mb-2 d-flex gap-2';
    elmFieldDiv.innerHTML = `
        <input type="text" placeholder="Field Name" class="form-control">
        <select class="form-select">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean (Yes/No)</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    elmFieldsContainer.appendChild(elmFieldDiv);
}

// Save edited category
function saveEditCategory() {
    const elmEditSelect = document.getElementById('editCategorySelect');
    const strCategoryName = document.getElementById('editCategoryName').value;
    const elmFieldsContainer = document.getElementById('editCategoryFields');
    const elmFieldDivs = Array.from(elmFieldsContainer.children); // Convert to array
    
    if (!strCategoryName) {
        Swal.fire('Warning!', 'Please enter a category name', 'warning');
        return;
    }
    
    const arrFields = [];
    elmFieldDivs.forEach(elmDiv => {  // Use forEach instead
        const elmNameInput = elmDiv.querySelector('input[type="text"]');
        const elmTypeSelect = elmDiv.querySelector('select');
        if (elmNameInput && elmNameInput.value) {
            arrFields.push({
                name: elmNameInput.value.toLowerCase().replace(/\s+/g, '_'),
                label: elmNameInput.value,
                type: elmTypeSelect.value
            });
        }
    });
    
    if (arrFields.length === 0) {
        Swal.fire('Warning!', 'Please add at least one field', 'warning');
        return;
    }
    
    const strCategoryKey = elmEditSelect.value;
    const objUpdatedCategory = {
        name: strCategoryName,
        fields: arrFields
    };
    
    // Ask user about migrating existing items
    Swal.fire({
        title: 'Update Existing Items?',
        text: 'Do you want to update existing items to match the new category structure?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, update items',
        cancelButtonText: 'No, keep items as-is'
    }).then((result) => {
        const boolMigrate = result.isConfirmed;
        
        // Get API URL
        const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
        
        // Save to server with authentication
        fetch(`${API_URL}/api/categories`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ key: strCategoryKey, category: objUpdatedCategory, migrate: boolMigrate })
        })
        .then(response => {
            if (response.status === 401 || response.status === 403) {
                Swal.fire('Error!', 'Your session has expired. Please log in again.', 'error');
                window.location.href = 'auth.html';
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to save category');
            }
            return response.json();
        })
        .then(objResult => {
            if (objResult) {
                objCategories[strCategoryKey] = objUpdatedCategory;
                populateCategoryDropdowns();
                cancelEditCategory();
                const strMessage = boolMigrate ? 'Category and existing items updated!' : 'Category updated!';
                Swal.fire('Success!', strMessage, 'success');
            }
        })
        .catch(error => {
            console.error('Error updating category:', error);
            Swal.fire('Error!', 'Error updating category: ' + error.message, 'error');
        });
    });
}

// Save new category to server
function saveNewCategory() {
    const strCategoryName = document.getElementById('newCategoryName').value;
    const elmFieldsContainer = document.getElementById('newCategoryFields');
    const elmFieldDivs = Array.from(elmFieldsContainer.children); // Convert to array
    
    if (!strCategoryName) {
        Swal.fire('Warning!', 'Please enter a category name', 'warning');
        return;
    }
    
    const arrFields = [];
    elmFieldDivs.forEach(elmDiv => {  // Use forEach instead
        const elmNameInput = elmDiv.querySelector('input[type="text"]');
        const elmTypeSelect = elmDiv.querySelector('select');
        if (elmNameInput && elmNameInput.value) {
            arrFields.push({
                name: elmNameInput.value.toLowerCase().replace(/\s+/g, '_'),
                label: elmNameInput.value,
                type: elmTypeSelect.value
            });
        }
    });
    
    if (arrFields.length === 0) {
        Swal.fire('Warning!', 'Please add at least one field', 'warning');
        return;
    }
    
    const strCategoryKey = strCategoryName.toLowerCase().replace(/\s+/g, '_');
    const objNewCategory = {
        name: strCategoryName,
        fields: arrFields
    };
    
    // Get API URL and auth headers
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    // Save to server with authentication
    fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ key: strCategoryKey, category: objNewCategory })
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            Swal.fire('Error!', 'Your session has expired. Please log in again.', 'error');
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Failed to save category');
        }
        return response.json();
    })
    .then(objResult => {
        if (objResult) {
            objCategories[strCategoryKey] = objNewCategory;
            populateCategoryDropdowns();
            
            // Clear form fields but keep form open
            document.getElementById('newCategoryName').value = '';
            document.getElementById('newCategoryFields').innerHTML = '';
            Swal.fire('Success!', 'Category saved successfully!', 'success');
        }
    })
    .catch(error => {
        console.error('Error saving category:', error);
        Swal.fire('Error!', 'Error saving category: ' + error.message, 'error');
    });
}

// === SEARCH & FILTER ===
// Filter table data by selected category
function filterByCategory() {
    const elmCategorySelect = document.getElementById('searchCategorySelect');
    const strSelectedCategory = elmCategorySelect.value;
    
    if (!strSelectedCategory) {
        // Show empty table if no category selected
        showEmptyTable();
        return;
    }
    
    // Get API URL
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    // Fetch and filter data by category WITH AUTH
    fetch(`${API_URL}/api/collection`, {
        headers: getAuthHeaders()  // ADD THIS
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'auth.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        return response.json();
    })
    .then(arrData => {
        if (!arrData) return;  // Handle undefined response
        
        // Filter data by exact category match
        const arrFilteredData = arrData.filter(objItem => {
            return objItem.category === strSelectedCategory;
        });
        
        displayFilteredData(arrFilteredData);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
        Swal.fire('Error!', 'Error loading data: ' + error.message, 'error');
    });
}

// Display filtered data in DataTable
function displayFilteredData(arrData) {
    initializeDataTable(arrData);
}

// === SETTINGS MANAGEMENT ===
let objUserSettings = { darkMode: false, theme: 'default', language: 'en' };

// Load settings from server
function loadSettings() {
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/settings`, {
        headers: getAuthHeaders()  // ADD AUTH
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            // Don't redirect on settings failure, just use defaults
            return null;
        }
        return response.json();
    })
    .then(objSettings => {
        if (objSettings) {
            objUserSettings = objSettings;
        }
        applySettings();
    })
    .catch(error => {
        console.error('Error loading settings:', error);
        applySettings();
    });
}

// Apply settings to UI
function applySettings() {
    const elmToggle = document.getElementById('darkModeToggle');
    const elmThemeSelect = document.getElementById('themeSelect');
    const elmLanguageSelect = document.getElementById('languageSelect');
    
    // Apply theme - ensure valid theme value
    const arrValidThemes = ['default', 'teal-gold', 'rose-navy', 'forest-amber', 'ocean-blue', 'sunset-orange', 'midnight-silver'];
    const strTheme = arrValidThemes.includes(objUserSettings.theme) ? objUserSettings.theme : 'default';
    
    document.body.className = '';
    document.body.classList.add(`theme-${strTheme}`);
    
    // Set theme dropdown
    if (elmThemeSelect) {
        elmThemeSelect.value = strTheme;
    }
    
    // Apply dark mode
    if (objUserSettings.darkMode) {
        document.body.classList.add('dark-mode');
        if (elmToggle) elmToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (elmToggle) elmToggle.checked = false;
    }
    
    // Set language selector
    if (elmLanguageSelect && objUserSettings.language) {
        elmLanguageSelect.value = objUserSettings.language;
    }
}

// Save settings to server
function saveSettings() {
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: getAuthHeaders(),  // ADD AUTH
        body: JSON.stringify(objUserSettings)
    })
    .catch(error => {
        console.error('Error saving settings:', error);
    });
}

// Change theme
function changeTheme() {
    const elmThemeSelect = document.getElementById('themeSelect');
    if (elmThemeSelect) {
        objUserSettings.theme = elmThemeSelect.value;
        applySettings();
        saveSettings();
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const elmToggle = document.getElementById('darkModeToggle');
    objUserSettings.darkMode = elmToggle.checked;
    
    applySettings();
    saveSettings();
}

// Export data
function exportData() {
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';
    
    fetch(`${API_URL}/api/collection`, {
        headers: getAuthHeaders()  // ADD AUTH
    })
    .then(response => {
        if (response.status === 401 || response.status === 403) {
            window.location.href = 'auth.html';
            return;
        }
        return response.json();
    })
    .then(arrData => {
        if (!arrData) return;
        
        const objExport = {
            categories: objCategories,
            items: arrData,
            settings: objUserSettings,
            exportDate: new Date().toISOString()
        };
        
        const strData = JSON.stringify(objExport, null, 2);
        const elmBlob = new Blob([strData], { type: 'application/json' });
        const strUrl = URL.createObjectURL(elmBlob);
        
        const elmLink = document.createElement('a');
        elmLink.href = strUrl;
        elmLink.download = `collectors-dream-export-${new Date().toISOString().split('T')[0]}.json`;
        elmLink.click();
        
        URL.revokeObjectURL(strUrl);
        Swal.fire('Success!', 'Data exported successfully!', 'success');
    })
    .catch(error => {
        console.error('Error exporting data:', error);
        Swal.fire('Error!', 'Error exporting data: ' + error.message, 'error');
    });
}

// Change language function
function changeLanguage() {
    const elmLanguageSelect = document.getElementById('languageSelect');
    const selectedLanguage = elmLanguageSelect.value;
    
    // Update settings
    objUserSettings.language = selectedLanguage;
    saveSettings();
    
    // Switch language
    if (typeof switchLanguage === 'function') {
        switchLanguage(selectedLanguage);
    }
}

// Load settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    // Initialize translations after settings are loaded
    setTimeout(() => {
        if (typeof initializeI18n === 'function') {
            initializeI18n();
        }
    }, 100);
});