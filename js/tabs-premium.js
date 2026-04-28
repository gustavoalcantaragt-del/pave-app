document.addEventListener('DOMContentLoaded', function() {
    const tabs = {
        'tab-dashboard': { section: 'aba-dashboard', title: 'Dashboard', subtitle: 'Visão geral do seu negócio' },
        'tab-balanco': { section: 'aba-balanco', title: 'Balanço Financeiro', subtitle: 'Lançamento de receitas e custos' },

        'tab-bills':     { section: 'aba-bills',      title: 'Contas a Pagar / Receber', subtitle: 'Vencimentos, recorrências e fluxo futuro' },
        'tab-catalogo':  { section: 'aba-catalogo',   title: 'Precificação de Serviços', subtitle: 'Calcule margens e custos por serviço' },
        'tab-relatorios':{ section: 'aba-relatorios', title: 'Relatórios',               subtitle: 'Exportação e análise de dados' },
        'tab-simulacao': { section: 'aba-simulacao',  title: 'Simulador Financeiro',     subtitle: 'What-If, regime tributário, crescimento e custo CLT' },
        'tab-calendario':{ section: 'aba-calendario', title: 'Calendário Financeiro',    subtitle: 'Visualização de receitas e despesas por dia' },
        'tab-config':    { section: 'aba-config',     title: 'Configurações',            subtitle: 'Perfil da clínica, divisão do lucro e dados de demonstração' }
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

            if (tabId === 'tab-balanco' && window.fillBalancoForm) {
                try {
                    const saved = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
                    if (saved) window.fillBalancoForm(saved);
                } catch {}
            }

            if (tabId === 'tab-catalogo' && window.renderCatalogo) window.renderCatalogo();
            if (tabId === 'tab-simulacao') {
                const active = window._simTabActive || 'whatif';
                if (active === 'whatif' && window.runSimulation) window.runSimulation();
                if (active === 'crescimento') {
                    const c = document.getElementById('sim-cresc-container');
                    if (c && !c.dataset.initialized && window.SimuladorCrescimentoModule) {
                        c.dataset.initialized = 'true'; SimuladorCrescimentoModule.render(c);
                    }
                }
                if (active === 'tributario') {
                    const c = document.getElementById('sim-trib-container');
                    if (c && !c.dataset.initialized && window.SimuladorTributarioModule) {
                        c.dataset.initialized = 'true'; SimuladorTributarioModule.render(c);
                    }
                }
            }
            if (tabId === 'tab-bills' && window.renderBills) window.renderBills();
            if (tabId === 'tab-relatorios' && window.renderRelatorios) window.renderRelatorios();
            if (tabId === 'tab-config' && window.renderConfig) window.renderConfig();
            if (tabId === 'tab-calendario' && window.renderCalendario && !targetSection?.dataset.calInit) {
                targetSection.dataset.calInit = '1';
                window.renderCalendario(targetSection);
            }
        });
    });
});
