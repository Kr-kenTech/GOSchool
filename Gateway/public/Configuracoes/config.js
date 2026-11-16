// ==========================================
// GOSchool — Configurações (JavaScript Module)
// ==========================================

/**
 * Inicializa a página de configurações
 * Exporta funções para uso global
 */
(function() {
    'use strict';

    // Estado
    let currentTab = 'perfil';
    let userData = null;

    /**
     * Inicializa a página
     */
    async function init() {
        const authenticated = await Auth.init({
            requireAuth: true,
            allowedRoles: ['aluno', 'professor', 'adm']
        });

        if (!authenticated) return;

        // Configurar logout
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

        // Configurar abas
        initTabs();

        // Configurar formulários
        initForms();

        // Configurar modais
        initModals();

        // Configurar preferências
        initPreferences();

        // Carregar dados
        await loadUserData();
        await loadAlergenos();
        await loadSessoes();

        // Sidebar mobile
        initSidebarMobile();

        // Tab from URL
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab && document.querySelector(`[data-tab="${tab}"]`)) {
            switchTab(tab);
        }
    }

    /**
     * Inicializa abas
     */
    function initTabs() {
        const tabs = document.getElementById('configTabs');
        if (!tabs) return;

        tabs.querySelectorAll('.config-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        tabs.addEventListener('keydown', (e) => {
            const btns = Array.from(tabs.querySelectorAll('.config-tab-btn'));
            const activeIndex = btns.findIndex(b => b === document.activeElement);
            let newIndex = activeIndex;

            if (e.key === 'ArrowRight') newIndex = (activeIndex + 1) % btns.length;
            if (e.key === 'ArrowLeft') newIndex = (activeIndex - 1 + btns.length) % btns.length;
            if (e.key === 'Home') newIndex = 0;
            if (e.key === 'End') newIndex = btns.length - 1;

            if (newIndex !== activeIndex) {
                e.preventDefault();
                btns[newIndex].focus();
                btns[newIndex].click();
            }
        });
    }

    /**
     * Troca aba ativa
     */
    function switchTab(tab) {
        currentTab = tab;

        document.querySelectorAll('.config-tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });

        document.querySelectorAll('.config-tab-panel').forEach(panel => {
            const isActive = panel.id === `panel-${tab}`;
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        const url = new URL(window.location);
        url.searchParams.set('tab', tab);
        window.history.replaceState({}, '', url);
    }

    /**
     * Inicializa formulários
     */
    function initForms() {
        // Perfil
        const formPerfil = document.getElementById('formPerfil');
        if (formPerfil) {
            formPerfil.addEventListener('submit', async (e) => {
                e.preventDefault();
                await savePerfil(new FormData(formPerfil));
            });
        }

        // Senha
        const formSenha = document.getElementById('formSenha');
        if (formSenha) {
            formSenha.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formSenha);
                if (formData.get('nova_senha') !== formData.get('confirmar_senha')) {
                    alert('As senhas não coincidem');
                    return;
                }
                await changePassword(formData);
            });
        }

        // Alergias
        const btnSalvarAlergias = document.getElementById('btnSalvarAlergias');
        if (btnSalvarAlergias) {
            btnSalvarAlergias.addEventListener('click', saveAlergias);
        }
    }

    /**
     * Inicializa preferências (toggles, selects)
     */
    function initPreferences() {
        // Tema - sincronizar com GlobalPreferences
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    GlobalPreferences.set('theme', e.target.value);
                }
            });
        });

        // Selects
        ['prefDensidade', 'prefIdioma', 'prefCardapioView'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    GlobalPreferences.set(el.dataset.pref, el.value);
                });
            }
        });

        // Toggles
        document.querySelectorAll('.toggle-switch input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                GlobalPreferences.set(checkbox.closest('.toggle-switch').dataset.pref, checkbox.checked);
            });
        });
    }

    /**
     * Inicializa modais
     */
    function initModals() {
        // Modal Excluir Conta
        const modalExcluir = document.getElementById('modalExcluirConta');
        const btnExcluirConta = document.getElementById('btnExcluirConta');
        const btnCancelarExcluir = document.getElementById('btnCancelarExcluir');
        const btnConfirmarExcluir = document.getElementById('btnConfirmarExcluir');
        const confirmInput = document.getElementById('confirmExcluirInput');
        const modalExcluirClose = document.getElementById('modalExcluirClose');

        function closeModalExcluir() {
            modalExcluir.hidden = true;
        }

        btnExcluirConta?.addEventListener('click', () => {
            modalExcluir.hidden = false;
            confirmInput.value = '';
            btnConfirmarExcluir.disabled = true;
            confirmInput.focus();
        });

        btnCancelarExcluir?.addEventListener('click', closeModalExcluir);
        modalExcluirClose?.addEventListener('click', closeModalExcluir);
        modalExcluir?.addEventListener('click', (e) => {
            if (e.target === modalExcluir) closeModalExcluir();
        });

        confirmInput?.addEventListener('input', () => {
            btnConfirmarExcluir.disabled = confirmInput.value !== 'EXCLUIR';
        });

        btnConfirmarExcluir?.addEventListener('click', async () => {
            await deleteAccount();
            closeModalExcluir();
        });

        // Modal Revogar Sessões
        const modalRevogar = document.getElementById('modalRevogarSessoes');
        const btnRevogarSessoes = document.getElementById('btnRevogarSessoes');
        const btnCancelarRevogar = document.getElementById('btnCancelarRevogar');
        const btnConfirmarRevogar = document.getElementById('btnConfirmarRevogar');
        const modalRevogarClose = document.getElementById('modalRevogarClose');

        function closeModalRevogar() {
            modalRevogar.hidden = true;
        }

        btnRevogarSessoes?.addEventListener('click', () => {
            modalRevogar.hidden = false;
        });

        btnCancelarRevogar?.addEventListener('click', closeModalRevogar);
        btnConfirmarRevogar?.addEventListener('click', async () => {
            await revokeSessions();
            closeModalRevogar();
        });
        modalRevogarClose?.addEventListener('click', closeModalRevogar);
        modalRevogar?.addEventListener('click', (e) => {
            if (e.target === modalRevogar) closeModalRevogar();
        });

        // ESC para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!modalExcluir.hidden) closeModalExcluir();
                if (!modalRevogar.hidden) closeModalRevogar();
            }
        });
    }

    /**
     * Carrega dados do usuário
     */
    async function loadUserData() {
        try {
            const res = await Auth.apiCall('/api/usuario/perfil');
            if (!res.ok) throw new Error('Erro ao carregar perfil');

            const data = await res.json();
            if (data.sucesso && data.usuario) {
                userData = data.usuario;
                fillPerfilForm(data.usuario);
                updateAvatar(data.usuario);
            }
        } catch (err) {
            console.error('[Config] Erro ao carregar perfil:', err);
        }
    }

    function fillPerfilForm(usuario) {
        document.getElementById('perfilNome').value = usuario.nome || '';
        document.getElementById('perfilEmail').value = usuario.email || '';
        document.getElementById('perfilTelefone').value = usuario.telefone || '';
        document.getElementById('perfilRole').value = formatRole(usuario.role);

        loadTurmasSelect(usuario.turma_id);

        if (usuario.alergias && usuario.alergias.length > 0) {
            usuario.alergias.forEach(alergia => {
                const checkbox = document.querySelector(`#alergenosGrid input[value="${alergia}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    async function loadTurmasSelect(selectedId) {
        try {
            const res = await Auth.apiCall('/api/usuario/turmas');
            if (!res.ok) throw new Error('Erro ao carregar turmas');

            const data = await res.json();
            const select = document.getElementById('perfilTurma');
            if (data.sucesso && data.turmas) {
                select.innerHTML = '<option value="">Não vinculado a nenhuma turma</option>' +
                    data.turmas.map(t => `<option value="${escapeHtml(t.id)}" ${t.id === selectedId ? 'selected' : ''}>${escapeHtml(t.nome)}</option>`).join('');
            }
        } catch (err) {
            console.error('[Config] Erro ao carregar turmas:', err);
        }
    }

    function updateAvatar(usuario) {
        const avatar = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const sidebarName = document.getElementById('sidebarUserName');

        if (avatar) avatar.textContent = (usuario.nome || 'U')[0].toUpperCase();
        if (nameEl) nameEl.textContent = usuario.nome || 'Usuário';
        if (sidebarName) sidebarName.textContent = usuario.nome ? `Olá, ${usuario.nome.split(' ')[0]}!` : 'Olá, Usuário!';
    }

    /**
     * Salva perfil
     */
    async function savePerfil(formData) {
        const btn = document.getElementById('btnSalvarPerfil');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.hidden = true;
        btnLoading.hidden = false;

        try {
            const res = await Auth.apiCall('/api/usuario/perfil', {
                method: 'PUT',
                body: JSON.stringify(Object.fromEntries(formData))
            });

            const data = await res.json();

            if (data.sucesso) {
                alert('Perfil atualizado com sucesso!');
                if (data.usuario) updateAvatar(data.usuario);
            } else {
                alert(data.mensagem || 'Erro ao atualizar perfil');
            }
        } catch (err) {
            console.error('[Config] Erro ao salvar perfil:', err);
            alert('Erro ao salvar perfil. Tente novamente.');
        } finally {
            btn.disabled = false;
            btnText.hidden = false;
            btnLoading.hidden = true;
        }
    }

    /**
     * Altera senha
     */
    async function changePassword(formData) {
        const btn = document.getElementById('btnAlterarSenha');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.hidden = true;
        btnLoading.hidden = false;

        try {
            const res = await Auth.apiCall('/api/usuario/senha', {
                method: 'PUT',
                body: JSON.stringify({
                    senha_atual: formData.get('senha_atual'),
                    nova_senha: formData.get('nova_senha')
                })
            });

            const data = await res.json();

            if (data.sucesso) {
                alert('Senha alterada com sucesso!');
                formSenha.reset();
            } else {
                alert(data.mensagem || 'Erro ao alterar senha');
            }
        } catch (err) {
            console.error('[Config] Erro ao alterar senha:', err);
            alert('Erro ao alterar senha. Tente novamente.');
        } finally {
            btn.disabled = false;
            btnText.hidden = false;
            btnLoading.hidden = true;
        }
    }

    /**
     * Carrega alergênicos disponíveis
     */
    async function loadAlergenos() {
        try {
            const res = await Auth.apiCall('/api/alergenos');
            if (!res.ok) throw new Error('Erro ao carregar alergênicos');

            const data = await res.json();
            if (data.sucesso && data.alergenos) {
                renderAlergenosGrid(data.alergenos);
            }
        } catch (err) {
            console.error('[Config] Erro ao carregar alergênicos:', err);
        }
    }

    function renderAlergenosGrid(alergenos) {
        const grid = document.getElementById('alergenosGrid');
        if (!grid) return;

        const categorias = {};
        alergenos.forEach(a => {
            if (!categorias[a.categoria]) categorias[a.categoria] = [];
            categorias[a.categoria].push(a);
        });

        grid.innerHTML = Object.entries(categorias).map(([categoria, items]) => `
            <div class="alergenos-categoria">
                <h4 class="alergenos-categoria-titulo">${escapeHtml(categoria)}</h4>
                <div class="alergenos-lista">
                    ${items.map(a => `
                        <label class="alergeno-item">
                            <input type="checkbox" value="${escapeHtml(a.nome)}" data-id="${a.id}">
                            <span class="alergeno-nome">${escapeHtml(a.nome)}</span>
                            ${a.descricao ? `<span class="alergeno-desc">${escapeHtml(a.descricao)}</span>` : ''}
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Salva alergias do usuário
     */
    async function saveAlergias() {
        const btn = document.getElementById('btnSalvarAlergias');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        const selecionados = Array.from(document.querySelectorAll('#alergenosGrid input:checked'))
            .map(cb => cb.value);

        btn.disabled = true;
        btnText.hidden = true;
        btnLoading.hidden = false;

        try {
            const res = await Auth.apiCall('/api/usuario/alergias', {
                method: 'PUT',
                body: JSON.stringify({ alergias: selecionados })
            });

            const data = await res.json();

            if (data.sucesso) {
                alert('Alergias salvas com sucesso!');
            } else {
                alert(data.mensagem || 'Erro ao salvar alergias');
            }
        } catch (err) {
            console.error('[Config] Erro ao salvar alergias:', err);
            alert('Erro ao salvar alergias. Tente novamente.');
        } finally {
            btn.disabled = false;
            btnText.hidden = false;
            btnLoading.hidden = true;
        }
    }

    /**
     * Carrega sessões ativas
     */
    async function loadSessoes() {
        try {
            const res = await Auth.apiCall('/api/usuario/sessoes');
            if (!res.ok) throw new Error('Erro ao carregar sessões');

            const data = await res.json();
            const tbody = document.getElementById('sessoes-tbody');

            if (data.sucesso && data.sessoes && data.sessoes.length > 0) {
                tbody.innerHTML = data.sessoes.map(s => `
                    <tr>
                        <td>${escapeHtml(s.dispositivo || 'Desconhecido')}</td>
                        <td>${escapeHtml(s.localizacao || 'Desconhecida')}</td>
                        <td>${formatDateTime(s.ultima_atividade)}</td>
                        <td>${s.atual ? '<span class="badge badge-green">Atual</span>' : ''}</td>
                        <td>
                            ${!s.atual ? `
                                <button class="btn-danger btn-sm" onclick="Config.revokeSession('${s.id}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg>
                                    Revogar
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Nenhuma sessão ativa</td></tr>';
            }
        } catch (err) {
            console.error('[Config] Erro ao carregar sessões:', err);
            document.getElementById('sessoes-tbody').innerHTML =
                '<tr><td colspan="5" class="table-empty">Erro ao carregar sessões</td></tr>';
        }
    }

    /**
     * Revoga uma sessão específica
     */
    async function revokeSession(id) {
        if (!confirm('Tem certeza que deseja revogar esta sessão?')) return;

        try {
            const res = await Auth.apiCall(`/api/usuario/sessoes/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.sucesso) {
                alert('Sessão revogada com sucesso!');
                loadSessoes();
            } else {
                alert(data.mensagem || 'Erro ao revogar sessão');
            }
        } catch (err) {
            console.error('[Config] Erro ao revogar sessão:', err);
            alert('Erro ao revogar sessão');
        }
    }

    /**
     * Revoga todas as outras sessões
     */
    async function revokeSessions() {
        try {
            const res = await Auth.apiCall('/api/usuario/sessoes/revogar-todas', {
                method: 'POST'
            });

            const data = await res.json();
            if (data.sucesso) {
                alert('Todas as outras sessões foram revogadas!');
                loadSessoes();
            } else {
                alert(data.mensagem || 'Erro ao revogar sessões');
            }
        } catch (err) {
            console.error('[Config] Erro ao revogar sessões:', err);
            alert('Erro ao revogar sessões');
        }
    }

    /**
     * Exclui conta
     */
    async function deleteAccount() {
        try {
            const res = await Auth.apiCall('/api/usuario/conta', {
                method: 'DELETE'
            });

            const data = await res.json();
            if (data.sucesso) {
                alert('Conta excluída com sucesso!');
                Auth.logout();
            } else {
                alert(data.mensagem || 'Erro ao excluir conta');
            }
        } catch (err) {
            console.error('[Config] Erro ao excluir conta:', err);
            alert('Erro ao excluir conta');
        }
    }

    /**
     * Sidebar Mobile
     */
    function initSidebarMobile() {
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');

        if (hamburger) hamburger.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', closeSidebar);

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth < 768) closeSidebar();
            });
        });
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const hamburger = document.getElementById('hamburgerBtn');

        if (sidebar && overlay && hamburger) {
            const isOpen = sidebar.classList.toggle('open');
            overlay.hidden = !isOpen;
            hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const hamburger = document.getElementById('hamburgerBtn');

        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.hidden = true;
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    // Utilitários
    function formatRole(role) {
        const labels = { 'aluno': 'Aluno', 'professor': 'Professor', 'adm': 'Administrador' };
        return labels[role] || role;
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return dateStr; }
    }

    function escapeHtml(valor) {
        if (valor === null || valor === undefined) return '';
        return String(valor)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }

    // Exportar para uso global
    window.Config = {
        init,
        switchTab,
        revokeSession,
        revokeSessions,
        deleteAccount,
        saveAlergias,
        loadSessoes
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();