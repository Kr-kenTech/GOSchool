// GoSchool - Shared Authentication Module
// Handles cookie-based JWT authentication, CSRF tokens, and role-based access

const Auth = (function() {
    'use strict';

    // Configuration
    const API_BASE = '';
    const LOGIN_URL = '/login';
    const PROTECTED_PATHS = {
        '/aluno/': 'aluno',
        '/professor/': 'professor',
        '/adm/': 'adm',
        '/reservas': 'professor'
    };

    // State
    let currentUser = null;
    let authPromise = null;
    let csrfToken = null;

    // Utility: Get cookie by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Utility: Set cookie
    function setCookie(name, value, options = {}) {
        const defaults = {
            path: '/',
            sameSite: 'lax',
            secure: window.location.protocol === 'https:'
        };
        const opts = { ...defaults, ...options };
        let cookieStr = `${name}=${value}`;
        if (opts.maxAge) cookieStr += `; Max-Age=${opts.maxAge}`;
        if (opts.path) cookieStr += `; Path=${opts.path}`;
        if (opts.sameSite) cookieStr += `; SameSite=${opts.sameSite}`;
        if (opts.secure) cookieStr += `; Secure`;
        if (opts.domain) cookieStr += `; Domain=${opts.domain}`;
        document.cookie = cookieStr;
    }

    // Fetch CSRF token
    async function fetchCsrfToken() {
        try {
            const res = await fetch(`${API_BASE}/api/csrf-token`, {
                method: 'GET',
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                csrfToken = data.csrf_token;
                return csrfToken;
            }
        } catch (e) {
            console.warn('[Auth] Failed to fetch CSRF token:', e);
        }
        return null;
    }

    // Get CSRF token (from cookie or fetch)
    function getCsrfToken() {
        if (csrfToken) return csrfToken;
        const cookieToken = getCookie(CSRF_COOKIE_NAME || 'csrf_token');
        if (cookieToken) {
            csrfToken = cookieToken;
            return csrfToken;
        }
        return null;
    }

    // Add CSRF token to headers
    function addCsrfHeaders(headers = {}) {
        const token = getCsrfToken();
        if (token) {
            headers['X-CSRF-Token'] = token;
        }
        return headers;
    }

    // Verify session with /api/me
    async function verifySession() {
        try {
            const res = await fetch(`${API_BASE}/api/me`, {
                method: 'GET',
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.sucesso && data.usuario) {
                    currentUser = data.usuario;
                    return currentUser;
                }
            }
        } catch (e) {
            console.warn('[Auth] Session verification failed:', e);
        }
        currentUser = null;
        return null;
    }

    // Get current user (with caching)
    async function getCurrentUser() {
        if (currentUser) return currentUser;
        if (authPromise) return authPromise;

        authPromise = verifySession();
        try {
            return await authPromise;
        } finally {
            authPromise = null;
        }
    }

    // Check if user has required role
    function hasRole(requiredRoles) {
        if (!currentUser) return false;
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        return roles.includes(currentUser.tipo);
    }

    // Require authentication - redirect to login if not authenticated
    async function requireAuth(allowedRoles = null) {
        const user = await getCurrentUser();
        if (!user) {
            redirectToLogin();
            return false;
        }
        if (allowedRoles && !hasRole(allowedRoles)) {
            // User authenticated but not authorized
            showUnauthorized();
            return false;
        }
        return true;
    }

    // Redirect to login page
    function redirectToLogin() {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `${LOGIN_URL}?return=${returnUrl}`;
    }

    // Show unauthorized message
    function showUnauthorized() {
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:20px;text-align:center;">
                <div style="max-width:400px;">
                    <h1 style="color:#c62828;">Acesso Negado</h1>
                    <p>Você não tem permissão para acessar esta página.</p>
                    <p>Seu perfil: <strong>${currentUser?.tipo || 'Desconhecido'}</strong></p>
                    <a href="${LOGIN_URL}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#1450a3;color:white;border-radius:4px;text-decoration:none;">Voltar ao Login</a>
                </div>
            </div>
        `;
        throw new Error('Unauthorized');
    }

    // Logout - clear session
    async function logout() {
        try {
            // Call logout endpoint if exists (optional)
            await fetch(`${API_BASE}/api/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: addCsrfHeaders({ 'Content-Type': 'application/json' })
            }).catch(() => {});
        } finally {
            // Clear cookies
            document.cookie.split(';').forEach(c => {
                const name = c.trim().split('=')[0];
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
            currentUser = null;
            csrfToken = null;
            window.location.href = LOGIN_URL;
        }
    }

    // Demo login
    async function demoLogin(email) {
        try {
            await fetchCsrfToken();
            const res = await fetch(`${API_BASE}/api/login/demo`, {
                method: 'POST',
                credentials: 'include',
                headers: addCsrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.sucesso) {
                currentUser = data.usuario;
                // Redirect to appropriate dashboard
                if (data.destino) {
                    window.location.href = data.destino;
                } else {
                    window.location.reload();
                }
                return true;
            }
            throw new Error(data.erro || 'Demo login failed');
        } catch (e) {
            console.error('[Auth] Demo login error:', e);
            throw e;
        }
    }

    // Regular login (form)
    async function login(email, password) {
        try {
            await fetchCsrfToken();
            const res = await fetch(`${API_BASE}/api/login`, {
                method: 'POST',
                credentials: 'include',
                headers: addCsrfHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.sucesso) {
                currentUser = data.usuario;
                window.location.reload();
                return true;
            }
            throw new Error(data.erro || 'Login failed');
        } catch (e) {
            console.error('[Auth] Login error:', e);
            throw e;
        }
    }

    // Initialize auth on page load
    async function init(options = {}) {
        const {
            requireAuth: needAuth = true,
            allowedRoles = null,
            autoFetchCsrf = true
        } = options;

        // Fetch CSRF token early
        if (autoFetchCsrf) {
            fetchCsrfToken();
        }

        // Check if current path requires auth
        const path = window.location.pathname.toLowerCase();
        const requiredRole = PROTECTED_PATHS[path];

        if (needAuth && (requiredRole || Object.values(PROTECTED_PATHS).some(r => path.startsWith(`/${r}/`)))) {
            const roles = allowedRoles || [requiredRole].filter(Boolean);
            const authenticated = await requireAuth(roles);
            if (!authenticated) return false;
        }

        // Update UI with user info if available
        if (currentUser) {
            updateUserUI();
        }

        return true;
    }

    // Update UI elements with user info
    function updateUserUI() {
        if (!currentUser) return;

        // Update user name/role in sidebar
        const userElements = document.querySelectorAll('[data-auth-user], .usuario span, #saudacao-usuario');
        userElements.forEach(el => {
            if (el.dataset.authUser === 'name' || el.id === 'saudacao-usuario') {
                el.textContent = `Olá, ${currentUser.nome}!`;
            } else if (el.dataset.authUser === 'role' || el.closest('.usuario')) {
                const roleLabels = {
                    'aluno': 'Aluno',
                    'professor': 'Professor',
                    'adm': 'Administrador'
                };
                el.textContent = roleLabels[currentUser.tipo] || currentUser.tipo;
            }
        });

        // Update user email if element exists
        const emailElements = document.querySelectorAll('[data-auth-user="email"]');
        emailElements.forEach(el => el.textContent = currentUser.email);

        // Show/hide elements based on role
        document.querySelectorAll('[data-auth-role]').forEach(el => {
            const allowedRoles = el.dataset.authRole.split(',');
            if (hasRole(allowedRoles)) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
            }
        });
    }

    // Make authenticated API calls
    async function apiCall(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...addCsrfHeaders()
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        // Add CSRF for state-changing methods
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes((options.method || 'GET').toUpperCase())) {
            mergedOptions.headers = addCsrfHeaders(mergedOptions.headers);
        }

        return fetch(`${API_BASE}${url}`, mergedOptions);
    }

    // Public API
    return {
        getCurrentUser,
        verifySession,
        requireAuth,
        login,
        demoLogin,
        logout,
        hasRole,
        getCsrfToken,
        apiCall,
        init,
        updateUserUI,
        // For backward compatibility
        isAuthenticated: () => !!currentUser,
        getUserRole: () => currentUser?.tipo,
        getUserEmail: () => currentUser?.email
    };
})();

// Auto-initialize if not in login page
if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    document.addEventListener('DOMContentLoaded', () => {
        Auth.init({ requireAuth: true });
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}