document.addEventListener('DOMContentLoaded', async () => {

    /* =====================================================
       1. SINCRONIZAÇÃO DE TAMANHO DE FONTE COM A API GLOBAL
    ===================================================== */
    const fontButtons = document.querySelectorAll('.font-control button');

    function updateFontUI(currentFont) {
        fontButtons.forEach(btn => {
            const fontType = btn.getAttribute('data-font');
            if (fontType === currentFont) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Inicializa o estado visual baseado nas preferências salvas
    const currentPrefs = window.GoSchoolPrefs.get();
    updateFontUI(currentPrefs.font);

    // Evento de clique nos botões de fonte
    fontButtons.forEach(button => {
        button.addEventListener('click', () => {
            const font = button.getAttribute('data-font');
            if (font) {
                window.GoSchoolPrefs.setFont(font); // Atualiza globalmente e salva
                updateFontUI(font);
            }
        });
    });

    /* =====================================================
       2. SINCRONIZAÇÃO DE TEMA COM A API GLOBAL
    ===================================================== */
    const themeButtons = document.querySelectorAll('.theme-control button');

    function updateThemeUI(currentTheme) {
        themeButtons.forEach(btn => {
            const themeType = btn.getAttribute('data-theme'); // Lê o data-theme ('claro' | 'escuro' | 'sistema')
            if (themeType === currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Inicializa o estado visual do tema com base nas preferências globais
    updateThemeUI(currentPrefs.theme);

    // Evento de clique nos botões de tema
    if (themeButtons.length > 0) {
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedTheme = btn.getAttribute('data-theme'); // Pega 'claro' | 'escuro' | 'sistema' do botão
                if (selectedTheme) {
                    window.GoSchoolPrefs.setTheme(selectedTheme); // Atualiza globalmente, salva no localStorage e aplica classes
                    updateThemeUI(selectedTheme);
                }
            });
        });
    }

    /* =====================================================
       3. GESTÃO DE PERFIL E ROTEAMENTO DINÂMICO DA SIDEBAR
       Agora usa o módulo Auth (cookie-based JWT) em vez de localStorage
    ===================================================== */

    // Aguardar autenticação estar pronta
    const user = Auth.getCurrentUser();
    if (!user) {
        // Se não autenticado, o Auth.init já redirecionou para login
        return;
    }

    const userRole = user.tipo || 'aluno';
    const userEmail = user.email || 'email@institucional.mg.gov.br';
    const userName = user.nome || 'Usuário';

    // Atualiza os rótulos visuais na página de configurações
    const roleLabel = document.getElementById("role-usuario-label");
    const currentRoleDisplay = document.getElementById("current-role-display");
    const userProfileTitle = document.getElementById("user-profile-title");
    const userEmailDisplay = document.getElementById("user-email-display");
    const linkInicio = document.getElementById("link-inicio");

    const roleLabels = {
        'aluno': 'Aluno',
        'professor': 'Professor',
        'adm': 'Administrador'
    };
    const roleDisplay = roleLabels[userRole] || userRole;

    if (roleLabel) roleLabel.textContent = roleDisplay.toUpperCase();
    if (currentRoleDisplay) currentRoleDisplay.textContent = roleDisplay;
    if (userProfileTitle) userProfileTitle.textContent = userName;
    if (userEmailDisplay) userEmailDisplay.textContent = userEmail;

    // Configura o link dinâmico "Início" com base no perfil logado
    if (linkInicio) {
        if (userRole === "aluno") {
            linkInicio.href = "/Aluno/";
        } else if (userRole === "professor") {
            linkInicio.href = "/Professor/";
        } else if (userRole === "adm") {
            linkInicio.href = "/adm/";
        } else {
            linkInicio.href = "/";
        }
    }

    // Exibe ou oculta elementos da sidebar com base nas permissões
    const linkReservas = document.getElementById("link-reservas");
    const linkUsuarios = document.getElementById("link-usuarios");
    const linkRelatorios = document.getElementById("link-relatorios");

    if (userRole === "aluno") {
        if (linkReservas) linkReservas.style.display = "none";
        if (linkUsuarios) linkUsuarios.style.display = "none";
        if (linkRelatorios) linkRelatorios.style.display = "none";
    } else if (userRole === "professor") {
        if (linkReservas) linkReservas.style.display = "block";
        if (linkUsuarios) linkUsuarios.style.display = "none";
        if (linkRelatorios) linkRelatorios.style.display = "none";
    } else if (userRole === "adm") {
        if (linkReservas) linkReservas.style.display = "block";
        if (linkUsuarios) linkUsuarios.style.display = "block";
        if (linkRelatorios) linkRelatorios.style.display = "block";
    }
});