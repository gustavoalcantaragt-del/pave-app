document.addEventListener('DOMContentLoaded', function() {
    const tabs = {
        'tab-dashboard': { section: 'aba-dashboard', title: 'Dashboard', subtitle: 'Visão geral do seu negócio' },
        'tab-caixa': { section: 'aba-caixa', title: 'Caixa Diário', subtitle: 'Lançamentos de contas a pagar e receber' },
        'tab-balanco': { section: 'aba-balanco', title: 'Balanço Financeiro', subtitle: 'Lançamento de receitas e custos' },

        'tab-catalogo': { section: 'aba-catalogo', title: 'Precificação de Serviços', subtitle: 'Calcule margens e custos por serviço' },
        'tab-relatorios': { section: 'aba-relatorios', title: 'Relatórios', subtitle: 'Exportação e análise de dados' },
        'tab-simulacao': { section: 'aba-simulacao', title: 'Simulador de Cenários', subtitle: 'Projeções financeiras What-If' },
        'tab-config':    { section: 'aba-config',    title: 'Configurações',          subtitle: 'Perfil da clínica, divisão do lucro e dados de demonstração' }
    };

    const buttons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('main section');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const mobileTitle = document.getElementById('mobile-page-title');

    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.id;
            if (!tabs[tabId] || tabId === 'btn-logout') return;

            // Update UI
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            sections.forEach(s => s.style.display = 'none');
            const targetSection = document.getElementById(tabs[tabId].section);
            if (targetSection) targetSection.style.display = 'block';

            pageTitle.innerText = tabs[tabId].title;
            pageSubtitle.innerText = tabs[tabId].subtitle;
            if (mobileTitle) mobileTitle.textContent = tabs[tabId].title;

            // Dynamic logic
            if (tabId === 'tab-dashboard' && window.renderDashboard) window.renderDashboard();

            if (tabId === 'tab-caixa' && window.renderCaixa) window.renderCaixa();
            if (tabId === 'tab-catalogo' && window.renderCatalogo) window.renderCatalogo();
            if (tabId === 'tab-simulacao' && window.runSimulation) window.runSimulation();
            if (tabId === 'tab-relatorios' && window.renderRelatorios) window.renderRelatorios();
            if (tabId === 'tab-config' && window.renderConfig) window.renderConfig();
        });
    });
});
