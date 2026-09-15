/* PORCELANE — regra comercial por ambiente
 * Regra: o desconto percentual aplicado ao pedido é o mesmo percentual aplicado
 * ao valor bruto de cada ambiente. Nunca distribuir o desconto em valor fixo.
 */

export function calcularDescontoAmbiente(valorBruto, descontoPercentual = 0) {
  const bruto = Math.max(Number(valorBruto) || 0, 0);
  const pct = Math.max(Number(descontoPercentual) || 0, 0);
  return Math.round((bruto * pct / 100) * 100) / 100;
}

export function calcularValorLiquidoAmbiente(valorBruto, descontoPercentual = 0) {
  const bruto = Math.max(Number(valorBruto) || 0, 0);
  return Math.round((bruto - calcularDescontoAmbiente(bruto, descontoPercentual)) * 100) / 100;
}

export function ratearDescontoNosAmbientes(ambientes = [], descontoPercentual = 0) {
  return ambientes.map(ambiente => {
    const bruto = Math.max(Number(ambiente.valor_bruto ?? ambiente.valorBruto) || 0, 0);
    const desconto = calcularDescontoAmbiente(bruto, descontoPercentual);
    return {
      ...ambiente,
      valor_bruto: bruto,
      desconto_percentual: Number(descontoPercentual) || 0,
      desconto_valor: desconto,
      valor_liquido: Math.round((bruto - desconto) * 100) / 100
    };
  });
}

export function calcularProdutividadeItem({ quantidade = 0, tipoCalculo, valorUnitario = 0, percentual = 0, basePercentual = 0 }) {
  const qtd = Math.max(Number(quantidade) || 0, 0);
  if (tipoCalculo === 'percentual') {
    return Math.round((Math.max(Number(basePercentual) || 0, 0) * Math.max(Number(percentual) || 0, 0) / 100) * 100) / 100;
  }
  return Math.round((qtd * Math.max(Number(valorUnitario) || 0, 0)) * 100) / 100;
}

window.PorcelaneComercial = {
  calcularDescontoAmbiente,
  calcularValorLiquidoAmbiente,
  ratearDescontoNosAmbientes,
  calcularProdutividadeItem
};
