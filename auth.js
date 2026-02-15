// Get API URL from config
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : 'http://127.0.0.1:8000';

let isLoginMode = true;

// Toggle between login and register
document.getElementById('toggleAuth').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const subtitle = document.getElementById('authSubtitle');
    const toggleLink = document.getElementById('toggleAuth');
    
    if (isLoginMode) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        subtitle.textContent = 'Login to your account';
        toggleLink.textContent = 'Need an account? Register here';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        subtitle.textContent = 'Create a new account';
        toggleLink.textContent = 'Already have an account? Login here';
    }
});

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, rememberMe })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user info
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            Swal.fire({
                title: 'Welcome back!',
                text: `Logged in as ${data.user.username}`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Redirect to main app
                window.location.href = 'index.html';
            });
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        Swal.fire('Error', 'Failed to connect to server. Please try again.', 'error');
    }
});

// Handle registration
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    // Validate passwords match
    if (password !== passwordConfirm) {
        Swal.fire('Error', 'Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user info
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            Swal.fire({
                title: 'Account Created!',
                text: `Welcome, ${data.user.username}!`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // Redirect to main app
                window.location.href = 'index.html';
            });
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        Swal.fire('Error', 'Failed to connect to server. Please try again.', 'error');
    }
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token is still valid
        try {
            const response = await fetch(`${API_URL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                // Token is valid, redirect to app
                window.location.href = 'index.html';
            } else {
                // Token invalid, clear it
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            // Network error, allow login attempt
        }
    }
});