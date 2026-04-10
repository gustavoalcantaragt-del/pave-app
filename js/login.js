// ============================================================
// PAVE — Login & Cadastro
// ============================================================

// ── ABAS (Entrar / Criar Conta) ──────────────────────────────
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector(`[onclick="switchAuthTab('${tab}')"]`).classList.add('active');
    document.getElementById('pane-' + tab).classList.add('active');
}

// ── WIZARD — NAVEGAÇÃO ───────────────────────────────────────
let currentStep = 1;
const totalSteps = 3;

function updateDots(step) {
    for (let i = 1; i <= totalSteps; i++) {
        const dot = document.getElementById('dot' + i);
        if (!dot) continue;
        dot.className = 'step-dot';
        if (i < step) {
            dot.classList.add('done');
            dot.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        } else if (i === step) {
            dot.classList.add('active');
            dot.innerHTML = i;
        } else {
            dot.innerHTML = i;
        }
    }
}

function showStep(n) {
    document.querySelectorAll('.wizard-page').forEach(p => p.classList.remove('active'));
    document.getElementById('wizard-' + n).classList.add('active');
    updateDots(n);
    currentStep = n;
}

function wizardBack(from) { showStep(from - 1); }

function wizardNext(from) {
    const msg = document.getElementById('msg' + from);
    msg.style.display = 'none';

    if (from === 1) {
        const nome = document.getElementById('reg-clinica-nome').value.trim();
        if (!nome) { msg.textContent = 'Informe o nome da clínica para continuar.'; msg.style.display = 'block'; return; }
    }
    if (from === 2) {
        const resp = document.getElementById('reg-responsavel').value.trim();
        if (!resp) { msg.textContent = 'Informe o nome do responsável.'; msg.style.display = 'block'; return; }
    }
    showStep(from + 1);
}

// ── WIZARD — FINALIZAR CADASTRO ──────────────────────────────
async function wizardFinish() {
    const msg   = document.getElementById('msg3');
    const msgOk = document.getElementById('msg3-success');
    const btn   = document.querySelector('#wizard-3 .auth-btn');
    msg.style.display   = 'none';
    msgOk.style.display = 'none';

    const email  = document.getElementById('reg-email').value.trim();
    const senha  = document.getElementById('reg-senha').value;
    const senha2 = document.getElementById('reg-senha2').value;

    if (!email) { msg.textContent = 'Informe o e-mail.'; msg.style.display = 'block'; return; }
    if (senha.length < 6) { msg.textContent = 'A senha deve ter ao menos 6 caracteres.'; msg.style.display = 'block'; return; }
    if (senha !== senha2) { msg.textContent = 'As senhas não coincidem.'; msg.style.display = 'block'; return; }

    const origText = btn.textContent;
    btn.textContent = 'Criando conta...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // Dados da clínica coletados no wizard
    const clinicaData = {
        nome:         document.getElementById('reg-clinica-nome').value.trim(),
        cnpj:         document.getElementById('reg-cnpj').value.trim(),
        crmv:         document.getElementById('reg-crmv').value.trim(),
        cidade:       document.getElementById('reg-cidade').value.trim(),
        estado:       document.getElementById('reg-estado').value,
        responsavel:  document.getElementById('reg-responsavel').value.trim(),
        regime:       document.getElementById('reg-regime').value,
        funcionarios: parseInt(document.getElementById('reg-funcionarios').value) || 0,
        diasSemana:   parseInt(document.getElementById('reg-dias-semana').value) || 5,
    };

    // Salva localmente (disponível imediatamente no app)
    localStorage.setItem('pav_clinica',    JSON.stringify(clinicaData));
    localStorage.setItem('pav_brand_nome', clinicaData.nome);
    localStorage.setItem('pav_brand_resp', `${clinicaData.responsavel}${clinicaData.crmv ? ' — ' + clinicaData.crmv : ''}`);

    // 1) Registra no Supabase Auth
    const result = await Auth.register(email, senha);

    if (!result || !result.ok) {
        const errorMsg = (result?.error || '').toLowerCase();
        if (errorMsg.includes('already') || errorMsg.includes('registered') || errorMsg.includes('existe')) {
            msg.textContent = 'Este e-mail já está cadastrado. Faça login.';
        } else if (errorMsg.includes('connection') || errorMsg.includes('fetch')) {
            msg.textContent = 'Servidor temporariamente indisponível. Verifique sua conexão.';
        } else {
            msg.textContent = result?.error || 'Não foi possível criar a conta. Tente novamente.';
        }
        msg.style.display = 'block';
        btn.textContent = origText;
        btn.disabled = false;
        btn.style.opacity = '';
        return;
    }

    // 2) Login automático
    btn.textContent = 'Configurando...';
    const loginResult = await Auth.login(email, senha);

    if (loginResult?.ok) {
        // 3) Cria organização no Supabase
        await OrgAPI.create(clinicaData);

        btn.textContent = 'Conta criada!';
        btn.style.background = 'var(--color-success)';
        msgOk.textContent = 'Conta criada com sucesso! Redirecionando...';
        msgOk.style.display = 'block';
        setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
        // Registro OK mas login falhou — raro, direciona para login manual
        msg.textContent = 'Conta criada! Faça login para continuar.';
        msg.style.display = 'block';
        btn.textContent = origText;
        btn.disabled = false;
        btn.style.opacity = '';
        setTimeout(() => switchAuthTab('login'), 2000);
    }
}

// ── LOGIN ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

    // Redirecionar se já autenticado
    if (Auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Form de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const msg = document.getElementById('loginMsg');
            const btn = this.querySelector('[type="submit"]');
            msg.style.display = 'none';

            const origText = btn.textContent;
            btn.textContent = 'Entrando...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const result   = await Auth.login(email, password);

            if (result && result.ok) {
                btn.textContent = 'Redirecionando...';
                btn.style.background = 'var(--color-success)';
                window.location.href = 'index.html';
            } else {
                const errorStr = (result?.error || '').toLowerCase();
                if (errorStr.includes('connection') || errorStr.includes('fetch') || !result) {
                    msg.textContent = 'Servidor indisponível. Verifique sua conexão e tente novamente.';
                } else if (errorStr.includes('invalid') || errorStr.includes('credentials') || errorStr.includes('password')) {
                    msg.textContent = 'E-mail ou senha incorretos.';
                } else if (errorStr.includes('rate') || errorStr.includes('too many')) {
                    msg.textContent = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
                } else if (errorStr.includes('email not confirmed')) {
                    msg.textContent = 'E-mail não confirmado. Verifique sua caixa de entrada.';
                } else {
                    msg.textContent = result?.error || 'E-mail ou senha incorretos.';
                }
                msg.style.display = 'block';
                btn.textContent = origText;
                btn.disabled = false;
                btn.style.opacity = '';
            }
        });
    }

    // Form de recuperação de senha
    const resetForm = document.getElementById('resetForm');
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const msg    = document.getElementById('resetMsg');
            const msgOk  = document.getElementById('resetMsgOk');
            const btn    = this.querySelector('[type="submit"]');
            msg.style.display   = 'none';
            msgOk.style.display = 'none';

            const email = document.getElementById('resetEmail').value.trim();
            if (!email) { msg.textContent = 'Informe o e-mail cadastrado.'; msg.style.display = 'block'; return; }

            const origText = btn.textContent;
            btn.textContent = 'Enviando...';
            btn.disabled = true;
            btn.style.opacity = '0.7';

            const result = await Auth.resetPassword(email);

            if (result.ok) {
                msgOk.textContent = 'Enviamos um link de redefinição para ' + email + '. Verifique sua caixa de entrada.';
                msgOk.style.display = 'block';
                btn.textContent = 'Enviado!';
                btn.style.background = 'var(--color-success)';
            } else {
                msg.textContent = result.error || 'Não foi possível enviar. Tente novamente.';
                msg.style.display = 'block';
                btn.textContent = origText;
                btn.disabled = false;
                btn.style.opacity = '';
            }
        });
    }
});

// ── HELPERS ──────────────────────────────────────────────────
function showResetPane() {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('pane-reset').classList.add('active');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
}

function backToLogin() {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('pane-login').classList.add('active');
    document.querySelector('[onclick="switchAuthTab(\'login\')"]')?.classList.add('active');
}
