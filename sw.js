const CACHE = 'porcelane-operacional-v7';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./operacao.js','./manifest.webmanifest'];

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
  const clean = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const waitForSupabase = async () => { for(let i=0;i<20;i++){ if(typeof supabase !== 'undefined') return true; await new Promise(r=>setTimeout(r,100)); } return false; };
  const renderBudgetActions = () => {
    const tbody = document.getElementById('budgets-table');
    if(!tbody || typeof budgets === 'undefined') return;
    if(!budgets.length){ tbody.innerHTML='<tr><td colspan="7" class="empty">Nenhum orçamento cadastrado. Clique em "Novo orçamento".</td></tr>'; return; }
    tbody.innerHTML = budgets.map(b => {
      const approved = b.status === 'aprovado';
      const refused = b.status === 'recusado';
      const action = approved ? '<span class="badge green">Pedido gerado</span>' : refused ? '<span class="badge">Recusado</span>' : `<button class="primary" data-approve-budget="${clean(b.id)}">Aprovar e gerar pedido</button>`;
      return `<tr><td>${clean(b.id)}</td><td>${clean(b.client)}</td><td>${clean(b.job)}</td><td>${b.area?b.area.toLocaleString('pt-BR')+' m²':'—'}</td><td>${money(b.value)}</td><td><span class="badge ${approved?'green':'amber'}">${clean(b.status)}</span></td><td>${action}</td></tr>`;
    }).join('');
    tbody.querySelectorAll('[data-approve-budget]').forEach(button => button.addEventListener('click', async () => { button.disabled = true; try { await approveBudget(button.dataset.approveBudget); } finally { button.disabled = false; renderBudgetActions(); } }));
  };
  const renderRealPanels = async () => {
    try {
      if(!(await waitForSupabase())) return;
      const finance = document.querySelector('#financeiro .grid-2');
      if (finance) {
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
      if(estoqueBody){ const {data,error}=await supabase.from('materiais').select('nome,categoria,unidade,estoque,estoque_minimo,preco').eq('ativo',true).order('nome'); if(!error) estoqueBody.innerHTML=(data||[]).map(m=>`<tr><td>${clean(m.nome)}</td><td>${clean(m.categoria||'—')}</td><td>${Number(m.estoque||0)}</td><td>${clean(m.unidade||'—')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum material cadastrado.</td></tr>'; }
      const andamento=document.querySelector('#producao .production-grid .panel:nth-child(2) .list');
      if(andamento){ const {data}=await supabase.from('ordens_producao').select('numero,status,data_liberacao,pedido:pedidos(numero,cliente:clientes(nome))').order('criado_em',{ascending:false}).limit(12); andamento.innerHTML=(data||[]).map(op=>`<div class="list-row"><strong>${clean(op.numero||'OP')}</strong><span>${clean(op.pedido?.numero||'')} · ${clean(op.pedido?.cliente?.nome||'')}</span><span class="badge amber">${clean(op.status||'pendente')}</span></div>`).join('')||'<div class="empty">Nenhuma ordem de produção registrada.</div>'; }
      const installPanel=document.querySelector('#instalacao .panel');
      if(installPanel){ const {data,error}=await supabase.from('instalacoes').select('id,data_agendada,hora_inicio,hora_fim,status,instalador,pedido:pedidos(numero,cliente:clientes(nome),obra:obras(nome))').order('data_agendada',{ascending:true}).limit(30); if(!error) installPanel.innerHTML=`<div class="panel-head"><h3>Agenda de instalação</h3><span class="badge green">Sem instalação noturna</span></div><div class="list">${(data||[]).map(i=>`<div class="list-row"><strong>${clean(i.pedido?.numero||'Pedido')}</strong><span>${clean(i.pedido?.cliente?.nome||'')} · ${clean(i.pedido?.obra?.nome||'')}</span><span>${clean(i.data_agendada||'—')} ${i.hora_inicio?clean(String(i.hora_inicio).slice(0,5)):''}</span><span class="badge ${i.status==='concluida'?'green':'amber'}">${clean(i.status||'agendada')}</span></div>`).join('')||'<div class="empty">Nenhuma instalação agendada.</div>'}</div>`; }
      const logisticsPanel=document.querySelector('#logistica .panel');
      if(logisticsPanel){ const {data,error}=await supabase.from('entregas').select('id,data_agendada,hora_inicio,status,endereco,responsavel,pedido:pedidos(numero,cliente:clientes(nome))').order('data_agendada',{ascending:true}).limit(30); if(!error) logisticsPanel.innerHTML=`<div class="panel-head"><h3>Agenda de entregas</h3><span class="badge">${(data||[]).length} registro(s)</span></div><div class="list">${(data||[]).map(e=>`<div class="list-row"><strong>${clean(e.pedido?.numero||'Entrega')}</strong><span>${clean(e.pedido?.cliente?.nome||'')} · ${clean(e.endereco||'')}</span><span>${clean(e.data_agendada||'—')} ${e.hora_inicio?clean(String(e.hora_inicio).slice(0,5)):''}</span><span class="badge amber">${clean(e.status||'agendada')}</span></div>`).join('')||'<div class="empty">Nenhuma entrega agendada.</div>'}</div>`; }
      const docsPanel=document.querySelector('#documentos .doc-grid');
      if(docsPanel){ const {data,error}=await supabase.from('documentos').select('id,tipo,titulo,status,numero,arquivo_url,caminho_onedrive,criado_em').order('criado_em',{ascending:false}).limit(20); if(!error) docsPanel.innerHTML=(data||[]).map(d=>`<div class="panel"><strong>${clean(d.titulo||d.tipo||'Documento')}</strong><span>${clean(d.numero||'')} · ${clean(d.status||'')}</span><small>${d.caminho_onedrive?'OneDrive vinculado':d.arquivo_url?'Arquivo vinculado':'Sem arquivo vinculado'}</small></div>`).join('')||'<div class="panel"><p class="empty">Nenhum documento cadastrado.</p></div>'; }
      renderBudgetActions();
    } catch(error) { console.warn('Painéis operacionais:',error); }
  };
  setTimeout(renderBudgetActions, 900); setTimeout(renderRealPanels, 900); setTimeout(renderRealPanels, 2200); setTimeout(renderRealPanels, 4500);
})();`;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/app.js')) { event.respondWith(fetch(event.request).then(response => response.text().then(source => new Response(withGuardrails(source), {status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/javascript; charset=utf-8'}}))).catch(() => caches.match(event.request))); return; }
  if (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(fetch(event.request).then(response => response.text().then(html => { const injected=html.replace('</body>','<script type="module" src="./operacao.js"></script></body>'); return new Response(injected,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8'}}); })).catch(() => caches.match('./index.html'))); return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response; }).catch(()=>caches.match('./index.html'))));
});
