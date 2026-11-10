/**
 * AmaralHub - Cardápio JavaScript
 * Funcionalidades: Upload de planilha, edição de refeições, interações UI
 */

// ==========================================================================
// UPLOAD DE PLANILHA EXCEL
// ==========================================================================

function processarPlanilhaExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validação de extensão
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    alert('Erro: Apenas planilhas no formato .xlsx são aceitas pelo parser Python.');
    document.getElementById('excelFileInput').value = '';
    return;
  }

  const statusUpload = document.getElementById('statusUpload');
  const loadingFila = document.getElementById('loadingFila');
  const btnUpload = document.querySelector('.btn-upload');

  // Feedback visual
  statusUpload.textContent = `Arquivo: "${file.name}"`;
  loadingFila.classList.remove('hidden');
  btnUpload.disabled = true;
  btnUpload.style.opacity = '0.6';

  // Simula processamento via Python (substituir por chamada real à API)
  setTimeout(() => {
    loadingFila.classList.add('hidden');
    btnUpload.disabled = false;
    btnUpload.style.opacity = '1';

    const sucesso = Math.random() > 0.1; // 90% sucesso para demo
    if (sucesso) {
      alert(`Sucesso: Planilha "${file.name}" processada via Python e persistida no MongoDB!`);
      statusUpload.textContent = `✓ Planilha "${file.name}" processada com sucesso`;
      statusUpload.style.color = '#166534';
    } else {
      alert(`Erro: Falha ao processar a planilha "${file.name}". Verifique o formato e tente novamente.`);
      statusUpload.textContent = `✗ Erro ao processar "${file.name}"`;
      statusUpload.style.color = '#991b1b';
    }
  }, 2000);
}

// ==========================================================================
// EDIÇÃO DE REFEIÇÕES
// ==========================================================================

function editarRefeicao(dia) {
  // Em produção, abrir modal ou redirecionar para página de edição
  console.log(`Editando cardápio de: ${dia}`);

  // Exemplo de implementação futura:
  // const modal = document.getElementById('modal-editar');
  // modal.dataset.dia = dia;
  // modal.classList.remove('hidden');
  // preencherFormularioEdicao(dia);

  alert(`Abrindo editor para: ${dia}\n\n[Em desenvolvimento: Modal de edição com formulário de refeições, alergênicos e valores nutricionais]`);
}

// ==========================================================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Reset do input de arquivo ao clicar no botão (permite selecionar o mesmo arquivo novamente)
  const btnUpload = document.querySelector('.btn-upload');
  const fileInput = document.getElementById('excelFileInput');

  if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => {
      fileInput.value = '';
    });
  }

  // Animação de entrada dos cards
  const mealCards = document.querySelectorAll('.meal-card');
  mealCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 * index);
  });

  // Tooltip simples para tags de alergênicos
  const tags = document.querySelectorAll('.tag-red, .tag-amber');
  tags.forEach(tag => {
    tag.style.cursor = 'help';
  });

  console.log('AmaralHub Cardápio inicializado com sucesso');
});

// ==========================================================================
// UTILITÁRIOS
// ==========================================================================

/**
 * Formata data para exibição
 * @param {Date} date - Data a formatar
 * @returns {string} Data formatada em pt-BR
 */
function formatarData(date = new Date()) {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Valida se o arquivo é .xlsx
 * @param {File} file - Arquivo a validar
 * @returns {boolean}
 */
function validarArquivoExcel(file) {
  return file && file.name.toLowerCase().endsWith('.xlsx');
}