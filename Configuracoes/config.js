document.addEventListener('DOMContentLoaded', () => {

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
    const currentPrefs = window.AmaralPrefs.get();
    updateFontUI(currentPrefs.font);

    // Evento de clique nos botões de fonte
    fontButtons.forEach(button => {
        button.addEventListener('click', () => {
            const font = button.getAttribute('data-font');
            if (font) {
                window.AmaralPrefs.setFont(font); // Atualiza globalmente e salva
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
            const themeType = btn.getAttribute('data-theme'); // Lê o data-theme ('light' ou 'dark')
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
                const selectedTheme = btn.getAttribute('data-theme'); // Pega 'light' ou 'dark' do botão
                if (selectedTheme) {
                    window.AmaralPrefs.setTheme(selectedTheme); // Atualiza globalmente, salva no localStorage e aplica classes
                    updateThemeUI(selectedTheme);
                }
            });
        });
    }

    /* =====================================================
       3. GESTÃO DE PERFIL E ROTEAMENTO DINÂMICO DA SIDEBAR
    ===================================================== */
    const userRole = localStorage.getItem("userRole") || "aluno";
    const userEmail = localStorage.getItem("userEmail") || "email@institucional.mg.gov.br";

    // Atualiza os rótulos visuais na página de configurações
    const roleLabel = document.getElementById("role-usuario-label");
    const currentRoleDisplay = document.getElementById("current-role-display");
    const userProfileTitle = document.getElementById("user-profile-title");
    const userEmailDisplay = document.getElementById("user-email-display");
    const linkInicio = document.getElementById("link-inicio");

    if (roleLabel) roleLabel.textContent = userRole.toUpperCase();
    if (currentRoleDisplay) currentRoleDisplay.textContent = userRole;
    if (userProfileTitle) userProfileTitle.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    if (userEmailDisplay) userEmailDisplay.textContent = userEmail;

    // Configura o link dinâmico "Início" com base no perfil logado
    if (linkInicio) {
        if (userRole === "aluno") {
            linkInicio.href = "/Aluno/";
        } else if (userRole === "professor") {
            linkInicio.href = "/Professor/";
        } else if (userRole === "adm" || userRole === "administrador") {
            linkInicio.href = "/adm/";
        } else {
            linkInicio.href = "/";
        }
    }

    // Exibe ou oculta elementos da sidebar com base nas permissões (Stakeholders / Requisitos)
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
    } else if (userRole === "adm" || userRole === "administrador") {
        if (linkReservas) linkReservas.style.display = "block";
        if (linkUsuarios) linkUsuarios.style.display = "block";
        if (linkRelatorios) linkRelatorios.style.display = "block";
    }
});