/**
 * GoSchool – Sidebar builder (role based)
 * Inclua <aside id="sidebar"></aside> no HTML e chame GoSchoolSidebar.init({role:'admin'|'professor'|'aluno', active:'rota-atual'})
 */
const GoSchoolSidebar = (() => {
  const navConfig = {
    admin: [
      { href: '../Inicio/inicio.html', icon: 'fa-chart-pie', label: 'Início' },
      { href: '../Cardapio/cardapio.html', icon: 'fa-utensils', label: 'Cardápio e Ingredientes' },
      { href: '../Reservas/reservas.html', icon: 'fa-calendar-check', label: 'Reservas' },
      { href: '../Professor/index.html', icon: 'fa-users', label: 'Gestão de Usuários' },
      { href: '../Relatórios/rela.html', icon: 'fa-file-lines', label: 'Relatórios' },
      { href: '../Configuracoes/config.html', icon: 'fa-gear', label: 'Configurações' }
    ],
    professor: [
      { href: '../Inicio/inicio.html', icon: 'fa-chart-pie', label: 'Início' },
      { href: '../Cardapio/cardapio.html', icon: 'fa-utensils', label: 'Cardápio' },
      { href: '../Reservas/reservas.html', icon: 'fa-calendar-check', label: 'Reservas' },
      { href: '../Configuracoes/config.html', icon: 'fa-gear', label: 'Configurações' }
    ],
    aluno: [
      { href: '../Inicio/inicio.html', icon: 'fa-chart-pie', label: 'Início' },
      { href: '../Cardapio/cardapio.html', icon: 'fa-utensils', label: 'Cardápio' }
    ]
  };

  function buildSidebar({role = 'aluno', active = ''} = {}) {
    const container = document.getElementById('sidebar');
    if (!container) return;
    const items = navConfig[role] || navConfig.aluno;
    const userLabels = {
      admin: { name: 'Administrador', role: 'Coordenação Pedagógica' },
      professor: { name: 'Professor', role: 'Docente' },
      aluno: { name: 'Aluno', role: 'Estudante' }
    };
    const u = userLabels[role] || userLabels.aluno;

    let html = `
      <div class="sidebar-header">
        <div class="logo-mark">AH<span class="logo-cap"><i class="fa-solid fa-graduation-cap"></i></span></div>
        <span class="brand-title">GoSchool</span>
      </div>
      <nav class="sidebar-nav" role="navigation" aria-label="Menu principal">`;

    items.forEach(it => {
      const isActive = it.label === active || it.href.endsWith(active);
      html += `<a href="${it.href}" class="nav-item${isActive ? ' active' : ''}"${isActive ? ' aria-current="page"' : ''}>
        <i class="fa-solid ${it.icon}"></i>
        <span>${it.label}</span>
      </a>`;
    });

    html += `</nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar"><i class="fa-solid fa-user"></i></div>
          <div>
            <div class="user-name">${u.name}</div>
            <div class="user-role">${u.role}</div>
          </div>
        </div>
        <a href="../Login/login.html" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i>Sair</a>
      </div>`;

    container.innerHTML = html;
  }

  return { init: buildSidebar };
})();

// Auto-init se data-role presente
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const role = root.dataset.role || 'aluno';
  const active = root.dataset.active || '';
  GoSchoolSidebar.init({ role, active });
});