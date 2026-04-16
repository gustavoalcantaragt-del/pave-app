// ============================================================
// nfe-import.js — Importação de NF-e XML
// Feature 4.3 — Fase 4 do PAVE
// Parser de XML NF-e 4.0 / CT-e, auto-categorização por CNPJ/descrição,
// sub-tab na aba Caixa Diário
// ============================================================

const NFEImportModule = (() => {

    // ── CATEGORIZAÇÃO AUTOMÁTICA ──────────────────────────────
    // Mapeamentos heurísticos: se a descrição do produto/fornecedor
    // contiver algum destes termos, a categoria é inferida.
    const CATEGORY_MAP = [
        { terms: ['ração','racao','petisco','pet food','alimento','nutri'],       cat: 'Alimentação Animal' },
        { terms: ['vacina','vacinação','biológico','biologico','imunoprotec'],    cat: 'Vacinas e Biológicos' },
        { terms: ['medicamento','remédio','remedio','antibiótico','fármaco','farmaco','principio ativo'], cat: 'Medicamentos' },
        { terms: ['seringa','agulha','descartável','descartavel','curativo','luva','epi'], cat: 'Materiais Descartáveis' },
        { terms: ['cirurgia','instrumental','bisturi','pinça','tesoura cirurg'], cat: 'Material Cirúrgico' },
        { terms: ['limpeza','desinfetante','sanitizante','sabão','detergente','pano'], cat: 'Higiene e Limpeza' },
        { terms: ['escritório','escritorio','papel','caneta','envelope','toner'], cat: 'Material de Escritório' },
        { terms: ['energia','conta de luz','luz','água','agua','telefone','internet'], cat: 'Utilidades' },
        { terms: ['aluguel','locação','locacao','imóvel','imovel'],               cat: 'Aluguel' },
        { terms: ['frete','entrega','logística','logistica','transporte'],       cat: 'Frete e Logística' },
    ];

    function _inferCategory(text = '') {
        const lower = text.toLowerCase();
        for (const { terms, cat } of CATEGORY_MAP) {
            if (terms.some(t => lower.includes(t))) return cat;
        }
        return 'Fornecedores / Compras';
    }

    // ── PARSER NF-e XML ───────────────────────────────────────
    function parseNFe(xmlString) {
        try {
            const parser = new DOMParser();
            const doc    = parser.parseFromString(xmlString, 'application/xml');
            const err    = doc.querySelector('parsererror');
            if (err) return { error: 'XML inválido: ' + err.textContent.substring(0, 120) };

            const get = (selector, fallback = '') => {
                const el = doc.querySelector(selector);
                return el?.textContent?.trim() || fallback;
            };

            // Tipo de documento
            const tpAmb = get('tpAmb');       // 1=prod, 2=homolog
            const tpNF  = get('tpNF');         // 0=entrada, 1=saída

            // Fornecedor / Emitente
            const emitXNome  = get('emit > xNome');
            const emitCNPJ   = get('emit > CNPJ');
            const emitCPF    = get('emit > CPF');
            const emitCNPJFmt = emitCNPJ
                ? emitCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
                : emitCPF || '';

            // Destinatário
            const destXNome = get('dest > xNome');

            // Dados da nota
            const nNF     = get('nNF');
            const serie   = get('serie');
            const dhEmi   = get('dhEmi') || get('dEmi');
            const dhSaiEnt = get('dhSaiEnt') || get('dSaiEnt') || dhEmi;
            const chNFe   = get('chNFe') || get('Id');
            const natOp   = get('natOp');

            // Totais
            const vNF  = parseFloat(get('total > ICMSTot > vNF',  get('vNF', '0')));
            const vProd = parseFloat(get('total > ICMSTot > vProd', '0'));
            const vDesc = parseFloat(get('total > ICMSTot > vDesc', '0'));
            const vIPI  = parseFloat(get('total > ICMSTot > vIPI',  '0'));
            const vFrete = parseFloat(get('total > ICMSTot > vFrete', '0'));

            // Produtos (até 20)
            const items = [];
            const dets  = doc.querySelectorAll('det');
            dets.forEach((det, i) => {
                if (i >= 20) return;
                const xProd = det.querySelector('xProd')?.textContent?.trim() || '';
                const qCom  = parseFloat(det.querySelector('qCom')?.textContent  || '0');
                const uCom  = det.querySelector('uCom')?.textContent?.trim()  || 'un';
                const vUnCom = parseFloat(det.querySelector('vUnCom')?.textContent || '0');
                const vProdItem = parseFloat(det.querySelector('vProd')?.textContent || '0');
                const cEAN = det.querySelector('cEAN')?.textContent?.trim() || '';
                items.push({ xProd, qCom, uCom, vUnCom, vProdItem, cEAN });
            });

            // Descrição agregada dos produtos para categorização
            const allDesc = [natOp, emitXNome, ...items.map(i => i.xProd)].join(' ');
            const category = _inferCategory(allDesc);

            // Data de emissão formatada
            let emissionDate = '';
            try {
                emissionDate = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];
            } catch { emissionDate = new Date().toISOString().split('T')[0]; }

            // Descrição para o lançamento
            const description = items.length > 0
                ? (items.length === 1 ? items[0].xProd : `${items[0].xProd} +${items.length - 1} item(s)`)
                : (natOp || 'Compra via NF-e');

            return {
                ok: true,
                tpAmb,
                tpNF,
                nNF,
                serie,
                chNFe:         chNFe.replace(/^NFe/, ''),
                emitXNome,
                emitCNPJ:      emitCNPJFmt,
                emitCNPJRaw:   emitCNPJ || '',
                destXNome,
                emissionDate,
                dhSaiEnt:      dhSaiEnt ? dhSaiEnt.split('T')[0] : emissionDate,
                natOp,
                vNF,
                vProd,
                vDesc,
                vIPI,
                vFrete,
                items,
                // Campos para cash_movement
                description,
                amount:   vNF,
                category,
                isHomolog: tpAmb === '2'
            };
        } catch (e) {
            console.error('NFE parse error:', e);
            return { error: 'Erro ao ler o XML: ' + e.message };
        }
    }

    // ── RENDER DA SUB-TAB ─────────────────────────────────────
    function renderTab(container) {
        if (!container) return;
        container.innerHTML = `
        <div class="card">
            <h3 style="margin-bottom:0.25rem;">Importar NF-e XML</h3>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:1.25rem;">
                Arraste o arquivo XML da NF-e ou clique para selecionar. O sistema preenche automaticamente os dados do lançamento.
            </p>

            <!-- Drop Zone -->
            <div class="nfe-drop-zone" id="nfe-drop-zone" onclick="document.getElementById('nfe-file-input').click()">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <p>Clique ou arraste o arquivo XML da NF-e aqui</p>
                <small>Formato: .xml · NF-e 4.0 · Máx 2 MB</small>
            </div>
            <input type="file" id="nfe-file-input" accept=".xml,text/xml,application/xml" style="display:none;" multiple>

            <!-- Preview -->
            <div id="nfe-preview-area"></div>

            <!-- Histórico de importações recentes -->
            <div style="margin-top:1.5rem;">
                <div style="font-size:0.82rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.4px;">Importações Recentes</div>
                <div id="nfe-history"></div>
            </div>
        </div>`;

        _setupDropZone();
        _renderHistory(container.querySelector('#nfe-history'));
    }

    function _setupDropZone() {
        const zone  = document.getElementById('nfe-drop-zone');
        const input = document.getElementById('nfe-file-input');
        if (!zone || !input) return;

        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xml'));
            if (files.length) _processFiles(files);
        });
        input.addEventListener('change', () => {
            const files = Array.from(input.files);
            if (files.length) _processFiles(files);
            input.value = '';
        });
    }

    function _processFiles(files) {
        const area = document.getElementById('nfe-preview-area');
        if (!area) return;
        area.innerHTML = '';
        files.forEach(file => _readFile(file, area));
    }

    function _readFile(file, area) {
        if (file.size > 2 * 1024 * 1024) {
            _showStatus(area, 'error', `Arquivo ${file.name} excede 2 MB.`);
            return;
        }
        const reader = new FileReader();
        reader.onload  = e => _showPreview(area, e.target.result, file.name);
        reader.onerror = () => _showStatus(area, 'error', `Erro ao ler ${file.name}`);
        reader.readAsText(file, 'UTF-8');
    }

    function _showPreview(area, xml, fileName) {
        const nfe = parseNFe(xml);
        if (nfe.error) {
            _showStatus(area, 'error', nfe.error);
            return;
        }

        const fmt     = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
        const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

        const card = document.createElement('div');
        card.className = 'nfe-preview-card';
        card.innerHTML = `
            <div class="nfe-preview-header">
                <span>NF-e nº ${nfe.nNF} · Série ${nfe.serie} · ${fmtDate(nfe.emissionDate)}</span>
                <span>${nfe.isHomolog ? '⚠ Homologação' : '✓ Produção'}</span>
            </div>
            <div class="nfe-preview-body">
                <div class="nfe-preview-row">
                    <span>Emitente</span>
                    <span>${nfe.emitXNome || '—'}${nfe.emitCNPJ ? ` · CNPJ ${nfe.emitCNPJ}` : ''}</span>
                </div>
                <div class="nfe-preview-row">
                    <span>Natureza da Operação</span>
                    <span>${nfe.natOp || '—'}</span>
                </div>
                <div class="nfe-preview-row">
                    <span>Total da NF-e</span>
                    <span style="font-weight:700; color:var(--color-danger);">${fmt(nfe.vNF)}</span>
                </div>
                <div class="nfe-preview-row">
                    <span>Categoria sugerida</span>
                    <span style="color:var(--pave-blue); font-weight:600;">${nfe.category}</span>
                </div>
                ${nfe.items.length > 0 ? `
                <div style="margin-top:8px; font-size:0.78rem; color:var(--text-secondary); font-weight:700; text-transform:uppercase; letter-spacing:0.4px; padding:6px 0 4px;">
                    Itens (${nfe.items.length})
                </div>
                ${nfe.items.slice(0, 5).map(it => `
                <div class="nfe-preview-row" style="font-size:0.8rem;">
                    <span>${it.xProd}</span>
                    <span>${it.qCom} ${it.uCom} × ${fmt(it.vUnCom)} = ${fmt(it.vProdItem)}</span>
                </div>`).join('')}
                ${nfe.items.length > 5 ? `<div style="font-size:0.75rem; color:var(--text-muted); padding:4px 0;">… +${nfe.items.length - 5} outros itens</div>` : ''}
                ` : ''}

                <!-- Formulário de ajuste antes de importar -->
                <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border);">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div class="input-group">
                            <label style="font-size:0.78rem;">Descrição do lançamento</label>
                            <input type="text" id="nfe-desc-${nfe.nNF}" value="${nfe.description}" style="padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.85rem; width:100%;">
                        </div>
                        <div class="input-group">
                            <label style="font-size:0.78rem;">Categoria</label>
                            <input type="text" id="nfe-cat-${nfe.nNF}" value="${nfe.category}" style="padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.85rem; width:100%;">
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                        <div class="input-group">
                            <label style="font-size:0.78rem;">Valor (R$)</label>
                            <input type="number" id="nfe-val-${nfe.nNF}" value="${nfe.vNF.toFixed(2)}" step="0.01" min="0" style="padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.85rem; width:100%;">
                        </div>
                        <div class="input-group">
                            <label style="font-size:0.78rem;">Data de competência</label>
                            <input type="date" id="nfe-date-${nfe.nNF}" value="${nfe.dhSaiEnt || nfe.emissionDate}" style="padding:8px; border:1px solid var(--border); border-radius:6px; background:var(--bg-input); color:var(--text-primary); font-family:inherit; font-size:0.85rem; width:100%;">
                        </div>
                    </div>
                    <div id="nfe-status-${nfe.nNF}"></div>
                    <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                        <button class="btn-primary" onclick="NFEImportModule.importEntry('${nfe.nNF}', ${JSON.stringify(nfe).replace(/"/g,'&quot;')})" style="font-size:0.85rem; padding:0.6rem 1.25rem;">
                            ↓ Importar como Saída de Caixa
                        </button>
                        <button onclick="this.closest('.nfe-preview-card').remove()" style="padding:0.6rem 1rem; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; cursor:pointer; font-size:0.85rem;">
                            Descartar
                        </button>
                    </div>
                </div>
            </div>`;

        area.appendChild(card);
    }

    function _showStatus(area, type, msg) {
        const el = document.createElement('div');
        el.className = `nfe-import-status ${type}`;
        el.textContent = msg;
        area.appendChild(el);
    }

    // ── IMPORTAR COMO LANÇAMENTO ──────────────────────────────
    async function importEntry(nNF, nfe) {
        const statusEl = document.getElementById(`nfe-status-${nNF}`);
        const desc  = document.getElementById(`nfe-desc-${nNF}`)?.value?.trim() || nfe.description;
        const cat   = document.getElementById(`nfe-cat-${nNF}`)?.value?.trim()  || nfe.category;
        const val   = parseFloat(document.getElementById(`nfe-val-${nNF}`)?.value) || nfe.vNF;
        const date  = document.getElementById(`nfe-date-${nNF}`)?.value || nfe.dhSaiEnt;

        if (!desc || val <= 0) {
            if (statusEl) { statusEl.className = 'nfe-import-status error'; statusEl.textContent = 'Descrição e valor são obrigatórios.'; }
            return;
        }

        try {
            const orgId = await OrgAPI.getOrgId();
            if (!orgId) throw new Error('Organização não encontrada.');

            const { error } = await _supabase
                .from('cash_movements')
                .insert({
                    organization_id: orgId,
                    type:            'expense',
                    description:     desc,
                    amount:          val,
                    category:        cat,
                    date:            date,
                    payment_method:  'nfe',
                    supplier_cnpj:   nfe.emitCNPJRaw || null,
                    source:          'nfe',
                    notes:           `NF-e nº ${nfe.nNF} · Série ${nfe.serie} · Chave: ${nfe.chNFe}`
                });

            if (error) throw error;

            if (statusEl) {
                statusEl.className = 'nfe-import-status success';
                statusEl.textContent = '✓ Importado com sucesso!';
            }

            // Salvar no histórico local
            _saveHistory({ nNF: nfe.nNF, desc, val, date, emitente: nfe.emitXNome, cnpj: nfe.emitCNPJ });

            // Atualizar histórico visível
            const histEl = document.getElementById('nfe-history');
            if (histEl) _renderHistory(histEl);

            // Refresh notificações / caixa
            if (window.NotificationsModule) NotificationsModule.refresh();

            setTimeout(() => {
                document.getElementById(`nfe-status-${nNF}`)
                    ?.closest('.nfe-preview-card')
                    ?.querySelector('button[class="btn-primary"]')
                    ?.remove();
            }, 2000);

        } catch (err) {
            console.error('NFE import:', err);
            if (statusEl) {
                statusEl.className = 'nfe-import-status error';
                statusEl.textContent = 'Erro ao importar: ' + (err.message || err);
            }
        }
    }

    // ── HISTÓRICO LOCAL ───────────────────────────────────────
    function _saveHistory(entry) {
        const KEY  = 'pav_nfe_history';
        const hist = JSON.parse(localStorage.getItem(KEY) || '[]');
        hist.unshift({ ...entry, importedAt: new Date().toISOString() });
        localStorage.setItem(KEY, JSON.stringify(hist.slice(0, 20)));
    }

    function _renderHistory(el) {
        if (!el) return;
        const KEY  = 'pav_nfe_history';
        const hist = JSON.parse(localStorage.getItem(KEY) || '[]');
        const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

        if (!hist.length) {
            el.innerHTML = '<p style="font-size:0.82rem; color:var(--text-muted);">Nenhuma NF-e importada ainda.</p>';
            return;
        }

        el.innerHTML = hist.map(h => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); font-size:0.82rem;">
                <div>
                    <div style="font-weight:600;">NF-e ${h.nNF} · ${h.emitente || '—'}</div>
                    <div style="color:var(--text-secondary);">${h.desc} · ${new Date(h.importedAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}</div>
                </div>
                <div style="font-weight:700; color:var(--color-danger);">${fmt(h.val)}</div>
            </div>`).join('');
    }

    return { renderTab, importEntry };

})();

window.NFEImportModule = NFEImportModule;
