// utils-premium.js
const Utils = {
    // Sistema de Notificações (Toasts)
    showToast(message, type = 'info') {
        // Normaliza tipo: 'error' → 'error', 'success' → 'success', resto → 'info'
        const cssType = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
        const toast = document.createElement('div');
        toast.className = `toast toast-${cssType}`;
        toast.innerHTML = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(120%)';
            toast.style.transition = 'all 0.35s ease-out';
            setTimeout(() => toast.remove(), 350);
        }, 3500);
    },

    // Modal de Confirmação (substitui confirm() nativo)
    confirm(message, title = 'Confirmar ação', onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'pav-confirm-overlay';
        overlay.innerHTML = `
            <div class="pav-confirm-box">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="pav-confirm-actions">
                    <button id="pav-confirm-cancel" class="btn-secondary" style="padding:0.6rem 1.2rem; font-size:0.85rem;">Cancelar</button>
                    <button id="pav-confirm-ok" class="btn-danger" style="padding:0.6rem 1.2rem; font-size:0.85rem;">Excluir</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 200); };
        overlay.querySelector('#pav-confirm-cancel').addEventListener('click', close);
        overlay.querySelector('#pav-confirm-ok').addEventListener('click', () => { close(); onConfirm(); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    },

    // Adiciona/remove estado de loading em um botão
    setLoading(btn, loading) {
        if (loading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.classList.add('btn-loading');
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    },

    // Exportar Relatório em PDF
    exportPDF() {
        const data = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
        if (!data) return this.showToast('Nenhum dado para exportar. Preencha o Balanço primeiro.', 'error');
        const totais = window.calcularTotais ? window.calcularTotais(data) : {};
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        let y = 20;
        const ln = (text, size = 10, bold = false) => { doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(text, 14, y); y += size * 0.5 + 2; };
        const row = (label, value) => { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(label, 14, y); doc.text(String(value), 120, y); y += 6; };

        const brandNome = localStorage.getItem('pav_brand_nome') || 'P.A.V. Premium';
        const brandResp = localStorage.getItem('pav_brand_resp') || '';
        
        doc.setTextColor(218, 165, 32); // accent gold
        ln(brandNome, 20, true);
        doc.setTextColor(0, 0, 0); // back to black
        if (brandResp) { ln(brandResp, 11, false); y += 2; }
        
        y += 4;
        ln('Relatório Financeiro Gerencial', 15, true);
        ln(`Referência do Período: ${data.mesReferencia || 'N/A'}`, 10); y += 4;

        ln('RECEITA', 13, true);
        row('Faturamento Real', fmt(data.faturamento));
        row('Meta de Faturamento', fmt(data.metaFaturamento));
        row('Meta de Lucro Gerencial', fmt(data.metaLucro)); y += 4;

        ln('CUSTOS VARIÁVEIS', 13, true);
        row('Reembolso/Inadimplência', fmt(data.reembolsoInadimplencia));
        row('Impostos', fmt(data.impostos));
        row('Taxas de Cartão', fmt(data.taxasCartao));
        row('Insumos Diários', fmt(data.insumos));
        row('Boletos Fornecedores', fmt(data.boletosFornecedores));
        row('Serviços Terceirizados (Var)', fmt(data.terceirizadosVar));
        row('Lab. Terceirizado', fmt(data.labTerceirizado));
        row('Comissões', fmt(data.comissoes));
        row('Plantões', fmt(data.plantoes));
        row('Escritório/Limpeza (Var)', fmt(data.escritorioLimpezaVar));
        row('Estorno', fmt(data.estorno));
        row('Outros Variáveis', fmt(data.outrosVariaveis));
        row('TOTAL VARIÁVEIS', fmt(totais.totalVariaveis)); y += 4;

        ln('CUSTOS FIXOS', 13, true);
        row('Folha de Pagamento', fmt(data.folha));
        row('Água', fmt(data.agua));
        row('Luz', fmt(data.luz));
        row('Sistemas', fmt(data.sistemas));
        row('Aluguel', fmt(data.aluguel));
        row('Telecom', fmt(data.telecom));
        row('Contabilidade', fmt(data.contabilidade));
        row('Marketing', fmt(data.marketing));
        row('E-Social', fmt(data.esocial));
        row('Taxas Admin', fmt(data.taxasAdmin));
        row('CRMV', fmt(data.crmv));
        row('Lixo Contaminante', fmt(data.lixoContaminante));
        row('IPTU', fmt(data.iptu));
        row('Limpeza Fixa', fmt(data.limpezaFixa));
        row('Terceirizados Fixos', fmt(data.terceirizadosFixos));
        row('Outros Fixos', fmt(data.outrosFixos));
        row('TOTAL FIXOS', fmt(totais.totalFixos)); y += 6;

        // New page for results
        doc.addPage(); y = 20;
        ln('RESULTADO', 16, true);
        row('Margem de Contribuição', fmt(totais.margemContribuicao));
        row('Lucro Gerencial', fmt(totais.lucroGerencial));
        const fat = data.faturamento || 1;
        row('Margem de Lucro', ((totais.lucroGerencial / fat) * 100).toFixed(1) + '%');
        row('% Custo Fixo', ((totais.totalFixos / fat) * 100).toFixed(1) + '%');
        const mc = totais.margemContribuicao / fat;
        row('Ponto de Equilíbrio', mc > 0 ? fmt(totais.totalFixos / mc) : 'N/A'); y += 6;

        ln('DIVISÃO IDEAL DO LUCRO', 13, true);
        row('Pró-labore (50%)', fmt(totais.lucroGerencial * 0.5));
        row('Empréstimos (0%)', fmt(0));
        row('Investimentos (30%)', fmt(totais.lucroGerencial * 0.3));
        row('Reserva de Caixa (20%)', fmt(totais.lucroGerencial * 0.2));

        doc.save(`PAV_Relatorio_${data.mesReferencia || 'geral'}.pdf`);
        this.showToast('PDF exportado com sucesso!', 'success');
    },

    // Exportar dados em Excel
    exportExcel() {
        const data = JSON.parse(localStorage.getItem('pav_ultimos_dados'));
        if (!data) return this.showToast('Nenhum dado para exportar. Preencha o Balanço primeiro.', 'error');
        const totais = window.calcularTotais ? window.calcularTotais(data) : {};
        const historico = JSON.parse(localStorage.getItem('pav_historico') || '[]');

        // Sheet 1: Balanço Atual
        const balancoRows = [
            ['P.A.V. — Balanço Financeiro'],
            ['Referência', data.mesReferencia || 'N/A'], [],
            ['RECEITA'], ['Faturamento Real', data.faturamento], ['Meta Faturamento', data.metaFaturamento || 0], ['Meta Lucro', data.metaLucro || 0], [],
            ['CUSTOS VARIÁVEIS'],
            ['Reembolso/Inadimplência', data.reembolsoInadimplencia], ['Impostos', data.impostos], ['Taxas Cartão', data.taxasCartao],
            ['Insumos Diários', data.insumos], ['Boletos Fornecedores', data.boletosFornecedores], ['Terceirizados (Var)', data.terceirizadosVar],
            ['Lab. Terceirizado', data.labTerceirizado], ['Comissões', data.comissoes], ['Plantões', data.plantoes],
            ['Escritório/Limpeza (Var)', data.escritorioLimpezaVar], ['Estorno', data.estorno], ['Outros Variáveis', data.outrosVariaveis],
            ['TOTAL VARIÁVEIS', totais.totalVariaveis], [],
            ['CUSTOS FIXOS'],
            ['Folha de Pagamento', data.folha], ['Água', data.agua], ['Luz', data.luz], ['Sistemas', data.sistemas],
            ['Aluguel', data.aluguel], ['Telecom', data.telecom], ['Contabilidade', data.contabilidade], ['Marketing', data.marketing],
            ['E-Social', data.esocial], ['Taxas Admin', data.taxasAdmin], ['CRMV', data.crmv],
            ['Lixo Contaminante', data.lixoContaminante], ['IPTU', data.iptu], ['Limpeza Fixa', data.limpezaFixa],
            ['Terceirizados Fixos', data.terceirizadosFixos], ['Outros Fixos', data.outrosFixos],
            ['TOTAL FIXOS', totais.totalFixos], [],
            ['RESULTADO'],
            ['Margem de Contribuição', totais.margemContribuicao],
            ['Lucro Gerencial', totais.lucroGerencial],
            ['Margem de Lucro (%)', ((totais.lucroGerencial / (data.faturamento || 1)) * 100).toFixed(1)],
            ['% Custo Fixo', ((totais.totalFixos / (data.faturamento || 1)) * 100).toFixed(1)]
        ];

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.aoa_to_sheet(balancoRows);
        ws1['!cols'] = [{ wch: 28 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Balanço');

        // Sheet 2: Histórico
        if (historico.length > 0) {
            const histRows = [['Mês', 'Faturamento', 'Lucro', 'Data Registro']];
            historico.forEach(h => histRows.push([h.label || h.mesRef, h.faturamento || 0, h.lucro || 0, h.date || '']));
            const ws2 = XLSX.utils.aoa_to_sheet(histRows);
            ws2['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 22 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Histórico');
        }

        // Sheet 3: Serviços Salvos
        const servicos = JSON.parse(localStorage.getItem('pav_servicos') || '[]');
        if (servicos.length > 0) {
            const servRows = [['Serviço', 'Preço', 'Custo Total', 'Lucro', 'Margem (%)']];
            servicos.forEach(s => servRows.push([s.nome, s.preco, s.custoTotal, s.lucro, s.margem]));
            const ws3 = XLSX.utils.aoa_to_sheet(servRows);
            ws3['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws3, 'Serviços');
        }

        XLSX.writeFile(wb, `PAV_Balanco_${data.mesReferencia || 'geral'}.xlsx`);
        this.showToast('Excel exportado com sucesso!', 'success');
    },

    // Sistema de Onboarding (Tutorial)
    initOnboarding() {
        if (localStorage.getItem('pav_onboarding_done')) return;

        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-card">
                <h1 style="color:var(--accent-secondary); margin-bottom:1rem;">Bem-vindo ao P.A.V. Premium</h1>
                <p style="margin-bottom:2rem; color:var(--text-muted);">Transformamos sua gestão financeira com um design de alta performance e ferramentas profissionais relatadas em conformidade com o formato Excel.</p>
                <div style="text-align:left; margin-bottom:2rem; font-size:0.95rem; line-height:1.6;">
                    <p><b style="color:var(--accent-gold);">Barra Lateral:</b> Utilize o menu à esquerda para navegar entre as análises.</p>
                    <p><b style="color:var(--accent-gold);">Simulações:</b> Descubra seu ponto de equilíbrio na aba de projeções.</p>
                    <p><b style="color:var(--accent-gold);">Relatórios:</b> Exporte os dados em PDF ou nativamente para planilhas e direções.</p>
                </div>
                <button class="btn-primary" style="width:100%;" onclick="Utils.closeOnboarding()">Explorar agora</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    closeOnboarding() {
        localStorage.setItem('pav_onboarding_done', 'true');
        document.querySelector('.onboarding-overlay').remove();
        this.showToast('Bem-vindo. Explore suas finanças.', 'success');
    }
};

// Add standard animation keyframes to document
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
window.Utils = Utils;

// ── SEÇÕES COLAPSÍVEIS ─────────────────────────────────────────────────────
window.pavToggle = function(header) {
    const icon = header.querySelector('.collapse-icon');
    const body = header.nextElementSibling;
    if (!body) return;
    const collapsed = body.classList.toggle('collapsed');
    if (icon) icon.classList.toggle('rotated', collapsed);
};

// ── FORMATAÇÃO MONETÁRIA ───────────────────────────────────────────────────
window.formatMoney = function(value) {
    const num = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.parseMoney = function(str) {
    return parseFloat(String(str).replace(/\./g, '').replace(',', '.')) || 0;
};

document.addEventListener('DOMContentLoaded', () => {
    // ── RASCUNHO DO BALANÇO ──────────────────────────────────────────────
    const balancoForm = document.getElementById('balancoForm');
    if (balancoForm) {
        const draft = JSON.parse(localStorage.getItem('pav_balanco_draft') || '{}');
        for (const [key, val] of Object.entries(draft)) {
            const input = document.getElementById(key);
            if (input && document.body.contains(input)) input.value = val;
        }
        balancoForm.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
                const d = JSON.parse(localStorage.getItem('pav_balanco_draft') || '{}');
                d[e.target.id] = e.target.value;
                localStorage.setItem('pav_balanco_draft', JSON.stringify(d));
            }
        });
        balancoForm.addEventListener('submit', () => localStorage.removeItem('pav_balanco_draft'));
    }

    // ── PREVENIR "050" EM INPUTS NUMÉRICOS ──────────────────────────────
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number' && e.target.value === '0') {
            e.target.dataset.hadZero = 'true';
            e.target.value = '';
        }
    });
    document.addEventListener('focusout', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'number' && e.target.value === '' && e.target.dataset.hadZero === 'true') {
            e.target.value = '0';
        }
    });

    // ── NOME DA CLÍNICA E INFO DO USUÁRIO NA SIDEBAR ────────────────────
    try {
        const clinica = JSON.parse(localStorage.getItem('pav_clinica') || 'null');
        const user    = JSON.parse(localStorage.getItem('pav_user')    || 'null');
        const nome    = localStorage.getItem('pav_brand_nome') || (clinica && clinica.nome) || 'Minha Clínica';
        const resp    = localStorage.getItem('pav_brand_resp') || (clinica && clinica.responsavel) || '';
        const email   = user && user.email ? user.email : '';
        const elClinic = document.getElementById('sidebar-clinic-name');
        if (elClinic) elClinic.textContent = nome;
        const elUser = document.getElementById('user-display');
        if (elUser) {
            const inicial = (resp || nome || 'U').charAt(0).toUpperCase();
            elUser.innerHTML = `
                <div class="sidebar-user-info">
                    <div class="sidebar-user-avatar">${inicial}</div>
                    <div style="overflow:hidden;">
                        <div class="sidebar-user-name">${resp || nome}</div>
                        <div class="sidebar-user-email">${email}</div>
                    </div>
                </div>`;
        }
    } catch(e) {}

    // ── MARCAR INPUTS MONETÁRIOS COM [data-money] ────────────────────────
    const knownMoneyIds = [
        'faturamento','metaFaturamento','metaLucro','reembolsoInadimplencia',
        'impostos','taxasCartao','insumos','boletosFornecedores','terceirizadosVar',
        'labTerceirizado','comissoes','plantoes','escritorioLimpezaVar','estorno',
        'outrosVariaveis','folha','agua','luz','internet','aluguel','contador',
        'manutencao','seguro','combustivel','telefone','publicidade','outrosFixos',
        'cxValor','calc-preco','calc-ins-prin','calc-com-vet','calc-com-ext',
        'calc-ins-med','calc-ins-geral','calc-ali-det','calc-ext-des',
        'calc-ext-kit','calc-ext-out'
    ];
    knownMoneyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('data-money', 'true');
    });
});
