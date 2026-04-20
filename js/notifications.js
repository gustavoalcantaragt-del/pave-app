// ============================================================
// notifications.js — Sistema de Alertas de Vencimento
// Feature 1.4 — Fase 1 do PAVE
// Usa #notif-btn-topbar e #notif-badge-count já existentes no HTML
// ============================================================

const NotificationsModule = (() => {

    let _panelOpen = false;
    let _outsideHandler = null;

    // ── BUSCAR CONTAS PRÓXIMAS ────────────────────────────────────────────────

    async function fetchUpcoming(daysAhead = 7) {
        const orgId = await OrgAPI.getOrgId();
        if (!orgId) return [];

        const today    = new Date().toISOString().split('T')[0];
        const deadline = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];

        const { data, error } = await _supabase
            .from('bills')
            .select('id, type, description, amount, due_date, status')
            .eq('organization_id', orgId)
            .in('status', ['open', 'overdue'])
            .lte('due_date', deadline)
            .order('due_date', { ascending: true });

        if (error) { console.warn('notifications fetch:', error); return []; }
        return data || [];
    }

    // ── BADGE ─────────────────────────────────────────────────────────────────

    function _computeBadge(bills) {
        const overdue  = bills.filter(b => b.status === 'overdue').length;
        const upcoming = bills.filter(b => b.status === 'open').length;
        return { count: bills.length, overdue, upcoming, color: overdue > 0 ? 'red' : 'yellow' };
    }

    function _renderBadge(badge) {
        // Usa o botão já existente no HTML — nunca cria um segundo
        const btn     = document.getElementById('notif-btn-topbar');
        const countEl = document.getElementById('notif-badge-count');
        if (!btn) return;

        if (badge.count === 0) {
            btn.classList.remove('notif-has-alert', 'notif-red', 'notif-yellow');
            if (countEl) { countEl.textContent = ''; countEl.style.display = 'none'; }
            return;
        }

        btn.classList.add('notif-has-alert');
        btn.classList.toggle('notif-red',    badge.color === 'red');
        btn.classList.toggle('notif-yellow', badge.color === 'yellow');
        if (countEl) {
            countEl.textContent = badge.count;
            countEl.style.display = '';
        }
    }

    // ── PAINEL ────────────────────────────────────────────────────────────────

    function _renderPanel(bills) {
        const fmt      = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
        const fmtDate  = d => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
        const typeLabel = t => t === 'payable' ? 'A Pagar' : 'A Receber';

        return `
        <div id="notif-panel" class="notif-panel">
            <div class="notif-panel-header">
                <strong>Contas próximas / vencidas</strong>
                <button id="btn-close-notif" class="notif-close-btn" title="Fechar">✕</button>
            </div>
            ${bills.length === 0
                ? '<p class="notif-empty">Nenhuma conta urgente nos próximos 7 dias.</p>'
                : bills.map(b => `
                    <div class="notif-item notif-status-${b.status}">
                        <div class="notif-item-main">
                            <span class="notif-desc">${b.description}</span>
                            <span class="notif-amount">${fmt(b.amount)}</span>
                        </div>
                        <div class="notif-item-meta">
                            <span class="notif-type">${typeLabel(b.type)}</span>
                            <span class="notif-date ${b.status === 'overdue' ? 'notif-overdue' : ''}">
                                ${b.status === 'overdue' ? '⚠ Vencida em ' : '📅 '}${fmtDate(b.due_date)}
                            </span>
                        </div>
                    </div>`).join('')
            }
            <div class="notif-footer">
                <a href="#" id="notif-goto-bills">Ver todas as contas →</a>
            </div>
        </div>`;
    }

    function _togglePanel() {
        const existing = document.getElementById('notif-panel');
        if (_panelOpen && existing) {
            existing.remove();
            _panelOpen = false;
            if (_outsideHandler) { document.removeEventListener('click', _outsideHandler); _outsideHandler = null; }
            return;
        }

        fetchUpcoming().catch(() => []).then(bills => {
            document.getElementById('notif-panel')?.remove();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = _renderPanel(bills);
            document.body.appendChild(wrapper.firstChild);
            _panelOpen = true;

            const _removeOutside = () => {
                if (_outsideHandler) {
                    document.removeEventListener('click', _outsideHandler);
                    _outsideHandler = null;
                }
            };

            document.getElementById('btn-close-notif')?.addEventListener('click', () => {
                document.getElementById('notif-panel')?.remove();
                _panelOpen = false;
                _removeOutside();
            });

            document.getElementById('notif-goto-bills')?.addEventListener('click', e => {
                e.preventDefault();
                document.getElementById('tab-bills')?.click();
                document.getElementById('notif-panel')?.remove();
                _panelOpen = false;
                _removeOutside();
            });

            // Fechar ao clicar fora
            setTimeout(() => {
                // Limpa handler anterior mesmo que tenha sido criado em outro setTimeout ainda pendente
                if (_outsideHandler) { document.removeEventListener('click', _outsideHandler); _outsideHandler = null; }
                _outsideHandler = (ev) => {
                    const panel = document.getElementById('notif-panel');
                    const btn   = document.getElementById('notif-btn-topbar');
                    if (panel && !panel.contains(ev.target) && ev.target !== btn && !btn?.contains(ev.target)) {
                        panel.remove();
                        _panelOpen = false;
                        _removeOutside();
                    }
                };
                document.addEventListener('click', _outsideHandler);
            }, 100);
        });
    }

    // ── INIT / REFRESH ────────────────────────────────────────────────────────

    async function init() {
        // Conecta o botão existente no HTML ao painel — uma única vez
        const btn = document.getElementById('notif-btn-topbar');
        if (btn && !btn.dataset.notifWired) {
            btn.addEventListener('click', () => _togglePanel());
            btn.dataset.notifWired = '1';
        }

        try {
            const bills = await fetchUpcoming();
            _renderBadge(_computeBadge(bills));
            _sendOsNotifications(bills); // OS notification — 1x/dia, não bloqueia
        } catch (err) {
            console.warn('NotificationsModule.init:', err);
        }
    }

    async function refresh() {
        try {
            const bills = await fetchUpcoming();
            _renderBadge(_computeBadge(bills));

            // Atualizar painel aberto se existir
            const panel = document.getElementById('notif-panel');
            if (panel) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = _renderPanel(bills);
                const newPanel = wrapper.firstChild;
                panel.replaceWith(newPanel);
                newPanel.querySelector('#btn-close-notif')?.addEventListener('click', () => {
                    newPanel.remove();
                    _panelOpen = false;
                });
            }
        } catch (err) {
            console.warn('NotificationsModule.refresh:', err);
        }
    }

    // ── OS NOTIFICATIONS (Notification API — sem servidor) ────────────────────
    // Solicita permissão e dispara notificação nativa do OS para contas urgentes.
    // Dispara no máximo 1x por dia (controla via localStorage).

    const _OS_NOTIF_KEY = 'pav_os_notif_sent_at';
    const _OS_NOTIF_TTL = 23 * 60 * 60 * 1000; // 23h

    async function _sendOsNotifications(bills) {
        if (!('Notification' in window)) return;

        const lastSent = parseInt(localStorage.getItem(_OS_NOTIF_KEY) || '0', 10);
        if (Date.now() - lastSent < _OS_NOTIF_TTL) return; // já enviou hoje

        // Pede permissão apenas se ainda não decidiu
        if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;
        }
        if (Notification.permission !== 'granted') return;

        const overdue  = bills.filter(b => b.status === 'overdue');
        const upcoming = bills.filter(b => b.status === 'open');

        if (overdue.length > 0) {
            new Notification('PAVE — Contas vencidas', {
                body:  `${overdue.length} conta(s) vencida(s). Acesse o app para regularizar.`,
                icon:  '/assets/favicon.svg',
                tag:   'pave-overdue',
                requireInteraction: true
            });
        } else if (upcoming.length > 0) {
            new Notification('PAVE — Vencimentos próximos', {
                body:  `${upcoming.length} conta(s) vencem nos próximos 7 dias.`,
                icon:  '/assets/favicon.svg',
                tag:   'pave-upcoming'
            });
        }

        if (overdue.length + upcoming.length > 0) {
            localStorage.setItem(_OS_NOTIF_KEY, String(Date.now()));
        }
    }

    return { init, refresh, fetchUpcoming };

})();

window.NotificationsModule = NotificationsModule;
