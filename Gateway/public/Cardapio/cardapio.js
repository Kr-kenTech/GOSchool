// ==========================================
// GOSchool — Cardápio (JavaScript)
// Refatorado para usar apenas Design System (sem Tailwind/FontAwesome)
// ==========================================

let currentUserRole = 'ALUNO';
let currentUser = null;
let allAllergens = []; // Lista de todos os alergênicos disponíveis

// Inicialização do módulo Cardápio
async function inicializarCardapio() {
    // Obter role do usuário autenticado
    const user = Auth.getCurrentUser();
    if (user) {
        currentUserRole = (user.tipo || 'aluno').toUpperCase();
        currentUser = user;
    }

    // Carregar alergênicos para formulário admin
    await carregarAlergenicos();

    // Carregar cardápio do dia via API
    await carregarCardapioDia();

    // Configurar abas
    configurarAbas();

    // Configurar formulário admin se for admin
    if (currentUserRole === 'ADM') {
        configurarFormularioAdmin();
        await carregarListaRefeicoesAdmin();
    }

    // Carregar cardápio semanal se a aba estiver ativa
    const weeklyTab = document.getElementById('tab-weekly');
    if (weeklyTab && !weeklyTab.hidden) {
        await carregarCardapioSemanal();
    }
}

// Configurar abas do menu lateral
function configurarAbas() {
    document.querySelectorAll('.menu-item[data-auth-role]').forEach(item => {
        const role = item.dataset.authRole;
        if (role && currentUserRole !== role.toUpperCase()) {
            item.style.display = 'none';
        }
    });
}

// Carregar lista de alergênicos disponíveis
async function carregarAlergenicos() {
    try {
        const res = await Auth.apiCall('/api/cardapio/categorias');
        if (res.ok) {
            const data = await res.json();
            if (data.sucesso && data.alergicos) {
                allAllergens = data.alergicos;
            }
        }
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar alergênicos:', err);
    }
}

// Carregar cardápio do dia via API
async function carregarCardapioDia() {
    try {
        const res = await Auth.apiCall('/api/cardapio/hoje');
        if (!res.ok) throw new Error('Erro ao carregar cardápio');

        const data = await res.json();
        if (data.sucesso && data.cardapio) {
            renderDailyMenu(data.cardapio);
        } else {
            renderDailyMenu([]);
        }
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar cardápio do dia:', err);
        renderDailyMenu([]);
    }
}

// Carregar cardápio semanal via API
async function carregarCardapioSemanal() {
    try {
        const res = await Auth.apiCall('/api/cardapio/semana');
        if (!res.ok) throw new Error('Erro ao carregar cardápio semanal');

        const data = await res.json();
        if (data.sucesso && data.cardapio) {
            renderWeeklyMenu(data.cardapio);
        }
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar cardápio semanal:', err);
    }
}

// Renderiza os cards do cardápio do dia
function renderDailyMenu(cardapio) {
    const container = document.getElementById('dailyMenuContainer');
    if (!container) return;

    if (!cardapio || cardapio.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 2v7c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V2"></path>
                    <path d="M7 2v20"></path>
                    <path d="M17 2v20"></path>
                </svg>
                <p>Nenhum cardápio disponível para hoje.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cardapio.map((meal) => {
        const hasAlertaAlergia = meal.alertaAlergia === true;
        const isAluno = currentUserRole === 'ALUNO';

        // Badge de alergênicos
        let allergenBadgeHtml = '';
        if (meal.alergicos && meal.alergicos.length > 0) {
            if (hasAlertaAlergia && isAluno) {
                allergenBadgeHtml = `
                    <span class="tag tag-alert" role="status">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        ⚠ ALERGIA: ${escapeHtml(meal.alergicos.join(', '))}
                    </span>
                `;
            } else {
                allergenBadgeHtml = `
                    <span class="tag tag-amber" role="status">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        CONTÉM: ${escapeHtml(meal.alergicos.join(', '))}
                    </span>
                `;
            }
        } else {
            allergenBadgeHtml = `
                <span class="tag tag-green" role="status">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    SEM ALERGÊNICOS DECLARADOS
                </span>
            `;
        }

        // Botões admin (apenas para ADM)
        let adminButtons = '';
        if (currentUserRole === 'ADM') {
            adminButtons = `
                <div class="card-actions">
                    <button onclick="editarRefeicao(${meal.id})" class="btn-edit" aria-label="Editar refeição">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                    <button onclick="excluirRefeicao(${meal.id})" class="btn-danger" aria-label="Excluir refeição">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Excluir
                    </button>
                </div>
            `;
        }

        const imageUrl = meal.imagem || '/Inicio/inicio.jpeg';

        return `
            <article class="meal-card ${hasAlertaAlergia && isAluno ? 'meal-card--alert' : ''}" role="listitem">
                <div class="meal-card-image">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(meal.nome || 'Refeição')}" loading="lazy">
                    ${hasAlertaAlergia && isAluno ? `
                        <span class="meal-card-badge alert-badge" aria-label="Alerta de alergia">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            ALERTA
                        </span>
                    ` : ''}
                </div>

                <div class="meal-card-content">
                    <div class="meal-card-header">
                        <span class="meal-category ${meal.categoria}">${formatCategoria(meal.categoria || meal.tipo_refeicao || 'Refeição')}</span>
                        ${meal.horario ? `<span class="meal-time" aria-label="Horário">${escapeHtml(meal.horario)}</span>` : ''}
                    </div>

                    <h3 class="meal-card-title">${escapeHtml(meal.nome || 'Prato do Dia')}</h3>

                    ${meal.descricao ? `<p class="meal-card-desc">${escapeHtml(meal.descricao)}</p>` : ''}

                    <div class="meal-nutrition" aria-label="Informações nutricionais">
                        <span class="nutrition-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                            </svg>
                            ${meal.calorias || meal.kcal || '-'} kcal
                        </span>
                        <span class="nutrition-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            ${meal.proteina || meal.protein || '-'}g P
                        </span>
                        <span class="nutrition-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                                <path d="M8 6h8M8 10h8M8 14h8M8 18h8"></path>
                            </svg>
                            ${meal.carboidrato || meal.carb || '-'}g C
                        </span>
                    </div>

                    <div class="meal-allergens" role="status" aria-live="polite">
                        ${allergenBadgeHtml}
                    </div>

                    ${meal.observacoes ? `<p class="meal-notes">${escapeHtml(meal.observacoes)}</p>` : ''}
                </div>
                ${adminButtons}
            </article>
        `;
    }).join('');
}

// Renderiza cardápio semanal (para aba weekly)
function renderWeeklyMenu(cardapioSemanal) {
    const container = document.getElementById('weeklyMenuContainer');
    if (!container) return;

    // Ordem dos dias da semana
    const diasOrdem = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const diasLabels = {
        'segunda': 'Segunda-feira',
        'terca': 'Terça-feira',
        'quarta': 'Quarta-feira',
        'quinta': 'Quinta-feira',
        'sexta': 'Sexta-feira',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    // Obter dia atual
    const hoje = new Date().getDay();
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaAtual = diasSemana[hoje];

    let html = '';

    diasOrdem.forEach(dia => {
        const refeicoes = cardapioSemanal[dia] || [];
        const isHoje = dia === diaAtual;

        if (refeicoes.length === 0) {
            html += `
                <section class="weekly-day ${isHoje ? 'weekly-day--today' : ''}">
                    <header class="weekly-day-header">
                        <h3 class="weekly-day-title">
                            ${diasLabels[dia]}
                            ${isHoje ? '<span class="tag tag-primary">HOJE</span>' : ''}
                        </h3>
                    </header>
                    <div class="weekly-day-meals">
                        <div class="empty-state" style="grid-column: 1 / -1; padding: var(--gs-spacing-xl);">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path d="M3 2v7c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V2"></path>
                                <path d="M7 2v20"></path>
                                <path d="M17 2v20"></path>
                            </svg>
                            <p>Nenhuma refeição programada</p>
                        </div>
                    </div>
                </section>
            `;
            return;
        }

        html += `
            <section class="weekly-day ${isHoje ? 'weekly-day--today' : ''}">
                <header class="weekly-day-header">
                    <h3 class="weekly-day-title">
                        ${diasLabels[dia]}
                        ${isHoje ? '<span class="tag tag-primary">HOJE</span>' : ''}
                    </h3>
                </header>
                <div class="weekly-day-meals">
        `;

        refeicoes.forEach(meal => {
            const hasAlertaAlergia = meal.alertaAlergia === true;
            const isAluno = currentUserRole === 'ALUNO';

            let allergenBadgeHtml = '';
            if (meal.alergicos && meal.alergicos.length > 0) {
                if (hasAlertaAlergia && isAluno) {
                    allergenBadgeHtml = `
                        <span class="tag tag-alert">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            ⚠ ${escapeHtml(meal.alergicos.join(', '))}
                        </span>
                    `;
                } else {
                    allergenBadgeHtml = `
                        <span class="tag tag-amber">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            ${escapeHtml(meal.alergicos.join(', '))}
                        </span>
                    `;
                }
            } else {
                allergenBadgeHtml = `
                    <span class="tag tag-green">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Sem alergênicos
                    </span>
                `;
            }

            let adminButtons = '';
            if (currentUserRole === 'ADM') {
                adminButtons = `
                    <div class="card-actions" style="padding-top: var(--gs-spacing-sm); border-top: 1px solid var(--gs-border); margin-top: var(--gs-spacing-sm);">
                        <button onclick="editarRefeicao(${meal.id})" class="btn-edit" style="font-size: var(--gs-font-size-xs); padding: var(--gs-spacing-xs) var(--gs-spacing-sm);" aria-label="Editar refeição">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Editar
                        </button>
                        <button onclick="excluirRefeicao(${meal.id})" class="btn-danger" style="font-size: var(--gs-font-size-xs); padding: var(--gs-spacing-xs) var(--gs-spacing-sm);" aria-label="Excluir refeição">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Excluir
                        </button>
                    </div>
                `;
            }

            html += `
                <article class="weekly-meal-card ${hasAlertaAlergia && isAluno ? 'weekly-meal-card--alert' : ''}">
                    <span class="weekly-meal-category ${meal.categoria}">${formatCategoria(meal.categoria)}</span>
                    <h4 class="weekly-meal-name">${escapeHtml(meal.nome || 'Refeição')}</h4>
                    ${meal.descricao ? `<p class="weekly-meal-desc">${escapeHtml(meal.descricao)}</p>` : ''}
                    <div class="weekly-meal-meta">
                        ${meal.horario ? `<span aria-label="Horário">${escapeHtml(meal.horario)}</span>` : ''}
                        ${meal.calorias ? `<span aria-label="Calorias">${escapeHtml(meal.calorias)} kcal</span>` : ''}
                    </div>
                    <div class="weekly-meal-allergens" role="status">
                        ${allergenBadgeHtml}
                    </div>
                    ${adminButtons}
                </article>
            `;
        });

        html += `
                </div>
            </section>
        `;
    });

    container.innerHTML = html;
}

// Formatar categoria para exibição
function formatCategoria(cat) {
    const labels = {
        'cafe_manha': 'Café da Manhã',
        'almoco': 'Almoço',
        'lanche': 'Lanche',
        'jantar': 'Jantar'
    };
    return labels[cat] || cat;
}

// ============================================
// FUNCIONALIDADES ADMIN (CRUD)
// ============================================

// Configurar formulário admin
function configurarFormularioAdmin() {
    const form = document.getElementById('mealForm');
    if (!form) return;

    // Preencher checkboxes de alergênicos
    renderAllergenCheckboxes();

    // Event listener para submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await salvarRefeicao();
    });

    // Event listener para cancelar
    const cancelBtn = document.getElementById('mealCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetarFormulario);
    }
}

// Renderizar checkboxes de alergênicos
function renderAllergenCheckboxes(selected = []) {
    const container = document.getElementById('allergenCheckboxes');
    if (!container) return;

    // Alergênicos padrão se não houver do backend
    const alergenicosPadrao = [
        'Glúten', 'Leite', 'Ovos', 'Peixe', 'Crustáceos', 'Moluscos',
        'Amendoim', 'Soja', 'Castanhas', 'Aipo', 'Mostarda', 'Gergelim',
        'Sulfitos', 'Lupino'
    ];

    const alergenicos = allAllergens.length > 0 ? allAllergens : alergenicosPadrao;

    container.innerHTML = alergenicos.map(alergia => `
        <label class="allergen-checkbox">
            <input type="checkbox" name="alergicos" value="${escapeHtml(alergia)}" ${selected.includes(alergia) ? 'checked' : ''}>
            <span>${escapeHtml(alergia)}</span>
        </label>
    `).join('');
}

// Salvar refeição (criar ou atualizar)
async function salvarRefeicao() {
    const form = document.getElementById('mealForm');
    const formData = new FormData(form);

    const mealData = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        categoria: formData.get('categoria'),
        dia_semana: formData.get('dia_semana'),
        horario: formData.get('horario') || null,
        calorias: formData.get('calorias') ? parseInt(formData.get('calorias')) : null,
        proteina: formData.get('proteina') ? parseFloat(formData.get('proteina')) : null,
        carboidrato: formData.get('carboidrato') ? parseFloat(formData.get('carboidrato')) : null,
        imagem: formData.get('imagem') || null,
        alergicos: formData.getAll('alergicos'),
        observacoes: formData.get('observacoes')
    };

    const mealId = formData.get('id');
    const isEdit = mealId && mealId !== '';

    try {
        let res;
        const csrfToken = Auth.getCsrfToken();

        if (isEdit) {
            res = await Auth.apiCall(`/api/cardapio/${mealId}`, {
                method: 'PUT',
                body: JSON.stringify(mealData),
                headers: { 'X-CSRF-Token': csrfToken }
            });
        } else {
            res = await Auth.apiCall('/api/cardapio', {
                method: 'POST',
                body: JSON.stringify(mealData),
                headers: { 'X-CSRF-Token': csrfToken }
            });
        }

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.erro || 'Erro ao salvar refeição');
        }

        // Sucesso
        resetarFormulario();
        await carregarCardapioDia(); // Atualizar view do dia
        await carregarListaRefeicoesAdmin(); // Atualizar lista admin

        alert(isEdit ? 'Refeição atualizada com sucesso!' : 'Refeição criada com sucesso!');
    } catch (err) {
        console.error('[Cardápio] Erro ao salvar refeição:', err);
        alert('Erro: ' + err.message);
    }
}

// Editar refeição - preencher formulário
async function editarRefeicao(id) {
    try {
        const res = await Auth.apiCall(`/api/cardapio/${id}`);
        if (!res.ok) throw new Error('Erro ao buscar refeição');

        const data = await res.json();
        if (!data.sucesso || !data.cardapio) throw new Error('Refeição não encontrada');

        const meal = data.cardapio;

        // Preencher formulário
        document.getElementById('mealId').value = meal.id;
        document.getElementById('mealNome').value = meal.nome || '';
        document.getElementById('mealDescricao').value = meal.descricao || '';
        document.getElementById('mealCategoria').value = meal.categoria || '';
        document.getElementById('mealDiaSemana').value = meal.dia_semana || '';
        document.getElementById('mealHorario').value = meal.horario ? meal.horario.substring(0, 5) : '';
        document.getElementById('mealCalorias').value = meal.calorias || '';
        document.getElementById('mealProteina').value = meal.proteina || '';
        document.getElementById('mealCarboidrato').value = meal.carboidrato || '';
        document.getElementById('mealImagem').value = meal.imagem || '';
        document.getElementById('mealObservacoes').value = meal.observacoes || '';

        // Renderizar checkboxes com selecionados
        renderAllergenCheckboxes(meal.alergicos || []);

        // Atualizar UI
        document.getElementById('mealFormTitle').textContent = 'Editar Refeição';
        document.getElementById('mealSubmitBtn').textContent = 'Atualizar Refeição';
        document.getElementById('mealCancelBtn').classList.remove('hidden');

        // Scroll para o formulário
        document.getElementById('mealFormContainer').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('[Cardápio] Erro ao editar refeição:', err);
        alert('Erro ao carregar refeição: ' + err.message);
    }
}

// Excluir refeição
async function excluirRefeicao(id) {
    if (!confirm('Tem certeza que deseja excluir esta refeição?')) return;

    try {
        const csrfToken = Auth.getCsrfToken();
        const res = await Auth.apiCall(`/api/cardapio/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrfToken }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.erro || 'Erro ao excluir refeição');
        }

        await carregarCardapioDia();
        await carregarListaRefeicoesAdmin();
        alert('Refeição excluída com sucesso!');
    } catch (err) {
        console.error('[Cardápio] Erro ao excluir refeição:', err);
        alert('Erro: ' + err.message);
    }
}

// Resetar formulário
function resetarFormulario() {
    const form = document.getElementById('mealForm');
    if (form) form.reset();

    document.getElementById('mealId').value = '';
    document.getElementById('mealFormTitle').textContent = 'Nova Refeição';
    document.getElementById('mealSubmitBtn').textContent = 'Salvar Refeição';
    document.getElementById('mealCancelBtn').classList.add('hidden');

    // Re-renderizar checkboxes sem seleção
    renderAllergenCheckboxes([]);
}

// Carregar lista de refeições para admin
async function carregarListaRefeicoesAdmin() {
    const container = document.getElementById('mealListContainer');
    if (!container) return;

    try {
        const res = await Auth.apiCall('/api/cardapio/semana');
        if (!res.ok) throw new Error('Erro ao carregar refeições');

        const data = await res.json();
        if (!data.sucesso || !data.cardapio) {
            container.innerHTML = '<p class="empty-state-text">Erro ao carregar refeições</p>';
            return;
        }

        // Agrupar todas as refeições
        const todasRefeicoes = [];
        const diasLabels = {
            'segunda': 'Segunda-feira',
            'terca': 'Terça-feira',
            'quarta': 'Quarta-feira',
            'quinta': 'Quinta-feira',
            'sexta': 'Sexta-feira',
            'sabado': 'Sábado',
            'domingo': 'Domingo'
        };
        Object.entries(data.cardapio).forEach(([dia, refeicoes]) => {
            refeicoes.forEach(r => {
                r._diaLabel = diasLabels[dia] || dia;
                todasRefeicoes.push(r);
            });
        });

        if (todasRefeicoes.length === 0) {
            container.innerHTML = '<p class="empty-state-text">Nenhuma refeição cadastrada</p>';
            return;
        }

        container.innerHTML = todasRefeicoes.map(meal => `
            <div class="meal-list-item">
                <div class="meal-list-info">
                    <div class="meal-list-header">
                        <span class="meal-list-name">${escapeHtml(meal.nome)}</span>
                        <span class="meal-list-category ${meal.categoria}">${formatCategoria(meal.categoria)}</span>
                        <span class="meal-list-day">${meal._diaLabel}</span>
                        ${meal.horario ? `<span class="meal-list-time">${escapeHtml(meal.horario)}</span>` : ''}
                    </div>
                    <div class="meal-list-allergens">
                        ${(meal.alergicos || []).map(a => `
                            <span class="tag tag-amber" style="font-size: var(--gs-font-size-xs);">
                                ${escapeHtml(a)}
                            </span>
                        `).join('')}
                        ${(!meal.alergicos || meal.alergicos.length === 0) ? '<span class="tag tag-green" style="font-size: var(--gs-font-size-xs);">Sem alergênicos</span>' : ''}
                    </div>
                </div>
                <div class="meal-list-actions">
                    <button onclick="editarRefeicao(${meal.id})" class="btn-icon" aria-label="Editar refeição" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button onclick="excluirRefeicao(${meal.id})" class="btn-icon delete" aria-label="Excluir refeição" title="Excluir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar lista admin:', err);
        container.innerHTML = '<p class="empty-state-text">Erro ao carregar refeições</p>';
    }
}

// Alternar abas
function switchTab(tabId) {
    // Esconder todos os painéis
    document.querySelectorAll('.tab-panel').forEach(el => {
        el.hidden = true;
        el.classList.remove('active');
    });

    // Mostrar painel alvo
    const targetSection = document.getElementById(`tab-${tabId}`);
    if (targetSection) {
        targetSection.hidden = false;
        targetSection.classList.add('active');
    }

    // Atualizar navegação
    document.querySelectorAll('.menu-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Carregar dados específicos da aba
    if (tabId === 'weekly') {
        carregarCardapioSemanal();
    } else if (tabId === 'restrictions') {
        carregarRestricoesTab();
    } else if (tabId === 'settings' && currentUserRole === 'ADM') {
        carregarListaRefeicoesAdmin();
    }

    // Fechar sidebar no mobile
    closeSidebar();
}

// Carregar aba de restrições
async function carregarRestricoesTab() {
    const container = document.getElementById('restrictionsContent');
    if (!container) return;

    try {
        // Buscar alergias do usuário atual
        const res = await Auth.apiCall('/api/usuario/alergias');
        if (!res.ok) throw new Error('Erro ao carregar alergias');

        const data = await res.json();
        if (!data.sucesso) throw new Error('Erro ao carregar alergias');

        const userAlergias = data.alergias || [];

        if (currentUserRole === 'ALUNO') {
            // Aluno: mostra suas alergias
            container.innerHTML = `
                <section class="restriction-section">
                    <h3 class="restriction-section-title">Minhas Alergias e Restrições</h3>
                    ${userAlergias.length > 0 ? `
                        <div class="restriction-tags" role="list" aria-label="Alergias cadastradas">
                            ${userAlergias.map(a => `
                                <span class="restriction-tag allergy" role="listitem">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    ${escapeHtml(a)}
                                </span>
                            `).join('')}
                        </div>
                    ` : `
                        <p class="restriction-empty">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Nenhuma alergia cadastrada
                        </p>
                    `}
                    <p class="form-hint">Para adicionar ou remover alergias, acesse Configurações ou entre em contato com a administração.</p>
                </section>
            `;
        } else if (currentUserRole === 'PROFESSOR') {
            // Professor: visualização apenas
            container.innerHTML = `
                <section class="restriction-section">
                    <h3 class="restriction-section-title">Alergias dos Alunos</h3>
                    <div class="card">
                        <div class="placeholder-content">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <p>Visualização detalhada das alergias dos alunos será implementada em breve.</p>
                        </div>
                    </div>
                </section>
            `;
        } else {
            // Admin: gerenciar alergênicos
            container.innerHTML = `
                <section class="restriction-section">
                    <h3 class="restriction-section-title">Gerenciar Alergênicos do Sistema</h3>
                    <p class="form-hint">Lista de alergênicos disponíveis para marcação nos cardápios.</p>
                    <div class="restriction-tags" role="list" aria-label="Alergênicos do sistema">
                        ${allAllergens.map(a => `
                            <span class="restriction-tag" role="listitem">${escapeHtml(a)}</span>
                        `).join('')}
                    </div>
                    <p class="form-hint">Para adicionar novos alergênicos, edite a base de dados diretamente.</p>
                </section>
            `;
        }
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar restrições:', err);
        container.innerHTML = '<p class="empty-state-text">Erro ao carregar restrições</p>';
    }
}

// Fechar sidebar no mobile
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.hidden = true;
    if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
    }
}

// Toggle sidebar no mobile
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

// Inicializar eventos do sidebar
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.getElementById('hamburgerBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (hamburger) {
        hamburger.addEventListener('click', toggleSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Fechar sidebar ao clicar em link no mobile
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });
});

// Função utilitária para escape HTML
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
window.inicializarCardapio = inicializarCardapio;
window.switchTab = switchTab;
window.editarRefeicao = editarRefeicao;
window.excluirRefeicao = excluirRefeicao;
window.closeSidebar = closeSidebar;