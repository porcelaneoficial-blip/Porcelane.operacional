const CACHE = 'porcelane-operacional-v3';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withGuardrails(source) {
  return `${source}\n\n(() => {\n  const stages = ['Pedido recebido','Conferência','Em produção','Instalação','Finalizado'];\n  const markInitialStatus = () => document.querySelectorAll('#m-status').forEach(select => {\n    if (!select.dataset.initialStatus) select.dataset.initialStatus = select.value;\n  });\n  new MutationObserver(markInitialStatus).observe(document.body, { childList: true, subtree: true });\n  document.addEventListener('focusin', event => {\n    const select = event.target.closest?.('#m-status');\n    if (select && !select.dataset.initialStatus) select.dataset.initialStatus = select.value;\n  });\n  document.addEventListener('click', event => {\n    const save = event.target.closest?.('#modal-ok');\n    if (!save) return;\n    const dialog = save.closest('dialog');\n    if (!dialog) return;\n    const status = dialog.querySelector('#m-status');\n    const measurement = dialog.querySelector('#m-measure');\n    const installation = dialog.querySelector('#m-install');\n    if (!status) return;\n    const current = status.dataset.initialStatus || status.value;\n    const next = status.value;\n    const hasMeasurement = Boolean(measurement?.value);\n    const currentIndex = stages.indexOf(current);\n    const nextIndex = stages.indexOf(next);\n    if (['Conferência','Em produção','Instalação','Finalizado'].includes(next) && !hasMeasurement) {\n      event.preventDefault(); event.stopImmediatePropagation();\n      alert('Registre a data de medição antes de avançar o pedido.'); return;\n    }\n    if (next === 'Em produção' && current !== 'Conferência') {\n      event.preventDefault(); event.stopImmediatePropagation();\n      alert('PRODUÇÃO BLOQUEADA: o pedido precisa passar por Medição/Conferência antes da liberação.'); return;\n    }\n    if (next === 'Instalação' && current !== 'Em produção') {\n      event.preventDefault(); event.stopImmediatePropagation();\n      alert('INSTALAÇÃO BLOQUEADA: o pedido precisa estar em produção antes da instalação.'); return;\n    }\n    if (next === 'Finalizado' && (current !== 'Instalação' || !installation?.value)) {\n      event.preventDefault(); event.stopImmediatePropagation();\n      alert('FINALIZAÇÃO BLOQUEADA: o pedido precisa estar em instalação e ter data de instalação.'); return;\n    }\n    if (currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex) {\n      event.preventDefault(); event.stopImmediatePropagation();\n      alert('O fluxo operacional não permite voltar o pedido para uma etapa anterior.');\n    }\n  }, true);\n\n  const removeFictitiousExamples = () => {\n    const financeiro = document.querySelector('#financeiro .grid-2');\n    if (financeiro) financeiro.innerHTML = '<div class="panel"><h3>Financeiro</h3><p class="empty">Nenhum lançamento financeiro real está conectado ao banco ainda. Os exemplos fixos foram removidos para não misturar dados fictícios com a operação.</p></div><div class="panel"><h3>Próxima etapa</h3><p class="empty">Conectar parcelas, recebimentos, Pix, cartão e comissões ao módulo financeiro.</p></div>';\n    const estoqueBody = document.querySelector('#estoque tbody');\n    if (estoqueBody) estoqueBody.innerHTML = '<tr><td colspan="4" class="empty">Estoque aguardando conexão com os registros reais do Supabase.</td></tr>';\n    const andamento = document.querySelector('#producao .production-grid .panel:nth-child(2) .list');\n    if (andamento) andamento.innerHTML = '<div class="empty">O andamento desta área será alimentado somente pelos pedidos reais liberados para produção.</div>';\n    const pedidoHint = document.querySelector('#pedidos .section-head p');\n    if (pedidoHint) pedidoHint.textContent = 'Acompanhe os pedidos pelo fluxo operacional. Abra um pedido para avançar etapa por etapa.';\n  };\n  setTimeout(removeFictitiousExamples, 900);\n})();`;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('/app.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => response.text().then(source => new Response(withGuardrails(source), {
          status: response.status,
          statusText: response.statusText,
          headers: { 'Content-Type': 'text/javascript; charset=utf-8' }
        })))
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
