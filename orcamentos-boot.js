const oldButton = document.getElementById('new-budget');
if (oldButton) {
  const button = oldButton.cloneNode(true);
  button.id = 'new-budget-v2';
  oldButton.replaceWith(button);
  button.addEventListener('click', () => window.PorcelaneQuotes?.openEditor());
}
