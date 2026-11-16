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

    // Configurar formulário admin se for admin
    if (currentUserRole === 'ADM') {
        configurarFormularioAdmin();
        await carregarListaRefeicoesAdmin();
    }
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
            <div class="col-span-full text-center py-12">
                <i class="fa-solid fa-utensils text-4xl text-slate-300 mb-3"></i>
                <p class="text-slate-500">Nenhum cardápio disponível para hoje.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = cardapio.map((meal, index) => {
        // Verificar alerta de alergia para alunos
        const hasAlertaAlergia = meal.alertaAlergia === true;
        const isAluno = currentUserRole === 'ALUNO';

        // Determinar classe do badge de alergênicos
        let allergenBadgeHtml = '';
        if (meal.alergicos && meal.alergicos.length > 0) {
            if (hasAlertaAlergia && isAluno) {
                // Alerta vermelho para aluno com alergia
                allergenBadgeHtml = `
                    <div class="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase animate-pulse">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>⚠ ALERGIA: ${meal.alergicos.join(', ')}</span>
                    </div>
                `;
            } else {
                // Badge normal para alergênicos
                allergenBadgeHtml = `
                    <div class="inline-flex items-center gap-1.5 bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">
                        <i class="fa-solid fa-exclamation-triangle"></i>
                        <span>CONTÉM: ${meal.alergicos.join(', ')}</span>
                    </div>
                `;
            }
        } else {
            allergenBadgeHtml = `
                <div class="inline-flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">
                    <i class="fa-solid fa-check"></i>
                    <span>SEM ALERGÊNICOS DECLARADOS</span>
                </div>
            `;
        }

        // Botões admin (apenas para ADM)
        let adminButtons = '';
        if (currentUserRole === 'ADM') {
            adminButtons = `
                <div class="flex gap-2 pt-3 border-t border-slate-100">
                    <button onclick="editarRefeicao(${meal.id})" class="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        <i class="fa-solid fa-pen mr-1"></i>Editar
                    </button>
                    <button onclick="excluirRefeicao(${meal.id})" class="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors text-sm">
                        <i class="fa-solid fa-trash mr-1"></i>Excluir
                    </button>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between ${hasAlertaAlergia && isAluno ? 'ring-2 ring-red-400' : ''}">
                <div>
                    <!-- Imagem do Prato -->
                    <div class="h-44 w-full bg-slate-100 overflow-hidden relative">
                        <img src="${meal.imagem || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}" alt="${meal.nome || 'Refeição'}" class="w-full h-full object-cover">
                        ${hasAlertaAlergia && isAluno ? '<div class="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full"><i class="fa-solid fa-triangle-exclamation mr-1"></i>ALERTA</div>' : ''}
                    </div>

                    <div class="p-5 space-y-3">
                        <!-- Horário e Tipo -->
                        <div class="flex items-center text-xs text-slate-500 font-semibold gap-1">
                            <i class="fa-regular fa-clock text-slate-400"></i>
                            <span class="text-slate-800 font-bold">${formatCategoria(meal.categoria || meal.tipo_refeicao || 'Refeição')}</span>
                            <span class="ml-auto text-slate-400 font-normal">${meal.horario || ''}</span>
                        </div>

                        <!-- Título e Descrição -->
                        <div>
                            <h3 class="text-sm font-extrabold text-slate-900">${meal.nome || 'Prato do Dia'}</h3>
                            <p class="text-[11px] text-slate-500 mt-1 leading-relaxed">${meal.descricao || ''}</p>
                        </div>

                        <!-- Informação Nutricional -->
                        <div class="flex items-center gap-3 text-xs text-slate-600 font-medium pt-1">
                            <i class="fa-regular fa-droplet text-slate-400 text-xs"></i>
                            <span>Kcal: ${meal.calorias || meal.kcal || '-'}</span>
                            <span>Prot: ${meal.proteina || meal.protein || '-'}</span>
                            <span>Cart: ${meal.carboidrato || meal.carb || '-'}</span>
                        </div>

                        <!-- Alertas e Alergênicos -->
                        <div class="pt-1 space-y-1.5">
                            ${allergenBadgeHtml}
                            ${meal.observacoes ? `
                                <p class="text-[11px] text-slate-500 font-medium">
                                    ${meal.observacoes}
                                </p>
                            ` : ''}
                        </div>
                    </div>
                </div>
                ${adminButtons}
            </div>
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

    // Obter dia atual (0 = domingo, 1 = segunda...)
    const hoje = new Date().getDay();
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaAtual = diasSemana[hoje];

    let html = '';

    diasOrdem.forEach(dia => {
        const refeicoes = cardapioSemanal[dia] || [];
        const isHoje = dia === diaAtual;

        if (refeicoes.length === 0) {
            html += `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${isHoje ? 'ring-2 ring-blue-500' : ''}">
                    <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 ${isHoje ? 'text-blue-600' : ''}">
                        <i class="fa-solid fa-calendar-day"></i>
                        ${diasLabels[dia]} ${isHoje ? '<span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">HOJE</span>' : ''}
                    </h3>
                    <p class="text-slate-500 text-center py-8">Nenhuma refeição programada</p>
                </div>
            `;
            return;
        }

        html += `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${isHoje ? 'ring-2 ring-blue-500' : ''}">
                <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4 ${isHoje ? 'text-blue-600' : ''}">
                    <i class="fa-solid fa-calendar-day"></i>
                    ${diasLabels[dia]} ${isHoje ? '<span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">HOJE</span>' : ''}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        `;

        refeicoes.forEach(meal => {
            const hasAlertaAlergia = meal.alertaAlergia === true;
            const isAluno = currentUserRole === 'ALUNO';

            let allergenBadgeHtml = '';
            if (meal.alergicos && meal.alergicos.length > 0) {
                if (hasAlertaAlergia && isAluno) {
                    allergenBadgeHtml = `
                        <div class="inline-flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded uppercase">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <span>⚠ ${meal.alergicos.join(', ')}</span>
                        </div>
                    `;
                } else {
                    allergenBadgeHtml = `
                        <div class="inline-flex items-center gap-1 bg-amber-600 text-white text-[9px] font-bold px-2 py-1 rounded uppercase">
                            <i class="fa-solid fa-exclamation-triangle"></i>
                            <span>${meal.alergicos.join(', ')}</span>
                        </div>
                    `;
                }
            } else {
                allergenBadgeHtml = `
                    <div class="inline-flex items-center gap-1 bg-green-600 text-white text-[9px] font-bold px-2 py-1 rounded uppercase">
                        <i class="fa-solid fa-check"></i>
                        <span>Sem alergênicos</span>
                    </div>
                `;
            }

            let adminButtons = '';
            if (currentUserRole === 'ADM') {
                adminButtons = `
                    <div class="flex gap-1 pt-2 border-t border-slate-100">
                        <button onclick="editarRefeicao(${meal.id})" class="flex-1 bg-blue-600 text-white font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs">
                            <i class="fa-solid fa-pen mr-1"></i>Editar
                        </button>
                        <button onclick="excluirRefeicao(${meal.id})" class="flex-1 bg-red-600 text-white font-semibold py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs">
                            <i class="fa-solid fa-trash mr-1"></i>Excluir
                        </button>
                    </div>
                `;
            }

            html += `
                <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col ${hasAlertaAlergia && isAluno ? 'ring-2 ring-red-400' : ''}">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="font-bold text-slate-900 text-sm">${meal.nome || 'Refeição'}</h4>
                        <span class="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded">${formatCategoria(meal.categoria)}</span>
                    </div>
                    <p class="text-xs text-slate-500 mb-2 flex-1">${meal.descricao || ''}</p>
                    <div class="flex items-center gap-2 text-xs text-slate-600 mb-2">
                        <span>${meal.horario || ''}</span>
                        <span>•</span>
                        <span>${meal.calorias || '-'} kcal</span>
                    </div>
                    <div class="mb-2">
                        ${allergenBadgeHtml}
                    </div>
                    ${adminButtons}
                </div>
            `;
        });

        html += `
                </div>
            </div>
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
        <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="alergicos" value="${alergia}" class="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" ${selected.includes(alergia) ? 'checked' : ''}>
            <span class="text-sm text-slate-700">${alergia}</span>
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
            container.innerHTML = '<p class="text-slate-500 p-4 text-center">Erro ao carregar refeições</p>';
            return;
        }

        // Agrupar todas as refeições
        const todasRefeicoes = [];
        Object.values(data.cardapio).forEach(refeicoes => {
            refeicoes.forEach(r => todasRefeicoes.push(r));
        });

        if (todasRefeicoes.length === 0) {
            container.innerHTML = '<p class="text-slate-500 p-4 text-center">Nenhuma refeição cadastrada</p>';
            return;
        }

        container.innerHTML = todasRefeicoes.map(meal => `
            <div class="p-4 hover:bg-slate-50 flex items-center justify-between gap-4">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900 truncate">${meal.nome}</span>
                        <span class="text-xs text-slate-500 px-2 py-0.5 bg-slate-100 rounded whitespace-nowrap">${formatCategoria(meal.categoria)}</span>
                        <span class="text-xs text-slate-400">${diasLabels[meal.dia_semana] || meal.dia_semana}</span>
                        <span class="text-xs text-slate-400">${meal.horario || ''}</span>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-1">
                        ${(meal.alergicos || []).map(a => `
                            <span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">${a}</span>
                        `).join('')}
                        ${(!meal.alergicos || meal.alergicos.length === 0) ? '<span class="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Sem alergênicos</span>' : ''}
                    </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button onclick="editarRefeicao(${meal.id})" class="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                        <i class="fa-solid fa-pen mr-1"></i>Editar
                    </button>
                    <button onclick="excluirRefeicao(${meal.id})" class="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                        <i class="fa-solid fa-trash mr-1"></i>Excluir
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar lista admin:', err);
        container.innerHTML = '<p class="text-red-500 p-4 text-center">Erro ao carregar refeições</p>';
    }
}

// Dias da semana labels (global para uso nas funções)
const diasLabels = {
    'segunda': 'Segunda-feira',
    'terca': 'Terça-feira',
    'quarta': 'Quarta-feira',
    'quinta': 'Quinta-feira',
    'sexta': 'Sexta-feira',
    'sabado': 'Sábado',
    'domingo': 'Domingo'
};


// Alternar abas do menu lateral
function switchTab(tabId) {
    document.querySelectorAll('main section').forEach(el => el.classList.add('hidden'));
    const targetSection = document.getElementById(`tab-${tabId}`);
    if (targetSection) targetSection.classList.remove('hidden');

    document.querySelectorAll('nav button, nav a').forEach(btn => {
        btn.className = "w-full flex items-center gap-3 px-4 py-2.5 text-xs text-white hover:bg-white/10 rounded-xl";
    });

    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
        activeNav.className = "w-full flex items-center gap-3 px-4 py-2.5 text-xs rounded-xl sidebar-item-active";
    }

    // Carregar dados específicos da aba
    if (tabId === 'weekly') {
        carregarCardapioSemanal();
    } else if (tabId === 'restrictions') {
        carregarRestricoesTab();
    } else if (tabId === 'settings' && currentUserRole === 'ADM') {
        carregarListaRefeicoesAdmin();
    }
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
            // Aluno: mostra suas alergias e permite gerenciar
            container.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Minhas Alergias e Restrições</h3>
                    ${userAlergias.length > 0 ? `
                        <div class="space-y-2 mb-6">
                            <p class="text-sm text-slate-700">Você possui as seguintes alergias cadastradas:</p>
                            <div class="flex flex-wrap gap-2">
                                ${userAlergias.map(a => `
                                    <span class="bg-red-100 text-red-800 text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <i class="fa-solid fa-triangle-exclamation"></i>
                                        ${a}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="text-center py-8">
                            <i class="fa-solid fa-check-circle text-4xl text-green-500 mb-3"></i>
                            <p class="text-slate-500">Nenhuma alergia cadastrada</p>
                        </div>
                    `}
                    <p class="text-xs text-slate-500">Para adicionar ou remover alergias, entre em contato com a administração.</p>
                </div>
            `;
        } else if (currentUserRole === 'PROFESSOR') {
            // Professor: visualização apenas
            container.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Alergias dos Alunos</h3>
                    <p class="text-slate-500 mb-4">A visualização detalhada das alergias dos alunos será implementada em breve.</p>
                    <p class="text-xs text-slate-500">Esta funcionalidade permitirá ver quais alunos têm restrições alimentares para planejamento de atividades.</p>
                </div>
            `;
        } else {
            // Admin: gerenciar alergias
            container.innerHTML = `
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-4">Gerenciar Alergênicos do Sistema</h3>
                    <p class="text-slate-500 mb-4">Lista de alergênicos disponíveis para marcação nos cardápios.</p>
                    <div class="flex flex-wrap gap-2">
                        ${allAllergens.map(a => `
                            <span class="bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-full">${a}</span>
                        `).join('')}
                    </div>
                    <p class="text-xs text-slate-500 mt-4">Para adicionar novos alergênicos, edite a base de dados diretamente.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('[Cardápio] Erro ao carregar restrições:', err);
        container.innerHTML = '<p class="text-red-500 p-4">Erro ao carregar restrições</p>';
    }
}

// Fechar Modal
function close403Modal() {
    const modal = document.getElementById('modal403');
    if (modal) modal.classList.add('hidden');
}

// Exportar para uso global
window.inicializarCardapio = inicializarCardapio;
window.switchTab = switchTab;
window.close403Modal = close403Modal;
window.editarRefeicao = editarRefeicao;
window.excluirRefeicao = excluirRefeicao;