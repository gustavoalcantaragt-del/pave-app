// ============================================================
// PAVE — Supabase Edge Function: asaas-webhook
// Recebe notificações do ASAAS e atualiza o status da
// assinatura na tabela `subscriptions`.
//
// Deploy:
//   supabase functions deploy asaas-webhook --no-verify-jwt
//
// Configurar no painel ASAAS:
//   Configurações → Integrações → Webhooks
//   URL: https://<project>.supabase.co/functions/v1/asaas-webhook
//   Eventos: PAYMENT_CONFIRMED, PAYMENT_OVERDUE, SUBSCRIPTION_INACTIVATED
//
// Variáveis de ambiente (supabase secrets set):
//   ASAAS_WEBHOOK_TOKEN — token gerado no painel ASAAS (opcional, mas recomendado)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Mapa: evento ASAAS → status PAVE
const EVENT_STATUS_MAP: Record<string, string> = {
  PAYMENT_CONFIRMED:          'active',
  PAYMENT_RECEIVED:           'active',
  PAYMENT_OVERDUE:            'past_due',
  PAYMENT_DELETED:            'canceled',
  SUBSCRIPTION_INACTIVATED:   'canceled',
  PAYMENT_RESTORED:           'active',
};

serve(async (req) => {
  // Apenas POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // ── Verificar token do webhook (se configurado) ───────────
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (webhookToken) {
      const authHeader = req.headers.get('asaas-access-token') ?? '';
      if (authHeader !== webhookToken) {
        console.warn('asaas-webhook: token inválido');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // ── Parsear payload ───────────────────────────────────────
    const payload = await req.json();
    const event   = payload.event as string;         // ex: 'PAYMENT_CONFIRMED'
    const payment = payload.payment;                 // objeto do pagamento
    const subscription = payload.subscription;       // objeto da assinatura (alguns eventos)

    console.log(`asaas-webhook: event=${event}`);

    // Ignorar eventos não mapeados
    if (!EVENT_STATUS_MAP[event]) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });
    }

    const newStatus = EVENT_STATUS_MAP[event];

    // ── Cliente admin do Supabase ─────────────────────────────
    const _sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ID da assinatura ASAAS
    const asaasSubId =
      subscription?.id ??
      payment?.subscription ??   // pagamentos vinculados à assinatura
      null;

    if (!asaasSubId) {
      console.warn('asaas-webhook: asaasSubId não encontrado no payload');
      return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200 });
    }

    // ── Buscar assinatura no Supabase pelo ID ASAAS ───────────
    const { data: subRow, error: fetchErr } = await _sb
      .from('subscriptions')
      .select('id, user_id, status')
      .eq('asaas_subscription_id', asaasSubId)
      .single();

    if (fetchErr || !subRow) {
      console.warn(`asaas-webhook: subscription não encontrada para asaasSubId=${asaasSubId}`);
      // Retornar 200 para o ASAAS não retentar
      return new Response(JSON.stringify({ ok: true, not_found: true }), { status: 200 });
    }

    // ── Calcular datas do período atual (se pagamento confirmado) ──
    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'active' && payment) {
      const dueDate = payment.dueDate ? new Date(payment.dueDate) : new Date();
      // Próximo período: +1 mês (MONTHLY) ou +1 ano (YEARLY)
      const periodStart = new Date(dueDate);
      const periodEnd   = new Date(dueDate);

      // Inferir ciclo pelo valor (heurística simples)
      // ASAAS inclui subscription.cycle se disponível
      const cycle = subscription?.cycle ?? 'MONTHLY';
      if (cycle === 'YEARLY') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      updates.current_period_start = periodStart.toISOString();
      updates.current_period_end   = periodEnd.toISOString();
    }

    // ── Atualizar no Supabase ─────────────────────────────────
    const { error: updateErr } = await _sb
      .from('subscriptions')
      .update(updates)
      .eq('id', subRow.id);

    if (updateErr) {
      console.error('asaas-webhook: erro ao atualizar subscription', updateErr);
      return new Response(JSON.stringify({ ok: false, error: updateErr.message }), { status: 500 });
    }

    console.log(`asaas-webhook: subscription ${subRow.id} → status=${newStatus}`);

    // ── Enviar notificação (opcional) ─────────────────────────
    // Aqui poderia acionar envio de email via Resend/SendGrid se quiser.

    return new Response(JSON.stringify({ ok: true, status: newStatus }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

  } catch (err) {
    console.error('asaas-webhook: erro inesperado', err);
    // Retornar 200 para o ASAAS não retentar indefinidamente
    return new Response(JSON.stringify({ ok: false, error: 'internal error' }), { status: 200 });
  }
});
