// ── PAVE Event Bus ───────────────────────────────────────────────────────────
// Canal de comunicação entre módulos sem acoplamento direto.
// Uso: PaveEvents.on('pave:caixa-updated', fn) / PaveEvents.emit('pave:caixa-updated', { mes })
const PaveEvents = (function() {
    const _listeners = {};

    function on(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(fn);
    }

    function off(event, fn) {
        if (!_listeners[event]) return;
        _listeners[event] = _listeners[event].filter(f => f !== fn);
    }

    function emit(event, data) {
        (_listeners[event] || []).forEach(fn => {
            try { fn(data); } catch(e) { console.error(`[PaveEvents] ${event}:`, e); }
        });
    }

    return { on, off, emit };
})();

window.PaveEvents = PaveEvents;
