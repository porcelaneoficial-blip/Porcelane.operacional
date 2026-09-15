const oldButton = document.getElementById('new-budget');
if (oldButton) {
  const button = oldButton.cloneNode(true);
  button.id = 'new-budget-v2';
  oldButton.replaceWith(button);
  button.addEventListener('click', () => window.PorcelaneQuotes?.openEditor());
}
import('./orcamentos-finalizacao.js').catch(error => console.error('Orçamentos finalização:', error));
import('./operacional-correcoes.js').catch(error => console.error('Correções operacionais:', error));
setTimeout(() => window.PorcelaneQuotes?.refreshBudgetList(), 1800);
