// ==========================================
// GOSchool — Shared Sidebar Component
// Mobile-first responsive sidebar with hamburger menu
// ==========================================

/**
 * Inicializa sidebar responsivo mobile-first
 * @param {Object} options - Opções de configuração
 * @param {string} options.sidebarId - ID do elemento sidebar (default: 'sidebar')
 * @param {string} options.hamburgerId - ID do botão hamburger (default: 'hamburgerBtn')
 * @param {string} options.overlayId - ID do overlay (default: 'sidebarOverlay')
 * @param {string} options.menuItemSelector - Seletor dos itens do menu (default: '.menu-item')
 * @param {number} options.breakpoint - Breakpoint em px para mobile (default: 768)
 */
export function initSidebar(options = {}) {
    const config = {
        sidebarId: 'sidebar',
        hamburgerId: 'hamburgerBtn',
        overlayId: 'sidebarOverlay',
        menuItemSelector: '.menu-item',
        breakpoint: 768,
        ...options
    };

    const sidebar = document.getElementById(config.sidebarId);
    const hamburger = document.getElementById(config.hamburgerId);
    const overlay = document.getElementById(config.overlayId);

    if (!sidebar || !hamburger || !overlay) {
        console.warn('[Sidebar] Elementos necessários não encontrados');
        return;
    }

    // Toggle sidebar
    function toggleSidebar() {
        const isOpen = sidebar.classList.toggle('open');
        overlay.hidden = !isOpen;
        hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        hamburger.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    }

    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.hidden = true;
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Abrir menu');
    }

    // Event listeners
    hamburger.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', closeSidebar);

    // Fechar ao clicar em link no mobile
    const handleMenuClick = () => {
        if (window.innerWidth < config.breakpoint) {
            closeSidebar();
        }
    };

    document.querySelectorAll(config.menuItemSelector).forEach(item => {
        item.addEventListener('click', handleMenuClick);
    });

    // Fechar com ESC
    const handleKeydown = (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    // Cleanup function
    return {
        destroy: () => {
            hamburger.removeEventListener('click', toggleSidebar);
            overlay.removeEventListener('click', closeSidebar);
            document.querySelectorAll(config.menuItemSelector).forEach(item => {
                item.removeEventListener('click', handleMenuClick);
            });
            document.removeEventListener('keydown', handleKeydown);
        },
        open: () => {
            if (!sidebar.classList.contains('open')) toggleSidebar();
        },
        close: closeSidebar,
        toggle: toggleSidebar
    };
}

/**
 * CSS necessário para o sidebar funcionar (já incluído no design-system.css)
 * Incluído aqui para referência:
 *
 * .sidebar { position: sticky; top: 0; height: 100vh; ... }
 * .hamburger-btn { display: none; ... }
 * .sidebar-overlay { display: none; position: fixed; inset: 0; background: var(--gs-modal-backdrop); z-index: calc(var(--gs-z-modal) - 1); }
 *
 * @media (max-width: 768px) {
 *   .hamburger-btn { display: flex; }
 *   .sidebar { position: fixed; left: -300px; top: 0; bottom: 0; width: 300px; max-width: 85vw; z-index: var(--gs-z-modal); transition: left var(--gs-transition-base); box-shadow: var(--gs-shadow-xl); }
 *   .sidebar.open { left: 0; }
 *   .sidebar-overlay.open { display: block; }
 * }
 */

// Auto-inicializar se elementos existirem
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('sidebarOverlay');

        if (sidebar && hamburger && overlay) {
            initSidebar();
        }
    });
}