const CACHE = 'porcelane-operacional-v4';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function withGuardrails(source) {
  return `${source}

(() => {
  const stages = ['Pedido recebido','Conferência','Em produção','Instalação','Finalizado'];
  const markInitialStatus = () => document.querySelectorAll('#m-status').forEach(select => { if (!select.dataset.initialStatus) select.dataset.initialStatus = select.value; });
  new MutationObserver(markInitialStatus).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('focusin', event => { const select = event.target.closest?.('#m-status'); if (select && !select.dataset.initialStatus) select.dataset.initialStatus = select.value; });
  document.addEventListener('click', event => {
    const save = event.target.closest?.('#modal-ok'); if (!save) return;
    const dialog = save.closest('dialog'); if (!dialog) return;
    const status = dialog.querySelector('#m-status'); if (!status) return;
    const current = status.dataset.initialStatus || status.value, next = status.value;
    const measurement = dialog.querySelector('#m-measure'), approved = dialog.querySelector('#m-approved'), installation = dialog.querySelector('#m-install');
    const hasMeasurement = Boolean(measurement?.value), isApproved = Boolean(approved?.checked);
    const currentIndex = stages.indexOf(current), nextIndex = stages.indexOf(next);
    if (['Conferência','Em produção','Instalação','Finalizado'].includes(next) && (!hasMeasurement || !isApproved)) { event.preventDefault(); event.stopImmediatePropagation(); alert('Registre e aprove a medição antes de avançar o pedido.'); return; }
    if (next === 'Em produção' && current !== 'Conferência') { event.preventDefault(); event.stopImmediatePropagation(); alert('PRODUÇÃO BLOQUEADA: o pedido precisa passar por Medição/Conferência.'); return; }
    if (next === 'Instalação' && current !== 'Em produção') { event.preventDefault(); event.stopImmediatePropagation(); alert('INSTALAÇÃO BLOQUEADA: o pedido precisa estar em produção.'); return; }
    if (next === 'Finalizado' && (current !== 'Instalação' || !installation?.value)) { event.preventDefault(); event.stopImmediatePropagation(); alert('FINALIZAÇÃO BLOQUEADA: instalação e data são obrigatórias.'); return; }
    if (currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex) { event.preventDefault(); event.stopImmediatePropagation(); alert('O fluxo operacional não permite voltar etapa.'); }
  }, true);

  const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const renderRealPanels = async () => {
    try {
      const finance = document.querySelector('#financeiro .grid-2');
      if (finance && typeof supabase !== 'undefined') {
        const [receber, pagar, commissions] = await Promise.all([
          supabase.from('contas_receber').select('valor,status,vencimento,descricao').order('vencimento',{ascending:true}),
          supabase.from('contas_pagar').select('valor,status,vencimento,descricao').order('vencimento',{ascending:true}),
          supabase.from('comissoes').select('valor_comissao,status,pedido_id').order('criado_em',{ascending:false})
        ]);
        const r=receber.data||[], p=pagar.data||[], c=commissions.data||[];
        const abertoReceber=r.filter(x=>x.status!=='pago').reduce((s,x)=>s+Number(x.valor||0),0);
        const abertoPagar=p.filter(x=>x.status!=='pago').reduce((s,x)=>s+Number(x.valor||0),0);
        const comissaoAberta=c.filter(x=>x.status!=='pago').reduce((s,x)=>s+Number(x.valor_comissao||0),0);
        finance.innerHTML=`<div class="panel"><div class="panel-head"><h3>Contas a receber</h3></div><div class="cards"><article class="metric"><span>Em aberto</span><strong>${money(abertoReceber)}</strong><small>${r.filter(x=>x.status!=='pago').length} lançamento(s)</small></article><article class="metric"><span>Recebido</span><strong>${money(r.filter(x=>x.status==='pago').reduce((s,x)=>s+Number(x.valor||0),0))}</strong></article></div></div><div class="panel"><div class="panel-head"><h3>Contas a pagar</h3></div><div class="cards"><article class="metric"><span>Em aberto</span><strong>${money(abertoPagar)}</strong><small>${p.filter(x=>x.status!=='pago').length} lançamento(s)</small></article><article class="metric"><span>Comissões abertas</span><strong>${money(comissaoAberta)}</strong></article></div></div>`;
      }
      const estoqueBody=document.querySelector('#estoque tbody');
      if(estoqueBody && typeof supabase !== 'undefined'){
        const {data,error}=await supabase.from('materiais').select('nome,unidade,estoque,estoque_minimo,preco').eq('ativo',true).order('nome');
        if(!error){estoqueBody.innerHTML=(data||[]).map(m=>`<tr><td>${String(m.nome||'').replace(/[&<>]/g,'')}</td><td>${m.unidade||'—'}</td><td>${Number(m.estoque||0)}</td><td>${Number(m.estoque_minimo||0)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum material cadastrado.</td></tr>';}
      }
      const andamento=document.querySelector('#producao .production-grid .panel:nth-child(2) .list');
      if(andamento && typeof supabase !== 'undefined'){
        const {data}=await supabase.from('ordens_producao').select('numero,status,data_liberacao,pedido:pedidos(numero,cliente:clientes(nome))').order('criado_em',{ascending:false}).limit(12);
        andamento.innerHTML=(data||[]).map(op=>`<div class="list-row"><strong>${op.numero||'OP'}</strong><span>${op.pedido?.numero||''} · ${op.pedido?.cliente?.nome||''}</span><span class="badge amber">${op.status||'pendente'}</span></div>`).join('')||'<div class="empty">Nenhuma ordem de produção registrada.</div>';
      }
    } catch(error) { console.warn('Painéis operacionais:',error); }
  };
  setTimeout(renderRealPanels, 900);
  setTimeout(renderRealPanels, 2200);
})();`;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/app.js')) {
    event.respondWith(fetch(event.request).then(response => response.text().then(source => new Response(withGuardrails(source), {status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/javascript; charset=utf-8'}}))).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response; }).catch(()=>caches.match('./index.html'))));
});
