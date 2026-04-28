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

        const box  = document.createElement('div');
        box.className = 'pav-confirm-box';

        const h3 = document.createElement('h3');
        h3.textContent = title;   // textContent — sem risco XSS

        const p = document.createElement('p');
        p.textContent = message;  // textContent — sem risco XSS

        const actions = document.createElement('div');
        actions.className = 'pav-confirm-actions';
        actions.innerHTML = `
            <button id="pav-confirm-cancel" class="btn-secondary" style="padding:0.6rem 1.2rem; font-size:0.85rem;">Cancelar</button>
            <button id="pav-confirm-ok" class="btn-danger" style="padding:0.6rem 1.2rem; font-size:0.85rem;">Excluir</button>
        `;

        box.appendChild(h3);
        box.appendChild(p);
        box.appendChild(actions);
        overlay.appendChild(box);
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
        if (!window.jspdf?.jsPDF) return this.showToast('Biblioteca PDF não carregada. Recarregue a página.', 'error');

        const t    = window.calcularTotais ? window.calcularTotais(data) : {};
        const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
        const pct  = (v, base) => base > 0 ? ((v || 0) / base * 100).toFixed(1) + '%' : '—';

        const { jsPDF } = window.jspdf;
        const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 14;
        const colW  = pageW - 2 * margin;

        const orgNome = localStorage.getItem('pav_brand_nome') || 'Clínica';
        const orgResp = localStorage.getItem('pav_brand_resp') || '';
        const periodo = data.mesReferencia || 'N/A';
        const fat     = data.faturamento  || 0;

        // ── Cabeçalho ──────────────────────────────────────────────────
        doc.setFillColor(15, 77, 63);
        doc.rect(0, 0, pageW, 36, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18).setFont('helvetica', 'bold');
        doc.text('PAVE', margin, 13);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text('Relatório Financeiro Gerencial', margin, 20);
        doc.text('Período: ' + periodo, margin, 27);
        doc.setFontSize(9);
        doc.text(orgNome, pageW - margin, 13, { align: 'right' });
        if (orgResp) doc.text(orgResp, pageW - margin, 20, { align: 'right' });
        doc.text('Emitido em: ' + new Date().toLocaleDateString('pt-BR'), pageW - margin, 27, { align: 'right' });

        // ── Seção 1: DRE ───────────────────────────────────────────────
        const receitaLiq   = fat - ((data.impostos || 0) + (data.taxasCartao || 0));
        const custoVar     = t.totalVariaveis    || 0;
        const margemContr  = t.margemContribuicao || (receitaLiq - custoVar);
        const custoFixo    = t.totalFixos        || 0;
        const ebitda       = margemContr - custoFixo;
        const proLabore    = data.proLabore      || 0;
        const lucro        = t.lucroGerencial    || 0;
        const deducoes     = (data.impostos || 0) + (data.taxasCartao || 0);

        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('1. Demonstrativo de Resultado (DRE)', margin, 44);

        const dreRows = [
            ['Receita Bruta',              fmt(fat),         pct(fat, fat)],
            ['(-) Deduções / Impostos',    fmt(deducoes),    pct(deducoes, fat)],
            ['(=) Receita Líquida',        fmt(receitaLiq),  pct(receitaLiq, fat)],
            ['(-) Custos Variáveis',       fmt(custoVar),    pct(custoVar, fat)],
            ['(=) Margem de Contribuição', fmt(margemContr), pct(margemContr, fat)],
            ['(-) Custos Fixos',           fmt(custoFixo),   pct(custoFixo, fat)],
            ['(=) EBITDA',                 fmt(ebitda),      pct(ebitda, fat)],
            ['(-) Pró-labore',             fmt(proLabore),   pct(proLabore, fat)],
            ['(=) Lucro Líquido',          fmt(lucro),       pct(lucro, fat)],
        ];
        const dreStyles = ['section', 'normal', 'total', 'normal', 'total', 'normal', 'total', 'normal', 'highlight'];

        doc.autoTable({
            startY: 48,
            head: [['Descrição', 'Valor', '% Receita']],
            body: dreRows,
            columnStyles: {
                0: { cellWidth: colW * 0.55 },
                1: { cellWidth: colW * 0.25, halign: 'right' },
                2: { cellWidth: colW * 0.20, halign: 'right' },
            },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [15, 77, 63], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [244, 247, 245] },
            didParseCell: (d) => {
                if (d.section !== 'body') return;
                const s = dreStyles[d.row.index];
                if (s === 'section')   { d.cell.styles.fillColor = [15, 77, 63]; d.cell.styles.textColor = 255; d.cell.styles.fontStyle = 'bold'; }
                if (s === 'total')     { d.cell.styles.fillColor = [220, 237, 229]; d.cell.styles.fontStyle = 'bold'; }
                if (s === 'highlight') { d.cell.styles.fillColor = lucro >= 0 ? [29, 158, 117] : [226, 75, 74]; d.cell.styles.textColor = 255; d.cell.styles.fontStyle = 'bold'; }
            },
        });

        // ── Seção 2: Indicadores ───────────────────────────────────────
        let nextY = doc.lastAutoTable.finalY + 10;
        if (nextY > pageH - 70) { doc.addPage(); nextY = 20; }
        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('2. Indicadores do Período', margin, nextY);

        const pe      = margemContr > 0 ? custoFixo / (margemContr / (fat || 1)) : 0;
        const qtdAt   = parseFloat(data.qtdAtendimentos) || 0;
        const ticket  = qtdAt > 0 ? fat / qtdAt : 0;
        const metaFat = data.metaFaturamento || 0;
        const metaLucro = data.metaLucro    || 0;

        doc.autoTable({
            startY: nextY + 4,
            head: [['Indicador', 'Valor', 'Observação']],
            body: [
                ['Margem de Lucro Líquido',  pct(lucro, fat),         lucro >= 0 ? 'Positivo' : 'Negativo — atenção'],
                ['Margem de Contribuição',   pct(margemContr, fat),   margemContr >= custoFixo ? 'Cobre custos fixos' : 'Abaixo dos fixos'],
                ['Ponto de Equilíbrio',      fmt(pe),                 fat > 0 ? (fat >= pe ? 'Atingido' : 'Não atingido') : '—'],
                ['Ticket Médio',             fmt(ticket),             qtdAt > 0 ? qtdAt + ' atendimentos' : 'Sem dados'],
                ['Meta Faturamento',         fmt(metaFat),            metaFat > 0 ? pct(fat, metaFat) + ' realizado' : 'Não definida'],
                ['Meta Lucro',               fmt(metaLucro),          metaLucro > 0 ? pct(lucro, metaLucro) + ' realizado' : 'Não definida'],
            ],
            columnStyles: {
                0: { cellWidth: colW * 0.38 },
                1: { cellWidth: colW * 0.22, halign: 'right' },
                2: { cellWidth: colW * 0.40 },
            },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [41, 98, 155], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [244, 247, 253] },
        });

        // ── Seção 3: Custos Variáveis detalhado ────────────────────────
        nextY = doc.lastAutoTable.finalY + 10;
        if (nextY > pageH - 60) { doc.addPage(); nextY = 20; }
        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('3. Detalhamento — Custos Variáveis', margin, nextY);

        const varItems = [
            ['Reembolso / Inadimplência', data.reembolsoInadimplencia],
            ['Impostos',                  data.impostos],
            ['Taxas de Cartão',           data.taxasCartao],
            ['Insumos Diários',           data.insumos],
            ['Boletos Fornecedores',      data.boletosFornecedores],
            ['Serviços Terceirizados',    data.terceirizadosVar],
            ['Lab. Terceirizado',         data.labTerceirizado],
            ['Comissões',                 data.comissoes],
            ['Plantões',                  data.plantoes],
            ['Escritório / Limpeza',      data.escritorioLimpezaVar],
            ['Estorno',                   data.estorno],
            ['Outros Variáveis',          data.outrosVariaveis],
        ].filter(r => parseFloat(r[1]) > 0);
        varItems.push(['TOTAL VARIÁVEIS', custoVar]);

        doc.autoTable({
            startY: nextY + 4,
            head: [['Item', 'Valor', '% Receita']],
            body: varItems.map(([label, val]) => [label, fmt(val), pct(val, fat)]),
            columnStyles: {
                0: { cellWidth: colW * 0.55 },
                1: { cellWidth: colW * 0.25, halign: 'right' },
                2: { cellWidth: colW * 0.20, halign: 'right' },
            },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [226, 75, 74], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [253, 244, 244] },
            didParseCell: (d) => {
                if (d.section === 'body' && d.row.index === varItems.length - 1) {
                    d.cell.styles.fontStyle = 'bold';
                    d.cell.styles.fillColor = [240, 210, 210];
                }
            },
        });

        // ── Seção 4: Custos Fixos detalhado ───────────────────────────
        nextY = doc.lastAutoTable.finalY + 10;
        if (nextY > pageH - 60) { doc.addPage(); nextY = 20; }
        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('4. Detalhamento — Custos Fixos', margin, nextY);

        const fixItems = [
            ['Folha de Pagamento',    data.folha],
            ['Água',                  data.agua],
            ['Luz',                   data.luz],
            ['Sistemas',              data.sistemas],
            ['Aluguel',               data.aluguel],
            ['Telecom',               data.telecom],
            ['Contabilidade',         data.contabilidade],
            ['Marketing',             data.marketing],
            ['E-Social',              data.esocial],
            ['Taxas Admin',           data.taxasAdmin],
            ['CRMV',                  data.crmv],
            ['Lixo Contaminante',     data.lixoContaminante],
            ['IPTU',                  data.iptu],
            ['Limpeza Fixa',          data.limpezaFixa],
            ['Terceirizados Fixos',   data.terceirizadosFixos],
            ['Outros Fixos',          data.outrosFixos],
        ].filter(r => parseFloat(r[1]) > 0);
        fixItems.push(['TOTAL FIXOS', custoFixo]);

        doc.autoTable({
            startY: nextY + 4,
            head: [['Item', 'Valor', '% Receita']],
            body: fixItems.map(([label, val]) => [label, fmt(val), pct(val, fat)]),
            columnStyles: {
                0: { cellWidth: colW * 0.55 },
                1: { cellWidth: colW * 0.25, halign: 'right' },
                2: { cellWidth: colW * 0.20, halign: 'right' },
            },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [247, 247, 247] },
            didParseCell: (d) => {
                if (d.section === 'body' && d.row.index === fixItems.length - 1) {
                    d.cell.styles.fontStyle = 'bold';
                    d.cell.styles.fillColor = [220, 220, 220];
                }
            },
        });

        // ── Seção 5: Divisão do Lucro ──────────────────────────────────
        nextY = doc.lastAutoTable.finalY + 10;
        if (nextY > pageH - 60) { doc.addPage(); nextY = 20; }
        doc.setFontSize(11).setTextColor(15, 77, 63).setFont('helvetica', 'bold');
        doc.text('5. Divisão do Lucro', margin, nextY);

        // Tenta ler configuração salva, senão usa 50/30/20
        let div = { proLaborePerc: 50, investimentoPerc: 30, reservaPerc: 20 };
        try {
            const saved = JSON.parse(localStorage.getItem('pav_divisao_lucro') || '{}');
            if (saved.proLaborePerc) div = saved;
        } catch(e) {}

        const vlPL  = lucro * (div.proLaborePerc  / 100);
        const vlInv = lucro * (div.investimentoPerc / 100);
        const vlRes = lucro * (div.reservaPerc    / 100);

        doc.autoTable({
            startY: nextY + 4,
            head: [['Destinação', 'Percentual', 'Valor']],
            body: [
                ['Pró-labore',       div.proLaborePerc   + '%', fmt(vlPL)],
                ['Reinvestimento',   div.investimentoPerc + '%', fmt(vlInv)],
                ['Reserva de Caixa', div.reservaPerc     + '%', fmt(vlRes)],
                ['Lucro Líquido',    '100%',                    fmt(lucro)],
            ],
            columnStyles: {
                0: { cellWidth: colW * 0.45 },
                1: { cellWidth: colW * 0.25, halign: 'center' },
                2: { cellWidth: colW * 0.30, halign: 'right' },
            },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [15, 77, 63], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [244, 247, 245] },
            didParseCell: (d) => {
                if (d.section === 'body' && d.row.index === 3) {
                    d.cell.styles.fontStyle = 'bold';
                    d.cell.styles.fillColor = lucro >= 0 ? [29, 158, 117] : [226, 75, 74];
                    d.cell.styles.textColor = 255;
                }
            },
        });

        // ── Rodapé em todas as páginas ─────────────────────────────────
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(200);
            doc.line(margin, pageH - 13, pageW - margin, pageH - 13);
            doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(140);
            doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · PAVE Financial`, margin, pageH - 7);
            doc.text('Documento informativo. Consulte um contador para fins fiscais e legais.', pageW / 2, pageH - 7, { align: 'center' });
            doc.text(`Pág. ${i}/${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
        }

        doc.save(`PAVE_Relatorio_${periodo}.pdf`);
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
        'calc-preco','calc-ins-prin','calc-com-vet','calc-com-ext',
        'calc-ins-med','calc-ins-geral','calc-ali-det','calc-ext-des',
        'calc-ext-kit','calc-ext-out'
    ];
    knownMoneyIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('data-money', 'true');
    });
});

// ============================================================
// PAVE — Camada de Utilitários Centralizados
// Usar window.Fmt, window.Calc e window.Storage em todos os
// módulos para evitar reimplementações divergentes.
// ============================================================

// ── Detecção de tema ─────────────────────────────────────────────────────────
window._isDark = function() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
};

window.Fmt = {
    /** Formata número como moeda BRL: R$ 1.234,56 */
    money(v) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    },
    /** Formata percentual com N casas decimais: "12,3%" */
    percent(v, decimals = 1) {
        return (v || 0).toFixed(decimals).replace('.', ',') + '%';
    },
    /** Formata número compacto: 1200 → "1,2k" */
    compact(v) {
        return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v || 0);
    },
    /** Converte ISO (YYYY-MM-DD) para DD/MM/YYYY */
    date(iso) {
        if (!iso) return '—';
        const parts = String(iso).split('T')[0].split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
    },
    /** Converte YYYY-MM para MM/YYYY */
    month(ym) {
        if (!ym) return '—';
        const parts = String(ym).split('-');
        return parts.length >= 2 ? `${parts[1]}/${parts[0]}` : ym;
    }
};

window.Calc = {
    /** Ponto de Equilíbrio: custos fixos / (margem contribuição / faturamento) */
    pe(fixos, margemContrib, faturamento) {
        if (!faturamento || faturamento <= 0) return 0;
        const pct = margemContrib / faturamento;
        return pct > 0 ? fixos / pct : 0;
    },
    /** Delta percentual entre dois períodos — retorna null se base inválida */
    delta(atual, anterior) {
        if (anterior === null || anterior === undefined || !isFinite(anterior) || anterior === 0) return null;
        return ((atual - anterior) / Math.abs(anterior)) * 100;
    },
    /** Margem percentual: (lucro / faturamento) * 100 */
    margin(lucro, faturamento) {
        return faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    },
    /** Ticket médio: faturamento / atendimentos */
    ticket(faturamento, atendimentos) {
        const qt = Math.round(atendimentos || 0);
        return qt > 0 ? faturamento / qt : 0;
    }
};

window.Storage = {
    /** Lê e parseia JSON do localStorage — retorna fallback se corrompido */
    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch(e) {
            console.warn(`[Storage] Chave "${key}" corrompida — retornando fallback.`, e);
            return fallback;
        }
    },
    /** Serializa e salva no localStorage */
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch(e) { console.error(`[Storage] Falha ao salvar "${key}":`, e); }
    },
    /** Lê campo numérico de objeto no localStorage */
    num(key, field, defaultVal = 0) {
        const obj = this.get(key, {});
        return typeof obj[field] === 'number' ? obj[field] : defaultVal;
    }
};

// ============================================================
// ONBOARDING WIZARD — aparece uma vez, na primeira sessão
// ============================================================
window.OnboardingModule = (() => {
    const DONE_KEY = 'pav_onboard_done';

    function _html() {
        return `
        <div id="onboarding-overlay" class="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Configuração inicial">
            <div class="onboarding-card">
                <!-- Steps indicator -->
                <div style="display:flex; gap:6px; justify-content:center; margin-bottom:1.5rem;">
                    <div id="ob-dot-1" style="width:32px; height:4px; border-radius:2px; background:var(--accent-blue); transition:all 0.2s;"></div>
                    <div id="ob-dot-2" style="width:32px; height:4px; border-radius:2px; background:var(--border); transition:all 0.2s;"></div>
                    <div id="ob-dot-3" style="width:32px; height:4px; border-radius:2px; background:var(--border); transition:all 0.2s;"></div>
                </div>

                <!-- Step 1: Dados da clínica -->
                <div id="ob-step-1">
                    <h2 style="margin:0 0 0.25rem; font-size:1.3rem; color:var(--text-primary);">Bem-vindo ao PAVE</h2>
                    <p style="margin:0 0 1.5rem; color:var(--text-secondary); font-size:0.875rem;">Vamos configurar sua clínica em 3 passos rápidos.</p>
                    <div class="form-grid" style="gap:1rem;">
                        <div class="input-group">
                            <label>Nome da Clínica *</label>
                            <input type="text" id="ob-nome" placeholder="Ex: Clínica Vet Saúde" autocomplete="organization">
                        </div>
                        <div class="input-group">
                            <label>Responsável / CRMV</label>
                            <input type="text" id="ob-resp" placeholder="Ex: Dr. João — CRMV 12345">
                        </div>
                        <div class="input-group">
                            <label>Regime Tributário</label>
                            <select id="ob-regime">
                                <option value="simples">Simples Nacional</option>
                                <option value="lucro_presumido">Lucro Presumido</option>
                                <option value="lucro_real">Lucro Real</option>
                            </select>
                        </div>
                    </div>
                    <button id="ob-btn-1" style="margin-top:1.5rem; width:100%; padding:0.75rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-weight:700; font-size:0.95rem; font-family:var(--font-family); cursor:pointer;">Próximo →</button>
                </div>

                <!-- Step 2: Divisão do lucro -->
                <div id="ob-step-2" style="display:none;">
                    <h2 style="margin:0 0 0.25rem; font-size:1.3rem; color:var(--text-primary);">Divisão do Lucro</h2>
                    <p style="margin:0 0 1.5rem; color:var(--text-secondary); font-size:0.875rem;">Como você quer dividir o lucro líquido mensal? (Total deve ser 100%)</p>
                    <div class="form-grid" style="gap:1rem;">
                        <div class="input-group">
                            <label>Pró-labore do sócio (%)</label>
                            <input type="number" id="ob-prolabore" value="50" min="0" max="100">
                        </div>
                        <div class="input-group">
                            <label>Reinvestimentos (%)</label>
                            <input type="number" id="ob-invest" value="30" min="0" max="100">
                        </div>
                        <div class="input-group">
                            <label>Reserva de emergência (%)</label>
                            <input type="number" id="ob-reserva" value="20" min="0" max="100">
                        </div>
                    </div>
                    <p id="ob-divisao-warning" style="display:none; color:var(--color-danger); font-size:0.8rem; margin-top:0.5rem;">⚠ A soma deve ser exatamente 100%.</p>
                    <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
                        <button id="ob-btn-back-2" style="flex:1; padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:transparent; color:var(--text-secondary); font-weight:700; font-family:var(--font-family); cursor:pointer;">← Voltar</button>
                        <button id="ob-btn-2" style="flex:2; padding:0.75rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-weight:700; font-family:var(--font-family); cursor:pointer;">Próximo →</button>
                    </div>
                </div>

                <!-- Step 3: Concluído -->
                <div id="ob-step-3" style="display:none; text-align:center;">
                    <div style="font-size:3rem; margin-bottom:1rem;">🎉</div>
                    <h2 style="margin:0 0 0.5rem; font-size:1.3rem; color:var(--text-primary);">Tudo pronto!</h2>
                    <p style="color:var(--text-secondary); font-size:0.875rem; margin-bottom:1.5rem;">Sua clínica está configurada. Explore as abas para lançar receitas, despesas e acompanhar seu crescimento.</p>
                    <div style="display:flex; flex-direction:column; gap:0.5rem; text-align:left; margin-bottom:1.5rem;">
                        <div style="padding:0.625rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-secondary);">📊 <strong style="color:var(--text-primary);">Dashboard</strong> — visão geral dos seus números</div>
                        <div style="padding:0.625rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-secondary);">💰 <strong style="color:var(--text-primary);">Caixa Diário</strong> — registre receitas e despesas do dia</div>
                        <div style="padding:0.625rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-secondary);">📋 <strong style="color:var(--text-primary);">Balanço</strong> — consolide o mês e veja seu lucro real</div>
                        <div style="padding:0.625rem 0.875rem; background:var(--bg-elevated); border-radius:var(--radius-sm); font-size:0.82rem; color:var(--text-secondary);">📅 <strong style="color:var(--text-primary);">Contas P/R</strong> — controle vencimentos e recorrências</div>
                    </div>
                    <button id="ob-btn-finish" style="width:100%; padding:0.75rem; border-radius:var(--radius-sm); border:none; background:var(--accent-blue); color:#fff; font-weight:700; font-size:0.95rem; font-family:var(--font-family); cursor:pointer;">Começar a usar →</button>
                </div>
            </div>
        </div>`;
    }

    function _goStep(n) {
        [1, 2, 3].forEach(i => {
            document.getElementById(`ob-step-${i}`).style.display = i === n ? '' : 'none';
            const dot = document.getElementById(`ob-dot-${i}`);
            dot.style.background = i <= n ? 'var(--accent-blue)' : 'var(--border)';
        });
    }

    function _save() {
        const nome     = document.getElementById('ob-nome')?.value.trim() || '';
        const resp     = document.getElementById('ob-resp')?.value.trim() || '';
        const regime   = document.getElementById('ob-regime')?.value || 'simples';
        const prolabore = parseInt(document.getElementById('ob-prolabore')?.value) || 50;
        const invest    = parseInt(document.getElementById('ob-invest')?.value) || 30;
        const reserva   = parseInt(document.getElementById('ob-reserva')?.value) || 20;

        if (nome) {
            localStorage.setItem('pav_brand_nome', nome);
            localStorage.setItem('pav_brand_resp', resp);
            const clinica = JSON.parse(localStorage.getItem('pav_clinica') || '{}');
            clinica.nome = nome; clinica.responsavel = resp; clinica.regime = regime;
            localStorage.setItem('pav_clinica', JSON.stringify(clinica));
            if (typeof OrgAPI !== 'undefined') {
                OrgAPI.update({ nome, responsavel: resp, regime })
                    .catch(e => console.warn('[Onboarding] OrgAPI.update:', e?.message));
            }
        }

        localStorage.setItem('pav_divisao_lucro', JSON.stringify({ proLabore: prolabore, investimentos: invest, reserva }));
        if (typeof OrgAPI !== 'undefined') { /* profit_config sync via Configurações */ }
        localStorage.setItem(DONE_KEY, '1');
    }

    function init() {
        if (localStorage.getItem(DONE_KEY)) return;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = _html();
        document.body.appendChild(wrapper.firstChild);

        document.getElementById('ob-btn-1').addEventListener('click', () => {
            const nome = document.getElementById('ob-nome')?.value.trim();
            if (!nome) { document.getElementById('ob-nome').style.borderColor = 'var(--color-danger)'; return; }
            document.getElementById('ob-nome').style.borderColor = '';
            _goStep(2);
        });

        document.getElementById('ob-btn-back-2').addEventListener('click', () => _goStep(1));

        document.getElementById('ob-btn-2').addEventListener('click', () => {
            const pl = parseInt(document.getElementById('ob-prolabore')?.value) || 0;
            const iv = parseInt(document.getElementById('ob-invest')?.value) || 0;
            const rv = parseInt(document.getElementById('ob-reserva')?.value) || 0;
            const warn = document.getElementById('ob-divisao-warning');
            if (pl + iv + rv !== 100) { warn.style.display = ''; return; }
            warn.style.display = 'none';
            _goStep(3);
        });

        document.getElementById('ob-btn-finish').addEventListener('click', () => {
            _save();
            document.getElementById('onboarding-overlay').remove();
            if (window.renderConfig) window.renderConfig();
        });

        // Recalculate warning live
        ['ob-prolabore','ob-invest','ob-reserva'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                const total = ['ob-prolabore','ob-invest','ob-reserva']
                    .reduce((s, i) => s + (parseInt(document.getElementById(i)?.value) || 0), 0);
                const warn = document.getElementById('ob-divisao-warning');
                if (warn) warn.style.display = total === 100 ? 'none' : '';
            });
        });
    }

    return { init };
})();
