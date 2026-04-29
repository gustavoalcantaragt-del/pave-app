/**
 * Módulo de cálculos financeiros compartilhado
 * Usado tanto no frontend quanto no backend
 */

function calcularTotais(dados) {
  const totalVariaveis =
    (dados.reembolsoInadimplencia || 0) +
    (dados.impostos || 0) +
    (dados.taxasCartao || 0) +
    (dados.insumos || 0) +
    (dados.boletosFornecedores || 0) +
    (dados.terceirizadosVar || 0) +
    (dados.labTerceirizado || 0) +
    (dados.comissoes || 0) +
    (dados.plantoes || 0) +
    (dados.escritorioLimpezaVar || 0) +
    (dados.estorno || 0) +
    (dados.outrosVariaveis || 0);

  const totalFixos =
    (dados.folha || 0) +
    (dados.agua || 0) +
    (dados.luz || 0) +
    (dados.sistemas || 0) +
    (dados.aluguel || 0) +
    (dados.telecom || 0) +
    (dados.contabilidade || 0) +
    (dados.marketing || 0) +
    (dados.esocial || 0) +
    (dados.taxasAdmin || 0) +
    (dados.crmv || 0) +
    (dados.lixoContaminante || 0) +
    (dados.iptu || 0) +
    (dados.limpezaFixa || 0) +
    (dados.terceirizadosFixos || 0) +
    (dados.outrosFixos || 0);

  const margemContribuicao = (dados.faturamento || 0) - totalVariaveis;
  const lucroGerencial = margemContribuicao - totalFixos;

  return {
    faturamento: dados.faturamento || 0,
    totalVariaveis,
    totalFixos,
    margemContribuicao,
    lucroGerencial
  };
}

function calcularDivisaoLucro(lucroGerencial) {
  const lucro = lucroGerencial || 0;
  const totalLucro = lucro > 0 ? lucro : 1;

  // Lê percentuais personalizados do localStorage (configurados na aba Configurações)
  let pProLabore = 0.5, pInvest = 0.3, pReserva = 0.2;
  try {
    const cfg = JSON.parse(localStorage.getItem('pav_divisao_lucro'));
    if (cfg && typeof cfg.proLabore === 'number') {
      pProLabore = cfg.proLabore / 100;
      pInvest    = cfg.investimentos / 100;
      pReserva   = cfg.reserva / 100;
    }
  } catch(e) {}

  return {
    proLabore:    lucro * pProLabore,
    investimentos: lucro * pInvest,
    reserva:      lucro * pReserva,
    emprestimos:  0,
    percentuais: {
      proLabore:    (lucro * pProLabore / totalLucro) * 100,
      investimentos: (lucro * pInvest    / totalLucro) * 100,
      reserva:      (lucro * pReserva   / totalLucro) * 100,
      emprestimos:  0
    }
  };
}

function compararPercentual(real, min, max) {
  if (real < min) return { valor: real.toFixed(1), status: 'abaixo', cor: '#c62828' };
  if (real > max) return { valor: real.toFixed(1), status: 'acima', cor: '#c62828' };
  return { valor: real.toFixed(1), status: 'ok', cor: '#388e3c' };
}

function calcularDivisaoIdeal(lucroGerencial) {
  const divisao = calcularDivisaoLucro(lucroGerencial);

  return {
    ...divisao,
    comparativos: {
      proLabore: compararPercentual(divisao.percentuais.proLabore, 40, 60),
      emprestimos: compararPercentual(divisao.percentuais.emprestimos, 0, 20),
      investimentos: compararPercentual(divisao.percentuais.investimentos, 20, 40),
      reserva: compararPercentual(divisao.percentuais.reserva, 20, 40)
    }
  };
}

// ── Formatação de período — padrão global: Abr/2026 ─────────────────────────
window.formatPeriod = function(mesRef) {
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    if (!mesRef) return '';
    const key = (mesRef + '').substring(0, 7); // garante YYYY-MM
    const [y, m] = key.split('-');
    if (!y || !m) return mesRef;
    return `${MESES[parseInt(m, 10) - 1] || m}/${y}`;
};

// Exportar para Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcularTotais,
    calcularDivisaoLucro,
    compararPercentual,
    calcularDivisaoIdeal
  };
}
