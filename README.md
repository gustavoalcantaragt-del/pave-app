# PAVE — Gestão Financeira para Clínicas Veterinárias

Sistema web de gestão financeira e precificação desenvolvido para clínicas veterinárias.

> **Status atual:** Ambiente de testes internos. Não disponível publicamente.

---

## Stack

- **Frontend:** HTML + CSS + JavaScript (vanilla) — sem framework, sem build step
- **Banco de dados:** Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Qualquer servidor de arquivos estáticos (Netlify, Vercel, GitHub Pages, Apache)

---

## Funcionalidades

- Dashboard com KPIs financeiros
- Caixa Diário (contas a pagar/receber)
- Balanço Mensal com DRE
- Calculadora de Precificação com margem real
- Relatórios e exportação PDF/Excel
- Simulador de Cenários What-If
- Autenticação com Supabase Auth
- Persistência de dados na nuvem via Supabase

---

## Rodar localmente

Não há dependências de build. Basta servir os arquivos estáticos:

```bash
# Opção 1 — VS Code Live Server
# Instale a extensão Live Server e clique em "Open with Live Server" no index.html

# Opção 2 — Python
python -m http.server 3000
# Acesse: http://localhost:3000

# Opção 3 — Node.js (npx)
npx serve . -p 3000
# Acesse: http://localhost:3000
```

---

## Configurar variáveis de ambiente

O arquivo `js/config.js` contém a configuração de conexão com o Supabase:

```js
const PAV_CONFIG = {
    SUPABASE_URL:      'https://SEU_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'sua_anon_key_aqui'
};
```

Para desenvolvimento local, copie o exemplo e preencha:

```bash
cp js/config.js.example js/config.js
```

Encontre as chaves em: **Supabase Dashboard → Project Settings → API**

---

## Configurar banco de dados (Supabase)

### 1. Criar projeto no Supabase

Acesse [supabase.com](https://supabase.com) e crie um novo projeto.

### 2. Executar a migration

No **Supabase Dashboard → SQL Editor**, execute o arquivo:

```
supabase/migrations/001_initial.sql
```

Isso criará todas as tabelas, políticas RLS, triggers e dados iniciais (planos).

### 3. Verificar tabelas criadas

- `organizations` — clínicas cadastradas
- `plans` — planos de assinatura (Starter/Pro/Clinic)
- `subscriptions` — assinaturas dos usuários (trial automático)
- `financial_entries` — balanços mensais
- `cash_movements` — movimentações de caixa
- `services` — serviços precificados
- `profit_config` — configuração de divisão do lucro

### 4. Configurar Auth

No **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** URL do seu deploy (ex: `https://pave.seudominio.com.br`)
- **Redirect URLs:** adicionar `https://pave.seudominio.com.br/email-confirmado.html`

---

## Estrutura do projeto

```
balanco-web/
├── index.html              # App principal (dashboard, caixa, finanças, precificação)
├── login.html              # Login, cadastro e recuperação de senha
├── planos.html             # Página de planos e preços
├── checkout.html           # Finalizar assinatura
├── landing.html            # Landing page marketing
├── email-confirmado.html   # Confirmação de e-mail
├── css/
│   └── pav-design-system.css   # Design system completo
├── js/
│   ├── config.js           # Configuração Supabase (NÃO commitar chaves reais em produção)
│   ├── api.js              # Client Supabase + Auth + APIs de dados
│   ├── login.js            # Lógica de login/cadastro
│   ├── dashboard-premium.js
│   ├── caixa-premium.js
│   ├── catalogo-premium.js
│   ├── simulador-premium.js
│   ├── configuracoes-premium.js
│   ├── tabs-premium.js
│   ├── calculos.js
│   └── utils-premium.js
├── supabase/
│   ├── config.toml             # Configuração Supabase CLI
│   ├── migrations/
│   │   └── 001_initial.sql     # Schema completo do banco
│   └── functions/
│       ├── asaas-checkout/     # Edge Function (pagamento — não ativo)
│       └── asaas-webhook/      # Edge Function (webhook — não ativo)
└── assets/                 # Ícones e imagens
```

---

## Criar usuários de teste

No **Supabase Dashboard → Authentication → Users → Add user**:

Crie um usuário para cada membro da equipe de testes. O sistema cria o trial de 14 dias automaticamente via trigger.

Ou via SQL Editor:

```sql
-- Criar usuário de teste (substitua email e senha)
SELECT auth.sign_up('teste@suaclinica.com.br', 'Senha@2025');
```

---

## Controle de acesso

- Apenas usuários autenticados acessam o sistema
- RLS (Row Level Security) ativo em todas as tabelas — cada usuário acessa apenas seus dados
- Trial de 14 dias criado automaticamente no cadastro
- Gateway de pagamento **não configurado** neste estágio

---

## Próximos passos (pós-testes)

- [ ] Integrar gateway de pagamento ASAAS
- [ ] Ativar Edge Functions `asaas-checkout` e `asaas-webhook`
- [ ] Configurar domínio personalizado
- [ ] Configurar SSL
- [ ] Configurar emails transacionais (Resend ou SendGrid)

---

## Contato

Dúvidas ou problemas: abra uma issue no repositório.
