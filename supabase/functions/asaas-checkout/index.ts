// ============================================================
// PAVE — Supabase Edge Function: asaas-checkout
// Cria um cliente e uma cobrança no ASAAS a partir dos dados
// enviados pelo checkout.html
//
// Deploy:
//   supabase functions deploy asaas-checkout --no-verify-jwt
//
// Variáveis de ambiente necessárias (supabase secrets set):
//   ASAAS_API_KEY   — chave da API ASAAS ($aact_...)
//   ASAAS_ENV       — "sandbox" | "production"
//   APP_URL         — URL do app (ex: https://pave.app.br)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ASAAS_BASE = {
  sandbox:    'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/api/v3',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Variáveis de ambiente ─────────────────────────────────
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
    const ASAAS_ENV     = (Deno.env.get('ASAAS_ENV') ?? 'sandbox') as 'sandbox' | 'production';
    const APP_URL       = Deno.env.get('APP_URL') ?? 'http://localhost:3000';
    const BASE_URL      = ASAAS_BASE[ASAAS_ENV];

    if (!ASAAS_API_KEY) {
      return jsonError('ASAAS_API_KEY não configurada', 500);
    }

    // ── Auth — verificar usuário logado ───────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const _sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await _sb.auth.getUser();
    if (authErr || !user) return jsonError('Não autorizado', 401);

    // ── Payload do frontend ───────────────────────────────────
    const body = await req.json();
    const {
      plano,          // 'starter' | 'pro' | 'clinic'
      ciclo,          // 'mensal' | 'anual'
      nome,
      cpfCnpj,
      email,
      telefone,
      formaPagamento, // 'PIX' | 'BOLETO' | 'CREDIT_CARD'
      // Cartão (apenas se formaPagamento === 'CREDIT_CARD')
      cardHolder,
      cardNumber,
      cardExpiry,
      cardCvv,
    } = body;

    // ── Preço por plano/ciclo ─────────────────────────────────
    const PRECOS: Record<string, { mensal: number; anual: number }> = {
      starter: { mensal: 59,  anual: 590  },
      pro:     { mensal: 119, anual: 1190 },
      clinic:  { mensal: 199, anual: 1990 },
    };

    if (!PRECOS[plano]) return jsonError(`Plano inválido: ${plano}`, 400);
    const valor = PRECOS[plano][ciclo === 'anual' ? 'anual' : 'mensal'];
    const cycle = ciclo === 'anual' ? 'YEARLY' : 'MONTHLY';

    // ── Criar ou recuperar cliente no ASAAS ──────────────────
    const customerId = await getOrCreateCustomer(BASE_URL, ASAAS_API_KEY, {
      name: nome,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      email,
      mobilePhone: telefone.replace(/\D/g, ''),
    });

    // ── Criar assinatura no ASAAS ─────────────────────────────
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1); // primeiro vencimento amanhã
    const nextDueDate = nextDue.toISOString().split('T')[0];

    const subPayload: Record<string, unknown> = {
      customer:          customerId,
      billingType:       formaPagamento,  // PIX | BOLETO | CREDIT_CARD
      value:             valor,
      nextDueDate,
      cycle,
      description:       `PAVE ${plano.toUpperCase()} — ${ciclo === 'anual' ? 'Anual' : 'Mensal'}`,
      externalReference: user.id,         // user_id Supabase para webhook
      callback: {
        successUrl: `${APP_URL}/balanco-web/checkout.html?success=1`,
        autoRedirect: true,
      },
    };

    // Dados do cartão (se necessário)
    if (formaPagamento === 'CREDIT_CARD' && cardNumber) {
      const [expM, expY] = (cardExpiry ?? '').split('/');
      subPayload.creditCard = {
        holderName:         cardHolder,
        number:             cardNumber.replace(/\s/g, ''),
        expiryMonth:        expM?.trim(),
        expiryYear:         `20${expY?.trim()}`,
        ccv:                cardCvv,
      };
      subPayload.creditCardHolderInfo = {
        name:     nome,
        email,
        cpfCnpj:  cpfCnpj.replace(/\D/g, ''),
        mobilePhone: telefone.replace(/\D/g, ''),
      };
      subPayload.remoteIp = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    }

    const asaasSub = await asaasPost(BASE_URL, ASAAS_API_KEY, '/subscriptions', subPayload);

    if (asaasSub.errors) {
      const msg = asaasSub.errors.map((e: { description: string }) => e.description).join('; ');
      return jsonError(`Erro ASAAS: ${msg}`, 422);
    }

    // ── Salvar assinatura pendente no Supabase ────────────────
    const _sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar plan_id pelo name
    const { data: planRow } = await _sbAdmin
      .from('plans')
      .select('id')
      .eq('name', plano)
      .single();

    await _sbAdmin.from('subscriptions').upsert({
      user_id:               user.id,
      plan_id:               planRow?.id ?? null,
      status:                'pending',  // webhook vai confirmar
      asaas_subscription_id: asaasSub.id,
      asaas_customer_id:     customerId,
    }, { onConflict: 'user_id' });

    // ── Resposta ──────────────────────────────────────────────
    // ASAAS devolve invoiceUrl ou bankSlipUrl ou pixQrCode dependendo do tipo
    const paymentUrl =
      asaasSub.invoiceUrl ??
      asaasSub.bankSlipUrl ??
      null;

    return json({
      ok:          true,
      paymentUrl,
      asaasSubId:  asaasSub.id,
      billingType: formaPagamento,
      // Para PIX, inclui QR Code se disponível
      pixPayload:  asaasSub.pixTransaction?.payload ?? null,
      pixQrCode:   asaasSub.pixTransaction?.encodedImage ?? null,
    });

  } catch (err) {
    console.error('asaas-checkout error:', err);
    return jsonError('Erro interno do servidor', 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────

async function getOrCreateCustomer(
  base: string,
  key: string,
  data: { name: string; cpfCnpj: string; email: string; mobilePhone: string }
): Promise<string> {
  // Verificar se cliente já existe pelo CPF/CNPJ
  const search = await asaasGet(base, key, `/customers?cpfCnpj=${data.cpfCnpj}&limit=1`);
  if (search.data?.length > 0) return search.data[0].id;

  // Criar novo cliente
  const created = await asaasPost(base, key, '/customers', data);
  return created.id;
}

async function asaasPost(base: string, key: string, path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method:  'POST',
    headers: {
      'accept':        'application/json',
      'content-type':  'application/json',
      'access_token':  key,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function asaasGet(base: string, key: string, path: string) {
  const res = await fetch(`${base}${path}`, {
    headers: {
      'accept':       'application/json',
      'access_token': key,
    },
  });
  return res.json();
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function jsonError(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}
