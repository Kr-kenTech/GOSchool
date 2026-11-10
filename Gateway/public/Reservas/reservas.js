// ==========================================
// GOSchool — Reservas (JavaScript Module)
// ==========================================

(function() {
    'use strict';

    // Estado
    let currentView = 'minhas';
    let currentPage = 1;
    let totalPages = 1;
    let reservaParaCancelar = null;

    /**
     * Inicializa a página
     */
    async function init() {
        const authenticated = await Auth.init({
            requireAuth: true,
            allowedRoles: ['professor', 'adm']
        });

        if (!authenticated) return;

        // Logout
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.addEventListener('click', () => Auth.logout());

        // Nova Reserva
        const btnNovaReserva = document.getElementById('btnNovaReserva');
        if (btnNovaReserva) {
            btnNovaReserva.addEventListener('click', () => openModalReserva());
        }

        // Tabs
        initTabs();

        // Filtros
        initFilters();

        // Modais
        initModals();

        // Carregar dados iniciais
        await loadRefeicoesSelect();
        await loadTurmasSelect();
        await loadReservas();

        // Sidebar mobile
        initSidebarMobile();
    }

    /**
     * Inicializa abas
     */
    function initTabs() {
        const tabsContainer = document.getElementById('tabsContainer');
        if (!tabsContainer) return;

        tabsContainer.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });
    }

    /**
     * Troca view
     */
    function switchView(view) {
        currentView = view;
        currentPage = 1;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.dataset.view === view;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });

        document.querySelectorAll('.tab-panel').forEach(panel => {
            const isActive = panel.id === `panel-${view}`;
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        const titles = {
            'minhas': { title: 'Minhas Reservas', subtitle: 'Gerencie suas reservas de refeições' },
            'historico': { title: 'Histórico de Reservas', subtitle: 'Visualize reservas passadas' }
        };
        document.getElementById('pageTitle').textContent = titles[view]?.title || 'Reservas';
        document.getElementById('pageSubtitle').textContent = titles[view]?.subtitle || '';

        loadReservas();
    }

    /**
     * Inicializa filtros
     */
    function initFilters() {
        const filtroStatus = document.getElementById('filtroStatus');
        const filtroPeriodo = document.getElementById('filtroPeriodo');
        const buscaReserva = document.getElementById('buscaReserva');

        let debounceTimer = null;

        [filtroStatus, filtroPeriodo].forEach(el => {
            if (el) el.addEventListener('change', () => {
                currentPage = 1;
                loadReservas();
            });
        });

        if (buscaReserva) {
            buscaReserva.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    currentPage = 1;
                    loadReservas();
                }, 300);
            });
        }
    }

    /**
     * Inicializa modais
     */
    function initModals() {
        // Modal Reserva
        const modalReserva = document.getElementById('modalReserva');
        const modalReservaClose = document.getElementById('modalReservaClose');
        const btnCancelarReserva = document.getElementById('btnCancelarReserva');
        const formReserva = document.getElementById('formReserva');

        function closeModalReserva() {
            modalReserva.hidden = true;
            formReserva.reset();
            document.getElementById('reservaData').min = new Date().toISOString().split('T')[0];
        }

        modalReservaClose?.addEventListener('click', closeModalReserva);
        btnCancelarReserva?.addEventListener('click', closeModalReserva);
        modalReserva?.addEventListener('click', (e) => {
            if (e.target === modalReserva) closeModalReserva();
        });

        formReserva?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveReserva(new FormData(formReserva));
        });

        // Modal Cancelar
        const modalCancelar = document.getElementById('modalCancelar');
        const modalCancelarClose = document.getElementById('modalCancelarClose');
        const btnConfirmarCancelarNao = document.getElementById('btnConfirmarCancelarNao');
        const btnConfirmarCancelarSim = document.getElementById('btnConfirmarCancelarSim');

        function closeModalCancelar() {
            modalCancelar.hidden = true;
            reservaParaCancelar = null;
        }

        modalCancelarClose?.addEventListener('click', closeModalCancelar);
        btnConfirmarCancelarNao?.addEventListener('click', closeModalCancelar);
        modalCancelar?.addEventListener('click', (e) => {
            if (e.target === modalCancelar) closeModalCancelar();
        });

        btnConfirmarCancelarSim?.addEventListener('click', async () => {
            if (reservaParaCancelar) {
                await cancelReserva(reservaParaCancelar);
                closeModalCancelar();
            }
        });

        // ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!modalReserva.hidden) closeModalReserva();
                if (!modalCancelar.hidden) closeModalCancelar();
            }
        });
    }

    function openModalReserva() {
        const modalReserva = document.getElementById('modalReserva');
        const formReserva = document.getElementById('formReserva');
        formReserva.reset();
        document.getElementById('reservaData').min = new Date().toISOString().split('T')[0];
        modalReserva.hidden = false;
        document.getElementById('reservaData').focus();
    }

    /**
     * Carrega refeições para select
     */
    async function loadRefeicoesSelect() {
        try {
            const res = await Auth.apiCall('/api/cardapio/tipos-refeicao');
            if (!res.ok) throw new Error('Erro ao carregar refeições');

            const data = await res.json();
            const select = document.getElementById('reservaRefeicao');
            if (data.sucesso && data.tipos) {
                select.innerHTML = '<option value="">Selecione a refeição</option>' +
                    data.tipos.map(t => `<option value="${escapeHtml(t.value)}">${escapeHtml(t.label)}</option>`).join('');
            }
        } catch (err) {
            console.error('[Reservas] Erro ao carregar refeições:', err);
        }
    }

    /**
     * Carrega turmas para select
     */
    async function loadTurmasSelect() {
        try {
            const res = await Auth.apiCall('/api/usuario/turmas');
            if (!res.ok) throw new Error('Erro ao carregar turmas');

            const data = await res.json();
            const select = document.getElementById('reservaTurma');
            if (data.sucesso && data.turmas) {
                select.innerHTML = '<option value="">Selecione a turma</option>' +
                    data.turmas.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.nome)}</option>`).join('');
            }
        } catch (err) {
            console.error('[Reservas] Erro ao carregar turmas:', err);
        }
    }

    /**
     * Carrega reservas
     */
    async function loadReservas() {
        const isHistorico = currentView === 'historico';
        const tbodyId = isHistorico ? 'historico-tbody' : 'reservas-tbody';
        const tbody = document.getElementById(tbodyId);

        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-loading">Carregando...</td></tr>';
        }

        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                view: currentView
            });

            const filtroStatus = document.getElementById('filtroStatus')?.value;
            const filtroPeriodo = document.getElementById('filtroPeriodo')?.value;
            const busca = document.getElementById('buscaReserva')?.value;

            if (filtroStatus) params.append('status', filtroStatus);
            if (filtroPeriodo) params.append('periodo', filtroPeriodo);
            if (busca) params.append('busca', busca);

            const res = await Auth.apiCall(`/api/reservas?${params.toString()}`);
            if (!res.ok) throw new Error('Erro ao carregar reservas');

            const data = await res.json();
            totalPages = data.total_pages || 1;

            if (data.sucesso && data.reservas && data.reservas.length > 0) {
                if (tbody) {
                    tbody.innerHTML = data.reservas.map(r => `
                        <tr data-id="${r.id}">
                            <td>${formatDate(r.data_reserva)}</td>
                            <td>${escapeHtml(r.tipo_refeicao_label || r.tipo_refeicao)}</td>
                            <td>${escapeHtml(r.turma_nome)}</td>
                            <td>${r.quantidade}</td>
                            <td><span class="status-badge status-${r.status}">${formatStatus(r.status)}</span></td>
                            <td>
                                ${!isHistorico && (r.status === 'pendente' || r.status === 'confirmada') ? `
                                    <div class="action-buttons">
                                        <button class="btn-secondary btn-sm" onclick="Reservas.editReserva('${r.id}')">Editar</button>
                                        <button class="btn-danger btn-sm" onclick="Reservas.confirmCancel('${r.id}', '${escapeHtml(r.tipo_refeicao_label || r.tipo_refeicao)}', '${escapeHtml(r.data_reserva)}')">Cancelar</button>
                                    </div>
                                ` : `
                                    <button class="btn-secondary btn-sm" onclick="Reservas.viewDetails('${r.id}')">Ver</button>
                                `}
                            </td>
                        </tr>
                    `).join('');
                }
            } else {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${isHistorico ? 'Nenhuma reserva no histórico' : 'Nenhuma reserva encontrada'}</td></tr>`;
                }
            }

            updatePagination();
        } catch (err) {
            console.error('[Reservas] Erro ao carregar:', err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Erro ao carregar reservas</td></tr>';
            }
        }
    }

    function updatePagination() {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const info = document.getElementById('paginationInfo');

        if (totalPages > 1) {
            pagination.hidden = false;
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
            info.textContent = `Página ${currentPage} de ${totalPages}`;

            prevBtn.onclick = () => {
                if (currentPage > 1) {
                    currentPage--;
                    loadReservas();
                }
            };

            nextBtn.onclick = () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    loadReservas();
                }
            };
        } else {
            pagination.hidden = true;
        }
    }

    /**
     * Salva reserva
     */
    async function saveReserva(formData) {
        const btnSalvar = document.getElementById('btnSalvarReserva');
        const btnText = btnSalvar.querySelector('.btn-text');
        const btnLoading = btnSalvar.querySelector('.btn-loading');

        btnSalvar.disabled = true;
        btnText.hidden = true;
        btnLoading.hidden = false;

        try {
            const res = await Auth.apiCall('/api/reservas', {
                method: 'POST',
                body: JSON.stringify(Object.fromEntries(formData))
            });

            const data = await res.json();

            if (data.sucesso) {
                alert('Reserva criada com sucesso!');
                document.getElementById('modalReserva').hidden = true;
                formReserva.reset();
                loadReservas();
            } else {
                alert(data.mensagem || 'Erro ao criar reserva');
            }
        } catch (err) {
            console.error('[Reservas] Erro ao salvar:', err);
            alert('Erro ao salvar reserva. Tente novamente.');
        } finally {
            btnSalvar.disabled = false;
            btnText.hidden = false;
            btnLoading.hidden = true;
        }
    }

    function confirmCancel(id, refeicao, data) {
        reservaParaCancelar = id;
        document.getElementById('cancelarDetalhes').textContent = `${refeicao} - ${formatDate(data)}`;
        document.getElementById('modalCancelar').hidden = false;
    }

    async function cancelReserva(id) {
        try {
            const res = await Auth.apiCall(`/api/reservas/${id}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.sucesso) {
                alert('Reserva cancelada com sucesso!');
                loadReservas();
            } else {
                alert(data.mensagem || 'Erro ao cancelar reserva');
            }
        } catch (err) {
            console.error('[Reservas] Erro ao cancelar:', err);
            alert('Erro ao cancelar reserva. Tente novamente.');
        }
    }

    function editReserva(id) {
        alert('Edição de reserva - ID: ' + id);
    }

    function viewDetails(id) {
        alert('Detalhes da reserva - ID: ' + id);
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
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        } catch { return dateStr; }
    }

    function formatStatus(status) {
        const labels = {
            'pendente': 'Pendente',
            'confirmada': 'Confirmada',
            'cancelada': 'Cancelada',
            'concluida': 'Concluída'
        };
        return labels[status] || status;
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

    // Exportar
    window.Reservas = {
        init,
        switchView,
        loadReservas,
        editReserva,
        viewDetails,
        confirmCancel,
        cancelReserva
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();