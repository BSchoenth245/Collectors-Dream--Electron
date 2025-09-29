// === DATA DISPLAY FUNCTIONS ===
let objDataTable = null;

// Fetch and display all collection data in DataTable
function fetchAndDisplayData() {
    console.log('Fetching data from API...');
    fetch('http://127.0.0.1:8000/api/collection', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        console.log('API Response status:', response.status);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(arrData => {
        console.log('Received data:', arrData);
        console.log('Data length:', arrData.length);
        initializeDataTable(arrData);
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
    
    // Get all unique keys from data
    const setAllKeys = new Set();
    arrData.forEach(objItem => {
        Object.keys(objItem).forEach(strKey => {
            if (strKey !== '_id' && strKey !== '__v') {
                setAllKeys.add(strKey);
            }
        });
    });
    const arrHeaders = [...setAllKeys];
    
    // Prepare columns configuration
    const arrColumns = arrHeaders.map(strHeader => ({
        title: strHeader.charAt(0).toUpperCase() + strHeader.slice(1),
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
        width: '140px',
        className: 'text-nowrap',
        render: function(data, type, row) {
            console.log('Rendering actions for row:', row._id);
            return `
                <button class="btn btn-sm btn-primary me-1" onclick="editRecord('${row._id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRecord('${row._id}')">Delete</button>
            `;
        }
    });
    
    try {
        console.log('Attempting to initialize DataTable with columns:', arrColumns);
        // Initialize DataTable
        objDataTable = $('#dataTable').DataTable({
            data: arrData,
            columns: arrColumns,
            responsive: true,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            order: [[0, 'asc']],
            language: {
                emptyTable: "No data available",
                zeroRecords: "No matching records found"
            },
            destroy: true
        });
        console.log('DataTable initialized successfully');
    } catch (error) {
        console.error('Error initializing DataTable:', error);
        // Fallback to basic table
        console.log('Falling back to basic table');
        createBasicTable(arrData, arrHeaders);
    }
}

// Fallback function to create basic table if DataTables fails
function createBasicTable(arrData, arrHeaders) {
    const elmTable = document.getElementById('dataTable');
    elmTable.innerHTML = '';
    
    // Create header
    const elmThead = document.createElement('thead');
    const elmHeaderRow = document.createElement('tr');
    [...arrHeaders, 'Actions'].forEach(strHeader => {
        const elmTh = document.createElement('th');
        elmTh.textContent = strHeader.charAt(0).toUpperCase() + strHeader.slice(1);
        elmHeaderRow.appendChild(elmTh);
    });
    elmThead.appendChild(elmHeaderRow);
    elmTable.appendChild(elmThead);
    
    // Create body
    const elmTbody = document.createElement('tbody');
    arrData.forEach(objItem => {
        const elmRow = document.createElement('tr');
        arrHeaders.forEach(strHeader => {
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
            <button class="btn btn-sm btn-primary me-1" onclick="editRecord('${objItem._id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteRecord('${objItem._id}')">Delete</button>
        `;
        elmRow.appendChild(elmActionsCell);
        elmTbody.appendChild(elmRow);
    });
    elmTable.appendChild(elmTbody);
}

// === DOM INITIALIZATION ===
// Ensure DOM is loaded and jQuery is available
$(document).ready(function() {
    // Initialize DataTable when page loads
    fetchAndDisplayData();
});

// Fallback for non-jQuery environments
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for scripts to load, then initialize
    setTimeout(() => {
        if (typeof fetchAndDisplayData === 'function') {
            fetchAndDisplayData();
        }
    }, 500);
});

// === TABLE MANAGEMENT ===
// Refresh table data
function refreshTable() {
    fetchAndDisplayData();
}

// Edit specific record by ID
function editRecord(strId) {
    console.log('Fetching record with ID:', strId);
    // Fetch the record data
    fetch(`http://127.0.0.1:8000/api/collection/${strId}`)
    .then(response => {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
    })
    .then(text => {
        console.log('Response text:', text);
        try {
            const objRecord = JSON.parse(text);
            showEditModal(objRecord);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid JSON response: ' + text.substring(0, 100));
        }
    })
    .catch(error => {
        console.error('Error fetching record:', error);
        Swal.fire('Error!', 'Error loading record: ' + error.message, 'error');
    });
}

// Show edit modal with record data
function showEditModal(objRecord) {
    const strCategory = objRecord.category;
    const objCategory = objCategories[strCategory];
    const strCategoryName = objCategory ? objCategory.name : 'Item';
    
    // Create modal HTML
    const strModalHtml = `
        <div class="modal fade" id="editModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit ${strCategoryName}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <input type="hidden" id="editRecordId" value="${objRecord._id}">
                            <div id="editFormFields"></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="updateRecord()">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const elmExistingModal = document.getElementById('editModal');
    if (elmExistingModal) {
        // Properly dispose of Bootstrap modal instance
        const existingModalInstance = bootstrap.Modal.getInstance(elmExistingModal);
        if (existingModalInstance) {
            existingModalInstance.dispose();
        }
        elmExistingModal.remove();
    }
    
    // Also remove any backdrop that might be left behind
    const elmBackdrop = document.querySelector('.modal-backdrop');
    if (elmBackdrop) {
        elmBackdrop.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', strModalHtml);
    
    // Populate form fields - show ALL fields from the record
    const elmFormFields = document.getElementById('editFormFields');
    
    // Get all fields from the record (excluding MongoDB internal fields)
    Object.keys(objRecord).forEach(strFieldName => {
        if (strFieldName === '_id' || strFieldName === '__v' || strFieldName === 'category') {
            return; // Skip internal fields
        }
        
        const currentValue = objRecord[strFieldName];
        const elmFieldDiv = document.createElement('div');
        elmFieldDiv.className = 'mb-3';
        
        // Try to get field definition from category, fallback to auto-detect type
        let objFieldDef = null;
        if (objCategory && objCategory.fields) {
            objFieldDef = objCategory.fields.find(f => f.name === strFieldName);
        }
        
        const strFieldType = objFieldDef ? objFieldDef.type : (typeof currentValue === 'boolean' ? 'boolean' : typeof currentValue === 'number' ? 'number' : 'text');
        const strFieldLabel = objFieldDef ? objFieldDef.label : strFieldName.charAt(0).toUpperCase() + strFieldName.slice(1);
        
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
        elmFormFields.appendChild(elmFieldDiv);
    });
    
    // Show modal with proper cleanup handling
    const elmModalElement = document.getElementById('editModal');
    const elmModal = new bootstrap.Modal(elmModalElement);
    
    // Add cleanup when modal is closed via cancel/X button
    elmModalElement.addEventListener('hidden.bs.modal', function() {
        elmModal.dispose();
        elmModalElement.remove();
        // Remove any leftover backdrop
        const elmBackdrop = document.querySelector('.modal-backdrop');
        if (elmBackdrop) {
            elmBackdrop.remove();
        }
    }, { once: true });
    
    elmModal.show();
}

// Update record with new data
function updateRecord() {
    const strRecordId = document.getElementById('editRecordId').value;
    const elmFormFields = document.getElementById('editFormFields');
    const elmInputs = elmFormFields.querySelectorAll('input');
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
    
    // Send update request
    fetch(`http://127.0.0.1:8000/api/collection/${strRecordId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(() => {
        // Close and cleanup modal
        const elmModalElement = document.getElementById('editModal');
        const elmModal = bootstrap.Modal.getInstance(elmModalElement);
        if (elmModal) {
            elmModal.hide();
            // Clean up after modal is hidden
            elmModalElement.addEventListener('hidden.bs.modal', function() {
                elmModal.dispose();
                elmModalElement.remove();
                // Remove any leftover backdrop
                const elmBackdrop = document.querySelector('.modal-backdrop');
                if (elmBackdrop) {
                    elmBackdrop.remove();
                }
            }, { once: true });
        }
        
        // Refresh table
        refreshTable();
        Swal.fire('Success!', 'Record updated successfully', 'success');
    })
    .catch(error => {
        console.error('Error updating record:', error);
        Swal.fire('Error!', 'Error updating record: ' + error.message, 'error');
    });
}

// Delete specific record by ID
function deleteRecord(strId) {
    fetch(`http://127.0.0.1:8000/api/collection/${strId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(() => {
        fetchAndDisplayData(); // Refresh the table
        Swal.fire('Success!', 'Record deleted successfully', 'success');
    })
    .catch(error => {
        console.error('Error deleting record:', error);
        Swal.fire('Error!', 'Error deleting record: ' + error.message, 'error');
    });
}

// === CATEGORY MANAGEMENT ===
let objCategories = {};

// Load categories from server on page load
fetch('http://127.0.0.1:8000/api/categories')
.then(response => response.json())
.then(objData => {
    objCategories = objData;
    populateCategoryDropdowns();
})
.catch(error => console.error('Error loading categories:', error));

// Populate dropdown menus with available categories
function populateCategoryDropdowns() {
    const elmCategorySelect = document.getElementById('categorySelect');
    const elmSearchSelect = document.getElementById('searchCategorySelect');
    const elmEditSelect = document.getElementById('editCategorySelect');
    const elmDeleteSelect = document.getElementById('deleteCategorySelect');
    
    // Clear existing options except first
    elmCategorySelect.innerHTML = '<option value="">Choose a category...</option>';
    elmSearchSelect.innerHTML = '<option value="">Choose a category...</option>';
    elmEditSelect.innerHTML = '<option value="">Choose a category...</option>';
    elmDeleteSelect.innerHTML = '<option value="">Choose a category...</option>';
    
    // Add categories from JSON
    Object.keys(objCategories).forEach(strKey => {
        const elmOption1 = document.createElement('option');
        elmOption1.value = strKey;
        elmOption1.textContent = objCategories[strKey].name;
        elmCategorySelect.appendChild(elmOption1);
        
        const elmOption2 = document.createElement('option');
        elmOption2.value = strKey;
        elmOption2.textContent = objCategories[strKey].name;
        elmSearchSelect.appendChild(elmOption2);
        
        const elmOption3 = document.createElement('option');
        elmOption3.value = strKey;
        elmOption3.textContent = objCategories[strKey].name;
        elmEditSelect.appendChild(elmOption3);
        
        const elmOption4 = document.createElement('option');
        elmOption4.value = strKey;
        elmOption4.textContent = objCategories[strKey].name;
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
            const elmCard = document.createElement('div');
            elmCard.className = 'category-card';
            elmCard.innerHTML = `
                <h5>${objCategory.name}</h5>
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
    
    fetch('http://127.0.0.1:8000/api/collection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objData)
    })
    .then(response => response.json())
    .then(objResult => {
        Swal.fire('Success!', 'Data saved successfully!', 'success');
        elmInputs.forEach(elmInput => {
            if (elmInput.type === 'checkbox') {
                elmInput.checked = false;
            } else {
                elmInput.value = '';
            }
        });
        refreshTable();
    })
    .catch(error => {
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
            fetch(`http://127.0.0.1:8000/api/categories/${strCategoryKey}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(objResult => {
                delete objCategories[strCategoryKey];
                populateCategoryDropdowns();
                cancelDeleteCategory();
                Swal.fire('Deleted!', 'Category has been deleted.', 'success');
            })
            .catch(error => {
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
    const elmFieldDivs = document.getElementById('editCategoryFields').children;
    
    if (!strCategoryName) {
        Swal.fire('Warning!', 'Please enter a category name', 'warning');
        return;
    }
    
    const arrFields = [];
    for (let elmDiv of elmFieldDivs) {
        const elmNameInput = elmDiv.querySelector('input[type="text"]');
        const elmTypeSelect = elmDiv.querySelector('select');
        if (elmNameInput.value) {
            arrFields.push({
                name: elmNameInput.value.toLowerCase().replace(/\s+/g, '_'),
                label: elmNameInput.value,
                type: elmTypeSelect.value
            });
        }
    }
    
    if (arrFields.length === 0) {
        Swal.fire('Warning!', 'Please add at least one field', 'warning');
        return;
    }
    
    const strCategoryKey = elmEditSelect.value;
    const objUpdatedCategory = {
        name: strCategoryName,
        fields: arrFields
    };
    
    // Save to server
    fetch('http://127.0.0.1:8000/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: strCategoryKey, category: objUpdatedCategory })
    })
    .then(response => response.json())
    .then(objResult => {
        objCategories[strCategoryKey] = objUpdatedCategory;
        populateCategoryDropdowns();
        cancelEditCategory();
        Swal.fire('Success!', 'Category updated successfully!', 'success');
    })
    .catch(error => {
        Swal.fire('Error!', 'Error updating category: ' + error.message, 'error');
    });
}

// Save new category to server
function saveNewCategory() {
    const strCategoryName = document.getElementById('newCategoryName').value;
    const elmFieldDivs = document.getElementById('newCategoryFields').children;
    
    if (!strCategoryName) {
        Swal.fire('Warning!', 'Please enter a category name', 'warning');
        return;
    }
    
    const arrFields = [];
    for (let elmDiv of elmFieldDivs) {
        const elmNameInput = elmDiv.querySelector('input[type="text"]');
        const elmTypeSelect = elmDiv.querySelector('select');
        if (elmNameInput.value) {
            arrFields.push({
                name: elmNameInput.value.toLowerCase().replace(/\s+/g, '_'),
                label: elmNameInput.value,
                type: elmTypeSelect.value
            });
        }
    }
    
    if (arrFields.length === 0) {
        Swal.fire('Warning!', 'Please add at least one field', 'warning');
        return;
    }
    
    const strCategoryKey = strCategoryName.toLowerCase().replace(/\s+/g, '_');
    const objNewCategory = {
        name: strCategoryName,
        fields: arrFields
    };
    
    // Save to server
    fetch('http://127.0.0.1:8000/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: strCategoryKey, category: objNewCategory })
    })
    .then(response => response.json())
    .then(objResult => {
        objCategories[strCategoryKey] = objNewCategory;
        populateCategoryDropdowns();
        cancelAddCategory();
        Swal.fire('Success!', 'Category saved successfully!', 'success');
    })
    .catch(error => {
        Swal.fire('Error!', 'Error saving category: ' + error.message, 'error');
    });
}

// === SEARCH & FILTER ===
// Filter table data by selected category
function filterByCategory() {
    const elmCategorySelect = document.getElementById('searchCategorySelect');
    const strSelectedCategory = elmCategorySelect.value;
    
    if (!strSelectedCategory) {
        // Show all data if no category selected
        fetchAndDisplayData();
        return;
    }
    
    // Fetch and filter data by category
    fetch('http://127.0.0.1:8000/api/collection')
    .then(response => response.json())
    .then(arrData => {
        // Filter data by exact category match
        const arrFilteredData = arrData.filter(objItem => {
            return objItem.category === strSelectedCategory;
        });
        
        displayFilteredData(arrFilteredData);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}

// Display filtered data in DataTable
function displayFilteredData(arrData) {
    initializeDataTable(arrData);
}

// === SETTINGS MANAGEMENT ===
let objUserSettings = { darkMode: false, theme: 'default' };

// Load settings from server
function loadSettings() {
    fetch('http://127.0.0.1:8000/api/settings')
    .then(response => response.json())
    .then(objSettings => {
        objUserSettings = objSettings;
        applySettings();
    })
    .catch(error => {
        console.error('Error loading settings:', error);
        // Fallback to localStorage for web version
        const strDarkMode = localStorage.getItem('darkMode');
        if (strDarkMode === 'enabled') {
            objUserSettings.darkMode = true;
        }
        applySettings();
    });
}

// Apply settings to UI
function applySettings() {
    const elmToggle = document.getElementById('darkModeToggle');
    const elmThemeRadios = document.querySelectorAll('input[name="theme"]');
    
    // Apply theme
    document.body.className = '';
    document.body.classList.add(`theme-${objUserSettings.theme}`);
    
    // Set correct radio button
    elmThemeRadios.forEach(radio => {
        radio.checked = radio.value === objUserSettings.theme;
    });
    
    // Apply dark mode
    if (objUserSettings.darkMode) {
        document.body.classList.add('dark-mode');
        if (elmToggle) elmToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (elmToggle) elmToggle.checked = false;
    }
}

// Save settings to server
function saveSettings() {
    fetch('http://127.0.0.1:8000/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(objUserSettings)
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        // Fallback to localStorage for web version
        localStorage.setItem('darkMode', objUserSettings.darkMode ? 'enabled' : 'disabled');
    });
}

// Change theme
function changeTheme() {
    const elmSelectedRadio = document.querySelector('input[name="theme"]:checked');
    if (elmSelectedRadio) {
        objUserSettings.theme = elmSelectedRadio.value;
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
    fetch('http://127.0.0.1:8000/api/collection')
    .then(response => response.json())
    .then(arrData => {
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
        Swal.fire('Error!', 'Error exporting data: ' + error.message, 'error');
    });
}

// Load settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});