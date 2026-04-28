// ============================================================
// calendario.js — Calendário Financeiro Visual
// Fase 3 — Feature 3.4
// Depende de: bills (F1), cash_movements
// ============================================================

const CalendarioModule = (() => {

    const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                         'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

    // ── BUSCAR DADOS DO MÊS ──────────────────────────────────────

    async function fetchMonthData(orgId, year, month) {
        const mm    = String(month).padStart(2, '0');
        const start = `${year}-${mm}-01`;
        const end   = new Date(year, month, 0).toISOString().split('T')[0];

        const [movResult, billResult] = await Promise.all([
            _supabase
                .from('cash_movements')
                .select('due_date, type, amount, category, description, status')
                .eq('organization_id', orgId)
                .gte('due_date', start)
                .lte('due_date', end)
                .eq('status', 'pago'),   // apenas realizados no calendário
            _supabase
                .from('bills')
                .select('due_date, type, amount, description, status')
                .eq('organization_id', orgId)
                .gte('due_date', start)
                .lte('due_date', end)
                .in('status', ['open', 'overdue'])  // apenas pendentes como projetados
        ]);

        // Complementar com dados do localStorage (caixa local ainda não sincronizado)
        const localMovs = (() => {
            try {
                const all = JSON.parse(localStorage.getItem('pav_caixa_movimentos') || '[]');
                return all.filter(m =>
                    m.status === 'pago' &&
                    m.vencimento >= start &&
                    m.vencimento <= end
                ).map(m => ({
                    due_date:    m.vencimento,
                    type:        m.tipo,          // 'receita' | 'despesa'
                    amount:      m.valor,
                    category:    m.categoria,
                    description: m.descricao,
                    status:      'pago',
                    _source:     'local'
                }));
            } catch(e) { return []; }
        })();

        // Remover duplicatas: preferir Supabase, descartar local com mesmo valor+data+tipo
        const supabaseKeys = new Set(
            (movResult.data || []).map(m => `${m.due_date}|${m.type}|${m.amount}`)
        );
        const uniqueLocal = localMovs.filter(m =>
            !supabaseKeys.has(`${m.due_date}|${m.type}|${m.amount}`)
        );

        return {
            movements: [...(movResult.data || []), ...uniqueLocal],
            bills:     billResult.data || [],
        };
    }

    // ── CONSTRUIR MAPA POR DIA ────────────────────────────────────

    function buildDayMap(movements, bills, year, month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const mm          = String(month).padStart(2, '0');
        const dayMap      = {};

        for (let d = 1; d <= daysInMonth; d++) {
            const key = `${year}-${mm}-${String(d).padStart(2, '0')}`;
            dayMap[key] = { date: key, receitas: [], despesas: [], billsReceita: [], billsDespesa: [],
                            totalReceita: 0, totalDespesa: 0, totalBillsRec: 0, totalBillsDes: 0 };
        }

        movements.forEach(m => {
            if (!dayMap[m.due_date]) return;
            const amount = parseFloat(m.amount);
            if (m.type === 'receita') {
                dayMap[m.due_date].receitas.push(m);
                dayMap[m.due_date].totalReceita += amount;
            } else {
                dayMap[m.due_date].despesas.push(m);
                dayMap[m.due_date].totalDespesa += amount;
            }
        });

        bills.forEach(b => {
            if (!dayMap[b.due_date]) return;
            const amount = parseFloat(b.amount);
            if (b.type === 'receivable') {
                dayMap[b.due_date].billsReceita.push(b);
                dayMap[b.due_date].totalBillsRec += amount;
            } else {
                dayMap[b.due_date].billsDespesa.push(b);
                dayMap[b.due_date].totalBillsDes += amount;
            }
        });

        return dayMap;
    }

    // ── RENDER PRINCIPAL ──────────────────────────────────────────

    async function renderCalendario(container) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) {
            container.innerHTML = `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:2rem;">Configure sua organização em Configurações primeiro.</p></div>`;
            return;
        }

        const now = new Date();
        let currentYear  = now.getFullYear();
        let currentMonth = now.getMonth() + 1;

        container.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem; flex-wrap:wrap;">
            <button id="cal-prev" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-sm); width:32px; height:32px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; color:var(--text-secondary);">‹</button>
            <h3 id="cal-month-label" style="margin:0; flex:1; text-align:center; font-size:1rem; font-weight:700; color:var(--text-primary);"></h3>
            <button id="cal-next" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-sm); width:32px; height:32px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; color:var(--text-secondary);">›</button>
            <button id="cal-today" style="padding:0.35rem 0.875rem; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary); font-size:0.78rem; font-weight:700; cursor:pointer; font-family:var(--font-family);">Hoje</button>
        </div>
        <div style="display:flex; gap:1rem; margin-bottom:0.75rem; flex-wrap:wrap; font-size:0.72rem;">
            <span style="color:#1D9E75; font-weight:600;">▲ Receita realizada</span>
            <span style="color:#E24B4A; font-weight:600;">▼ Despesa realizada</span>
            <span style="color:#1D9E75; opacity:0.6; font-style:italic;">◌ A receber</span>
            <span style="color:#E24B4A; opacity:0.6; font-style:italic;">◌ A pagar</span>
        </div>
        <div id="cal-grid-wrap" style="overflow-x:auto;"></div>
        <div id="cal-day-detail" style="display:none; margin-top:1rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--radius-card); padding:1.25rem;"></div>`;

        async function loadMonth(year, month) {
            document.getElementById('cal-month-label').textContent = `${MONTH_NAMES[month - 1]} ${year}`;
            const gridWrap = document.getElementById('cal-grid-wrap');
            gridWrap.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:1rem;font-size:0.85rem;">Carregando...</p>`;
            try {
                const { movements, bills } = await fetchMonthData(orgId, year, month);
                const dayMap = buildDayMap(movements, bills, year, month);
                renderGrid(gridWrap, dayMap, year, month);
            } catch (err) {
                gridWrap.innerHTML = `<p style="color:var(--color-danger);padding:1rem;">Erro: ${err.message}</p>`;
            }
        }

        function renderGrid(gridWrap, dayMap, year, month) {
            const fmtCompact  = v => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(v);
            const daysInMonth = new Date(year, month, 0).getDate();
            const firstDow    = new Date(year, month - 1, 1).getDay();
            const today       = new Date().toISOString().split('T')[0];
            const mm          = String(month).padStart(2, '0');

            // Header row
            let html = `<div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; min-width:420px;">`;
            DAY_NAMES.forEach(d => {
                html += `<div style="text-align:center; padding:6px 4px; font-size:0.65rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; background:var(--bg-elevated); border-radius:4px 4px 0 0;">${d}</div>`;
            });

            // Empty cells before 1st
            for (let i = 0; i < firstDow; i++) {
                html += `<div style="background:var(--bg-surface); min-height:72px; border-radius:4px;"></div>`;
            }

            for (let d = 1; d <= daysInMonth; d++) {
                const key      = `${year}-${mm}-${String(d).padStart(2, '0')}`;
                const day      = dayMap[key];
                const isToday  = key === today;
                const isFuture = key > today;
                const hasProj  = day.totalBillsRec > 0 || day.totalBillsDes > 0;
                const projNeg  = isFuture && hasProj && (day.totalBillsDes - day.totalBillsRec) > 0;
                const saldo    = day.totalReceita - day.totalDespesa;

                const bg = isToday ? 'rgba(10,132,255,0.07)' : projNeg ? 'rgba(226,75,74,0.05)' : 'var(--bg-elevated)';
                const numColor = isToday ? 'var(--accent-blue)' : projNeg ? '#E24B4A' : 'var(--text-secondary)';

                html += `<div data-date="${key}" style="background:${bg}; min-height:72px; padding:5px 6px; border-radius:4px; cursor:pointer; border:1px solid ${isToday ? 'rgba(10,132,255,0.25)' : 'var(--border)'}; position:relative; transition:background 0.1s;"
                     onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='${bg}'">
                    <div style="font-size:0.7rem; font-weight:${isToday ? '800' : '500'}; color:${numColor}; margin-bottom:3px;">${d}</div>
                    ${day.totalReceita > 0 ? `<div style="font-size:0.65rem; font-weight:700; color:#1D9E75; line-height:1.3;">▲ ${fmtCompact(day.totalReceita)}</div>` : ''}
                    ${day.totalDespesa > 0 ? `<div style="font-size:0.65rem; font-weight:700; color:#E24B4A; line-height:1.3;">▼ ${fmtCompact(day.totalDespesa)}</div>` : ''}
                    ${day.totalBillsRec > 0 ? `<div style="font-size:0.6rem; color:#1D9E75; opacity:0.65; font-style:italic; line-height:1.3;">◌ ${fmtCompact(day.totalBillsRec)}</div>` : ''}
                    ${day.totalBillsDes > 0 ? `<div style="font-size:0.6rem; color:#E24B4A; opacity:0.65; font-style:italic; line-height:1.3;">◌ ${fmtCompact(day.totalBillsDes)}</div>` : ''}
                    ${(day.totalReceita > 0 || day.totalDespesa > 0) ? `<div style="position:absolute; bottom:4px; right:5px; font-size:0.58rem; font-weight:800; color:${saldo >= 0 ? '#1D9E75' : '#E24B4A'};">${saldo >= 0 ? '+' : ''}${fmtCompact(saldo)}</div>` : ''}
                </div>`;
            }
            html += `</div>`;
            gridWrap.innerHTML = html;

            gridWrap.querySelectorAll('[data-date]').forEach(el => {
                el.addEventListener('click', () => showDayDetail(el.dataset.date, dayMap[el.dataset.date]));
            });
        }

        function showDayDetail(date, day) {
            const detailEl = document.getElementById('cal-day-detail');
            const fmt      = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
            const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const hasAny = day.receitas.length || day.despesas.length || day.billsReceita.length || day.billsDespesa.length;

            const group = (title, items, color, isProj) => {
                if (!items.length) return '';
                return `<div style="margin-bottom:0.875rem; ${isProj ? 'opacity:0.75;' : ''}">
                    <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-muted); margin-bottom:0.4rem;">${title}</div>
                    ${items.map(m => `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:3px 0; border-bottom:1px solid var(--border);">
                        <span style="color:var(--text-secondary);">${m.description || m.category || 'Sem categoria'}${m.status === 'overdue' ? ' ⚠' : ''}</span>
                        <span style="font-weight:700; color:${color}; flex-shrink:0; margin-left:0.5rem;">${fmt(m.amount)}</span>
                    </div>`).join('')}
                </div>`;
            };

            detailEl.style.display = 'block';
            detailEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <strong style="font-size:0.9rem; color:var(--text-primary); text-transform:capitalize;">${displayDate}</strong>
                <button id="btn-close-cal-detail" style="background:none; border:none; font-size:1.1rem; cursor:pointer; color:var(--text-muted);">✕</button>
            </div>
            ${!hasAny ? `<p style="color:var(--text-muted); font-size:0.82rem; text-align:center; padding:1rem 0;">Nenhuma movimentação neste dia.</p>` : ''}
            ${group('Receitas realizadas', day.receitas, '#1D9E75', false)}
            ${group('Despesas realizadas', day.despesas, '#E24B4A', false)}
            ${group('A receber (projetado)', day.billsReceita, '#1D9E75', true)}
            ${group('A pagar (projetado)', day.billsDespesa, '#E24B4A', true)}
            <div style="margin-top:0.75rem; text-align:right;">
                <button id="btn-goto-bills-day" style="background:none; border:none; color:var(--accent-blue); font-size:0.8rem; cursor:pointer; font-family:var(--font-family);">Abrir Contas P/R →</button>
            </div>`;

            document.getElementById('btn-close-cal-detail').addEventListener('click', () => {
                detailEl.style.display = 'none';
            });

            document.getElementById('btn-goto-bills-day')?.addEventListener('click', () => {
                document.getElementById('tab-bills')?.click();
                detailEl.style.display = 'none';
            });
        }

        container.querySelector('#cal-prev').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 1) { currentMonth = 12; currentYear--; }
            loadMonth(currentYear, currentMonth);
        });

        container.querySelector('#cal-next').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 12) { currentMonth = 1; currentYear++; }
            loadMonth(currentYear, currentMonth);
        });

        container.querySelector('#cal-today').addEventListener('click', () => {
            currentYear  = new Date().getFullYear();
            currentMonth = new Date().getMonth() + 1;
            loadMonth(currentYear, currentMonth);
        });

        loadMonth(currentYear, currentMonth);
    }

    return { renderCalendario };

})();

window.CalendarioModule = CalendarioModule;
window.renderCalendario = CalendarioModule.renderCalendario;
