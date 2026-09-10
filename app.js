import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DB_STATUS_MAP = {
  'Pedido recebido': 'aberto',
  'Conferência': 'conferencia',
  'Em produção': 'producao',
  'Instalação': 'instalacao',
  'Finalizado': 'finalizado'
};
const UI_STATUS_MAP = {
  'aberto': 'Pedido recebido',
  'conferencia': 'Conferência',
  'producao': 'Em produção',
  'instalacao': 'Instalação',
  'finalizado': 'Finalizado'
};

const views=[...document.querySelectorAll('.view')];
const nav=[...document.querySelectorAll('.nav-item')];
const title=document.getElementById('page-title');
const names={dashboard:'Visão geral',orcamentos:'Orçamentos',pedidos:'Pedidos',medicao:'Medição / Conferência',desenho:'Desenho técnico',producao:'Produção',acabamento:'Acabamento',logistica:'Carregamento / Logística',instalacao:'Instalação',clientes:'Clientes',financeiro:'Financeiro',estoque:'Estoque',rh:'RH / Administrativo',documentos:'Documentos',assistente:'Assistente',configuracoes:'Configurações'};
function go(view){views.forEach(v=>v.classList.toggle('active-view',v.id===view));nav.forEach(n=>n.classList.toggle('active',n.dataset.view===view));title.textContent=names[view]||'Visão geral';window.scrollTo({top:0,behavior:'smooth'});history.replaceState(null,'','#'+view)}
nav.forEach(n=>n.addEventListener('click',()=>go(n.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.viewLink)));
const today=document.getElementById('today'); if(today) today.textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date());

const stages=['Pedido recebido','Conferência','Em produção','Instalação','Finalizado'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let orders=[];
let budgets=[];
let clients=[];

function mapOrderFromDB(row) {
  const clientName = row.cliente?.nome || '';
  const obraName = row.obra?.nome || '';
  const uiStatus = UI_STATUS_MAP[row.status] || 'Pedido recebido';
  const installDate = row.instalacoes?.[0]?.data_agendada || '';
  return {
    id: row.numero || row.id,
    dbId: row.id,
    client: clientName,
    job: obraName,
    status: uiStatus,
    measurement: row.data_medicao || '',
    install: installDate,
    locked: uiStatus === 'Finalizado'
  };
}

function mapBudgetFromDB(row) {
  const clientName = row.cliente?.nome || '';
  const obraName = row.obra?.nome || '';
  return {
    id: row.numero || row.id,
    dbId: row.id,
    client: clientName,
    job: obraName,
    value: row.valor_total || 0,
    status: row.status || 'rascunho'
  };
}

function mapClientFromDB(row) {
  return {
    dbId: row.id,
    name: row.nome,
    phone: row.telefone || '',
    note: row.observacoes || ''
  };
}

async function loadOrders() {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id, numero, status, data_medicao, cliente_id, obra_id,
      cliente:clientes(nome),
      obra:obras(nome),
      instalacoes(data_agendada)
    `)
    .order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar pedidos:', error); return; }
  orders = (data || []).map(mapOrderFromDB);
  renderOrders();
  renderMetrics();
}

async function loadBudgets() {
  const { data, error } = await supabase
    .from('orcamentos')
    .select(`
      id, numero, status, valor_total,
      cliente:clientes(nome),
      obra:obras(nome)
    `)
    .order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar orçamentos:', error); return; }
  budgets = (data || []).map(mapBudgetFromDB);
  renderMetrics();
  renderBudgetsTable();
}

async function loadClients() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome, telefone, observacoes')
    .order('created_at', { ascending: false });
  if (error) { console.error('Erro ao carregar clientes:', error); return; }
  clients = (data || []).map(mapClientFromDB);
}

function renderBudgetsTable() {
  const tbody = document.getElementById('budgets-table');
  if (!tbody) return;
  if (!budgets.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum orçamento cadastrado. Clique em "Novo orçamento".</td></tr>';
    return;
  }
  tbody.innerHTML = budgets.map(b => `<tr><td>${esc(b.id)}</td><td>${esc(b.client)}</td><td>${esc(b.job)}</td><td>—</td><td>${b.value ? 'R$ ' + Number(b.value).toFixed(2).replace('.',',') : '—'}</td><td><span class="badge ${b.status==='aprovado'?'green':'amber'}">${esc(b.status)}</span></td></tr>`).join('');
}

function card(o){return `<div class="order-card" data-order="${esc(o.id)}"><strong>${esc(o.id)}</strong><span>${esc(o.client)}</span><span>${esc(o.job)}</span>${o.measurement?'<small class="ok">Medição registrada</small>':'<small class="warning">Medição pendente</small>'}<small>${o.locked?'Pedido protegido':'Clique para abrir'}</small></div>`}
function renderOrders(){const board=document.getElementById('orders-board');if(!board)return;board.innerHTML=stages.map(stage=>`<div class="kanban-col"><h4>${stage}<em>${orders.filter(o=>o.status===stage).length}</em></h4>${orders.filter(o=>o.status===stage).map(card).join('')||'<div class="empty">Nenhum pedido</div>'}</div>`).join('');const recent=document.getElementById('recent-orders');if(recent)recent.innerHTML=orders.slice(0,4).map(card).join('');document.querySelectorAll('[data-order]').forEach(c=>c.onclick=()=>openOrder(c.dataset.order));renderOperationalQueues()}
function renderMetrics(){const active=orders.filter(o=>o.status!=='Finalizado').length;const production=orders.filter(o=>o.status==='Em produção').length;const installs=orders.filter(o=>o.status==='Instalação').length;const budgetsOpen=budgets.filter(b=>b.status!=='aprovado'&&b.status!=='recusado').length;const m=document.getElementById('dashboard-metrics');if(m)m.innerHTML=[['Pedidos em andamento',active,'Atualizados agora'],['Em produção',production,'Acompanhamento da fábrica'],['Instalações próximas',installs,'Próximos 7 dias'],['Orçamentos abertos',budgetsOpen,'Aguardando retorno']].map(x=>`<article class="metric"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('')}
function modal(title,body,onSubmit){const old=document.getElementById('porcelane-modal');if(old)old.remove();const d=document.createElement('dialog');d.id='porcelane-modal';d.innerHTML=`<form method="dialog" class="panel" style="min-width:min(620px,92vw)"><div class="panel-head"><h3>${title}</h3><button value="cancel">×</button></div>${body}<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px"><button value="cancel">Cancelar</button><button class="primary" id="modal-ok" value="default">Salvar</button></div></form>`;document.body.appendChild(d);d.querySelector('#modal-ok').onclick=e=>{e.preventDefault();if(onSubmit(d))d.close()};d.showModal()}

function openOrder(id){
  const o=orders.find(x=>x.id===id);
  if(!o)return;
  const canProduce=!!o.measurement;
  modal(`Pedido ${o.id}`,`<p><strong>${esc(o.client)}</strong> · ${esc(o.job)}</p><label>Status<select id="m-status">${stages.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></label><label>Data de medição<input id="m-measure" type="date" value="${o.measurement||''}"></label><label>Instalação<input id="m-install" type="date" value="${o.install||''}"></label><p class="${canProduce?'ok':'warning'}">${canProduce?'Medição registrada: produção pode ser liberada.':'Sem data de medição: produção permanece BLOQUEADA.'}</p>`,async d=>{
    const ns=d.querySelector('#m-status').value;
    const nm=d.querySelector('#m-measure').value;
    if(o.locked){alert('Este pedido está fechado e protegido contra alteração.');return false}
    if((ns==='Em produção'||ns==='Instalação')&&!nm){alert('Não é possível avançar este pedido para produção ou instalação sem uma data de medição registrada.');return false}
    if(ns==='Finalizado'&&(!nm||!d.querySelector('#m-install').value)){alert('Para finalizar, registre a medição e a data de instalação.');return false}
    const dbStatus = DB_STATUS_MAP[ns] || 'aberto';
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ status: dbStatus, data_medicao: nm || null })
      .eq('id', o.dbId);
    if (updateError) { alert('Erro ao atualizar pedido: ' + updateError.message); return false }
    const installDate = d.querySelector('#m-install').value;
    const { data: existingInst } = await supabase
      .from('instalacoes')
      .select('id')
      .eq('pedido_id', o.dbId)
      .maybeSingle();
    if (installDate) {
      if (existingInst) {
        await supabase.from('instalacoes').update({ data_agendada: installDate, status: ns==='Finalizado'?'concluida':'agendada' }).eq('id', existingInst.id);
      } else {
        await supabase.from('instalacoes').insert({ pedido_id: o.dbId, data_agendada: installDate, status: 'agendada' });
      }
    }
    await loadOrders();
    return true;
  });
}

async function ensureClient(name) {
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .ilike('nome', name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome: name })
    .select('id')
    .single();
  if (error) { console.error('Erro ao criar cliente:', error); return null; }
  return data.id;
}

async function ensureObra(name, clientId) {
  const { data: existing } = await supabase
    .from('obras')
    .select('id')
    .ilike('nome', name)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('obras')
    .insert({ nome: name, cliente_id: clientId })
    .select('id')
    .single();
  if (error) { console.error('Erro ao criar obra:', error); return null; }
  return data.id;
}

function newOrder(){modal('Novo pedido',`<label>Cliente<input id="f-client" required placeholder="Nome do cliente"></label><label>Obra / local<input id="f-job" required placeholder="Ex.: Casa Forte"></label><label>Data de medição<input id="f-measure" type="date"></label><label>Data de instalação<input id="f-install" type="date"></label>`,async d=>{
  const client=d.querySelector('#f-client').value.trim(),job=d.querySelector('#f-job').value.trim();
  if(!client||!job)return false;
  const clientId = await ensureClient(client);
  if (!clientId) { alert('Erro ao cadastrar cliente.'); return false; }
  const obraId = await ensureObra(job, clientId);
  if (!obraId) { alert('Erro ao cadastrar obra.'); return false; }
  const nextNum = `PED-${String(Date.now()).slice(-6)}`;
  const { data: ped, error: pedError } = await supabase
    .from('pedidos')
    .insert({
      numero: nextNum,
      cliente_id: clientId,
      obra_id: obraId,
      status: 'aberto',
      data_medicao: d.querySelector('#f-measure').value || null
    })
    .select('id')
    .single();
  if (pedError) { alert('Erro ao criar pedido: ' + pedError.message); return false; }
  const installDate = d.querySelector('#f-install').value;
  if (installDate) {
    await supabase.from('instalacoes').insert({ pedido_id: ped.id, data_agendada: installDate, status: 'agendada' });
  }
  await loadOrders();
  go('pedidos');
  return true;
})}

function newBudget(){modal('Novo orçamento',`<label>Cliente<input id="b-client" required></label><label>Obra<input id="b-job" required></label><label>M²<input id="b-m2" type="number" min="0" step="0.01"></label><label>Valor<input id="b-value" type="number" min="0" step="0.01"></label>`,async d=>{
  const client=d.querySelector('#b-client').value.trim(),job=d.querySelector('#b-job').value.trim();
  if(!client||!job)return false;
  const clientId = await ensureClient(client);
  if (!clientId) { alert('Erro ao cadastrar cliente.'); return false; }
  const obraId = await ensureObra(job, clientId);
  if (!obraId) { alert('Erro ao cadastrar obra.'); return false; }
  const value = parseFloat(d.querySelector('#b-value').value) || 0;
  const nextNum = `ORC-${String(Date.now()).slice(-6)}`;
  const { error } = await supabase
    .from('orcamentos')
    .insert({
      numero: nextNum,
      cliente_id: clientId,
      obra_id: obraId,
      valor_total: value,
      status: 'rascunho'
    });
  if (error) { alert('Erro ao criar orçamento: ' + error.message); return false; }
  await loadBudgets();
  alert('Orçamento criado.');
  return true;
})}

function newClient(){modal('Novo cliente',`<label>Nome<input id="c-name" required></label><label>Telefone<input id="c-phone"></label><label>Obra / observação<textarea id="c-note"></textarea></label>`,async d=>{
  const name=d.querySelector('#c-name').value.trim();
  if(!name)return false;
  const { error } = await supabase
    .from('clientes')
    .insert({
      nome: name,
      telefone: d.querySelector('#c-phone').value || null,
      observacoes: d.querySelector('#c-note').value || null
    });
  if (error) { alert('Erro ao cadastrar cliente: ' + error.message); return false; }
  await loadClients();
  alert('Cliente cadastrado.');
  return true;
})}

function renderOperationalQueues(){
 const measurement=document.querySelector('#medicao .panel-body')||document.querySelector('#medicao .panel');
 const production=document.querySelector('#producao .panel-body')||document.querySelector('#producao .panel');
 if(measurement){let box=document.getElementById('dynamic-measurement-queue');if(!box){box=document.createElement('div');box.id='dynamic-measurement-queue';box.className='list';measurement.appendChild(box)}box.innerHTML=orders.filter(o=>o.status!=='Finalizado').map(o=>`<div class="list-row"><strong>${esc(o.id)}</strong><span>${esc(o.client)} · ${esc(o.job)}</span><span class="badge ${o.measurement?'green':'amber'}">${o.measurement?'Medição registrada':'Aguardando medição'}</span><button data-open-order="${esc(o.id)}">${o.measurement?'Abrir':'Registrar'}</button></div>`).join('')||'<div class="empty">Nenhum pedido pendente.</div>';box.querySelectorAll('[data-open-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.openOrder))}
 if(production){let box=document.getElementById('dynamic-production-queue');if(!box){box=document.createElement('div');box.id='dynamic-production-queue';box.className='list';production.appendChild(box)}box.innerHTML=orders.filter(o=>o.status==='Em produção').map(o=>`<div class="list-row"><strong>${esc(o.id)}</strong><span>${esc(o.client)} · ${esc(o.job)}</span><span class="badge green">Liberado para produção</span><button data-open-order="${esc(o.id)}">Abrir</button></div>`).join('')||'<div class="empty">Nenhum pedido liberado para produção.</div>';box.querySelectorAll('[data-open-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.openOrder))}
}

renderOrders();renderMetrics();renderBudgetsTable();
document.getElementById('new-order')?.addEventListener('click',newOrder);document.getElementById('new-order-2')?.addEventListener('click',newOrder);document.getElementById('new-budget')?.addEventListener('click',newBudget);
const clientButtons=[...document.querySelectorAll('#clientes .primary')];clientButtons.forEach(b=>b.addEventListener('click',newClient));
document.querySelectorAll('[data-assist]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.assist;const result=document.getElementById('assistant-result');if(!result)return;const text={pedidos:`Há ${orders.filter(o=>o.status!=='Finalizado').length} pedidos em andamento.`,medicao:`Há ${orders.filter(o=>!o.measurement).length} pedidos sem data de medição. Eles não podem ser liberados para produção.`,producao:`Há ${orders.filter(o=>o.status==='Em produção').length} pedidos em produção.`,financeiro:'Use os lançamentos do módulo Financeiro para controlar contas a receber, parcelas e comissões.'};result.textContent=text[key]||'Tudo certo.'}));
document.getElementById('clear-local')?.addEventListener('click',async()=>{if(confirm('Recarregar todos os dados do banco de dados?')){await Promise.all([loadOrders(),loadBudgets(),loadClients()])}});

const finish=[];const fl=document.getElementById('finish-list');if(fl)fl.innerHTML=orders.filter(o=>o.status==='Em produção'||o.status==='Instalação').map(o=>`<div class="list-row"><strong>${esc(o.id)}</strong><span>${esc(o.client)} · ${esc(o.job)}</span><span class="badge amber">Em andamento</span></div>`).join('')||'<div class="empty">Nenhum acabamento em andamento.</div>';

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
if(location.hash&&names[location.hash.slice(1)])go(location.hash.slice(1));

(async()=>{
  await Promise.all([loadOrders(), loadBudgets(), loadClients()]);
  if(fl)fl.innerHTML=orders.filter(o=>o.status==='Em produção'||o.status==='Instalação').map(o=>`<div class="list-row"><strong>${esc(o.id)}</strong><span>${esc(o.client)} · ${esc(o.job)}</span><span class="badge amber">Em andamento</span></div>`).join('')||'<div class="empty">Nenhum acabamento em andamento.</div>';
})();
