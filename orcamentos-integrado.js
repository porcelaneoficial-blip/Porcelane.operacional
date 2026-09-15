import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const $ = (s, root = document) => root.querySelector(s);
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[c]));
const uid = () => crypto.randomUUID();

const emptyItem = () => ({ id: uid(), description: '', qty: 1, length: 0, width: 0, has_emenda: false, emenda_position: '', unit_price: 0, final_value: null });
const emptyEnv = (name = '') => ({ id: uid(), name, material_name: '', material_price_m2: 0, items: [emptyItem()], services: [], supplies: [], notes: '' });
const emptyData = () => ({ date: new Date().toISOString().slice(0,10), client_name: '', phone: '', address: '', city: '', salesperson: '', salesperson_external: '', architect: '', type: 'convencional', environments: [emptyEnv('Cozinha')], freight: 0, discount: 0, payment: '40% Pix + 60% cartão até 3x', delivery: 'retirada', measurement_fee: 0, notes: '', validity: 15 });

function calcItem(i, env) {
  const qty = Number(i.qty || 1);
  const area = Math.max(0, Number(i.length || 0) * Number(i.width || 0));
  const unit = Number(i.unit_price || env.material_price_m2 || 0);
  const calculated = area * unit * qty;
  return { area, total: i.final_value === null || i.final_value === '' || i.final_value === undefined ? calculated : Number(i.final_value || 0) };
}
function calcEnv(env) {
  const items = env.items || [];
  const itemTotal = items.reduce((s, i) => s + calcItem(i, env).total, 0);
  const services = (env.services || []).reduce((s, x) => s + Number(x.qty || 0) * Number(x.unit_value || 0), 0);
  const supplies = (env.supplies || []).reduce((s, x) => s + Number(x.qty || 0) * Number(x.unit_value || 0), 0);
  const area = items.reduce((s, i) => s + calcItem(i, env).area * Number(i.qty || 1), 0);
  return { area, total: itemTotal + services + supplies };
}
function calcTotals(d) {
  const envs = d.environments || [];
  const area = envs.reduce((s, e) => s + calcEnv(e).area, 0);
  const subtotal = envs.reduce((s, e) => s + calcEnv(e).total, 0);
  const freight = Number(d.freight || 0), measurement = Number(d.measurement_fee || 0), discount = Number(d.discount || 0);
  return { area, subtotal, total: Math.max(0, subtotal + freight + measurement - discount) };
}

function openEditor(id = null) {
  const old = document.getElementById('quote-v2-modal'); if (old) old.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'quote-v2-modal';
  dialog.className = 'quote-v2-dialog';
  dialog.innerHTML = `<form class="quote-v2-form" method="dialog"><div class="quote-v2-head"><div><span class="eyebrow">PORCELANE · COMERCIAL</span><h2>${id ? 'Editar orçamento' : 'Novo orçamento'}</h2></div><button type="button" class="quote-v2-close">×</button></div><div id="quote-v2-body"></div><div class="quote-v2-foot"><span id="quote-v2-save-state">Alterações salvas no banco</span><div><button type="button" class="secondary" id="quote-v2-cancel">Cancelar</button><button type="button" class="primary" id="quote-v2-save">Salvar orçamento</button></div></div></form>`;
  document.body.appendChild(dialog); dialog.showModal();
  $('#quote-v2-cancel', dialog).onclick = () => dialog.close(); $('.quote-v2-close', dialog).onclick = () => dialog.close();
  loadEditor(dialog, id);
}

async function loadEditor(dialog, id) {
  let d = emptyData(); let status = 'rascunho'; let number = '';
  if (id) {
    const { data: row, error } = await supabase.from('orcamentos').select('id,numero,status,cliente_id,obra_id,valor_total,desconto,validade,forma_pagamento,tipo_entrega,medicao_taxa,dados').eq('id', id).maybeSingle();
    if (error || !row) { alert('Orçamento não encontrado.'); dialog.close(); return; }
    d = { ...d, ...(row.dados || {}), discount: Number(row.desconto || (row.dados || {}).discount || 0), measurement_fee: Number(row.medicao_taxa || (row.dados || {}).measurement_fee || 0), payment: row.forma_pagamento || (row.dados || {}).payment || d.payment, delivery: row.tipo_entrega || (row.dados || {}).delivery || d.delivery };
    status = row.status; number = row.numero;
  }
  renderEditor(dialog, d, id, status, number);
}

function renderEditor(dialog, d, id, status, number) {
  const body = $('#quote-v2-body', dialog);
  const totals = calcTotals(d);
  body.innerHTML = `<div class="quote-v2-grid"><section class="quote-v2-card"><h3>Dados comerciais</h3><div class="quote-v2-fields"><label>Cliente<input data-k="client_name" value="${esc(d.client_name)}"></label><label>Telefone / WhatsApp<input data-k="phone" value="${esc(d.phone)}"></label><label>Endereço da obra<input data-k="address" value="${esc(d.address)}"></label><label>Cidade<input data-k="city" value="${esc(d.city)}"></label><label>Vendedor interno<input data-k="salesperson" value="${esc(d.salesperson)}"></label><label>Vendedor externo<input data-k="salesperson_external" value="${esc(d.salesperson_external)}"></label><label>Arquiteto<input data-k="architect" value="${esc(d.architect)}"></label><label>Tipo<select data-k="type"><option value="convencional" ${d.type==='convencional'?'selected':''}>Convencional</option><option value="mfc" ${d.type==='mfc'?'selected':''}>MFC</option></select></label></div></section><section class="quote-v2-card"><h3>Condições</h3><div class="quote-v2-fields"><label>Forma de pagamento<select data-k="payment"><option>40% Pix + 60% cartão até 3x</option><option>Pix</option><option>Cartão</option><option>Outro</option></select></label><label>Entrega<select data-k="delivery"><option value="retirada">Retirada</option><option value="entrega_sem_instalacao">Entrega sem instalação</option><option value="entrega_instalacao">Entrega + instalação</option></select></label><label>Frete<input data-k="freight" type="number" step="0.01" value="${Number(d.freight||0)}"></label><label>Desconto<input data-k="discount" type="number" step="0.01" value="${Number(d.discount||0)}"></label><label>Taxa de medição<input data-k="measurement_fee" type="number" step="0.01" value="${Number(d.measurement_fee||0)}"></label><label>Validade (dias)<input data-k="validity" type="number" value="${Number(d.validity||15)}"></label></div></section></div><div class="quote-v2-card"><div class="quote-v2-section-head"><h3>Ambientes e peças</h3><button type="button" class="secondary" id="quote-add-env">+ Ambiente</button></div><div id="quote-envs"></div></div><div class="quote-v2-summary"><div><span>Área total</span><strong id="q-total-area">${totals.area.toLocaleString('pt-BR',{maximumFractionDigits:2})} m²</strong></div><div><span>Subtotal</span><strong id="q-subtotal">${money(totals.subtotal)}</strong></div><div><span>Total do orçamento</span><strong id="q-total">${money(totals.total)}</strong></div></div><div class="quote-v2-card"><label>Observações<textarea data-k="notes">${esc(d.notes||'')}</textarea></label></div>`;
  body.querySelectorAll('[data-k]').forEach(el => { if (el.tagName === 'SELECT') el.value = d[el.dataset.k] ?? el.value; el.addEventListener('input', () => { const k=el.dataset.k; d[k] = el.type==='number' ? Number(el.value||0) : el.value; rerenderTotals(); }); });
  const envBox = $('#quote-envs', body);
  function renderEnvs() {
    envBox.innerHTML = (d.environments||[]).map((env, ei) => `<div class="quote-env" data-env="${env.id}"><div class="quote-env-head"><input class="env-name" value="${esc(env.name)}"><input class="env-material" placeholder="Material" value="${esc(env.material_name)}"><input class="env-price" type="number" step="0.01" placeholder="R$/m²" value="${Number(env.material_price_m2||0)}"><button type="button" class="icon-btn env-copy" title="Duplicar">⧉</button><button type="button" class="icon-btn env-remove">×</button></div><div class="quote-items"><div class="quote-item-head"><span>Descrição</span><span>Comp.</span><span>Larg.</span><span>M²</span><span>R$</span><span></span></div>${(env.items||[]).map((it,ii)=>{const c=calcItem(it,env);return `<div class="quote-item" data-item="${it.id}"><input class="it-desc" value="${esc(it.description)}" placeholder="Balcão / Ilha"><input class="it-l" type="number" step="0.001" value="${Number(it.length||0)}"><input class="it-w" type="number" step="0.001" value="${Number(it.width||0)}"><span class="it-area">${c.area.toLocaleString('pt-BR',{maximumFractionDigits:2})}</span><input class="it-value" type="number" step="0.01" value="${it.final_value===null||it.final_value===undefined?'':Number(it.final_value)}" placeholder="auto"><button type="button" class="icon-btn it-remove">×</button><label class="emenda"><input type="checkbox" class="it-emenda" ${it.has_emenda?'checked':''}> emenda</label></div>`}).join('')}</div><button type="button" class="secondary add-item">+ Peça</button><div class="env-extra"><strong>Subtotal: ${money(calcEnv(env).total)}</strong></div></div>`).join('');
    bindEnvs(); rerenderTotals();
  }
  function bindEnvs() {
    envBox.querySelectorAll('.quote-env').forEach((card, ei) => {
      const env=d.environments[ei];
      $('.env-name',card).oninput=e=>{env.name=e.target.value;rerenderTotals()};
      $('.env-material',card).oninput=e=>env.material_name=e.target.value;
      $('.env-price',card).oninput=e=>{env.material_price_m2=Number(e.target.value||0);renderEnvs()};
      $('.env-remove',card).onclick=()=>{d.environments.splice(ei,1);renderEnvs()};
      $('.env-copy',card).onclick=()=>{d.environments.splice(ei+1,0,JSON.parse(JSON.stringify({...env,id:uid(),name:env.name+' (cópia)',items:(env.items||[]).map(x=>({...x,id:uid()}))})));renderEnvs()};
      $('.add-item',card).onclick=()=>{env.items.push(emptyItem());renderEnvs()};
      card.querySelectorAll('.quote-item').forEach((row,ii)=>{const it=env.items[ii];$('.it-desc',row).oninput=e=>it.description=e.target.value;$('.it-l',row).oninput=e=>{it.length=Number(e.target.value||0);renderEnvs()};$('.it-w',row).oninput=e=>{it.width=Number(e.target.value||0);renderEnvs()};$('.it-value',row).oninput=e=>it.final_value=e.target.value===''?null:Number(e.target.value);$('.it-emenda',row).onchange=e=>it.has_emenda=e.target.checked;$('.it-remove',row).onclick=()=>{env.items.splice(ii,1);renderEnvs()}});
    });
  }
  $('#quote-add-env', body).onclick=()=>{d.environments.push(emptyEnv(`Ambiente ${d.environments.length+1}`));renderEnvs()};
  function rerenderTotals(){const t=calcTotals(d);$('#q-total-area',body).textContent=t.area.toLocaleString('pt-BR',{maximumFractionDigits:2})+' m²';$('#q-subtotal',body).textContent=money(t.subtotal);$('#q-total',body).textContent=money(t.total);}
  renderEnvs();
  $('#quote-v2-save',dialog).onclick=()=>saveQuote(d,id,status,number,dialog);
}

async function ensureClient(name, phone='') {
  const { data: existing } = await supabase.from('clientes').select('id').ilike('nome', name).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from('clientes').insert({ nome:name, telefone:phone || null }).select('id').single();
  if (error) throw error; return data.id;
}
async function ensureObra(name, clientId) {
  const { data: existing } = await supabase.from('obras').select('id').ilike('nome', name).eq('cliente_id', clientId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from('obras').insert({ nome:name, cliente_id:clientId }).select('id').single();
  if (error) throw error; return data.id;
}
async function saveQuote(d,id,status,number,dialog) {
  if (!d.client_name.trim()) { alert('Informe o cliente.'); return; }
  const t=calcTotals(d);
  try {
    const clientId=await ensureClient(d.client_name.trim(),d.phone);
    const obraId=await ensureObra(d.address.trim() || 'Obra sem nome',clientId);
    const payload={cliente_id:clientId,obra_id:obraId,valor_total:t.total,area_m2:t.area,preco_m2:t.area?t.subtotal/t.area:0,desconto:Number(d.discount||0),margem_percentual:50,forma_pagamento:d.payment,tipo_entrega:d.delivery,medicao_taxa:Number(d.measurement_fee||0),status:status||'rascunho',dados:d};
    let row;
    if(id){const r=await supabase.from('orcamentos').update(payload).eq('id',id).select('id,numero').single();if(r.error)throw r.error;row=r.data}
    else {const numero='ORC-'+String(Date.now()).slice(-6);const r=await supabase.from('orcamentos').insert({...payload,numero}).select('id,numero').single();if(r.error)throw r.error;row=r.data}
    await supabase.from('auditoria_operacional').insert({tabela:'orcamentos',registro_id:row.id,acao:id?'edicao':'criacao',dados:{numero:row.numero,total:t.total}});
    dialog.close(); await refreshBudgetList();
  } catch(e) { alert('Erro ao salvar orçamento: '+e.message); }
}

async function refreshBudgetList() {
  const {data,error}=await supabase.from('orcamentos').select('id,numero,status,valor_total,area_m2,dados,criado_em').order('criado_em',{ascending:false});
  if(error)return;
  const tbody=document.getElementById('budgets-table'); if(!tbody)return;
  tbody.innerHTML=(data||[]).map(b=>{const d=b.dados||{};return `<tr class="quote-v2-row" data-quote-id="${b.id}"><td>${esc(b.numero)}</td><td>${esc(d.client_name||'')}</td><td>${esc(d.address||'')}</td><td>${Number(b.area_m2||0).toLocaleString('pt-BR',{maximumFractionDigits:2})} m²</td><td>${money(b.valor_total)}</td><td><span class="badge ${b.status==='aprovado'?'green':'amber'}">${esc(b.status)}</span></td></tr>`}).join('') || '<tr><td colspan="6" class="empty">Nenhum orçamento cadastrado.</td></tr>';
  tbody.querySelectorAll('[data-quote-id]').forEach(r=>r.onclick=()=>openEditor(r.dataset.quoteId));
}

function injectStyles(){if(document.getElementById('quote-v2-style'))return;const s=document.createElement('style');s.id='quote-v2-style';s.textContent=`.quote-v2-dialog{width:min(1180px,96vw);max-height:94vh;border:0;border-radius:18px;padding:0;background:#f7f5f1;color:#171717;box-shadow:0 24px 80px #0004}.quote-v2-dialog::backdrop{background:#0008}.quote-v2-form{padding:24px;overflow:auto;max-height:94vh}.quote-v2-head,.quote-v2-foot,.quote-v2-section-head,.quote-env-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.quote-v2-head{margin-bottom:18px}.quote-v2-head h2{margin:4px 0}.quote-v2-close,.icon-btn{border:0;background:transparent;font-size:20px;cursor:pointer}.quote-v2-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.quote-v2-card{background:#fff;border:1px solid #e7e2da;border-radius:14px;padding:18px;margin-bottom:14px}.quote-v2-card h3{margin:0 0 14px}.quote-v2-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.quote-v2-fields label,.quote-v2-card>label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#555}.quote-v2-fields input,.quote-v2-fields select,.quote-v2-card textarea,.env-name,.env-material,.env-price,.quote-item input{border:1px solid #ddd7ce;border-radius:8px;padding:9px;background:#fff}.quote-v2-card textarea{min-height:80px}.quote-env{border:1px solid #e4ded5;border-radius:12px;padding:12px;margin-top:12px}.quote-env-head{display:grid;grid-template-columns:1.2fr 1.2fr .7fr auto auto;gap:8px}.quote-items{margin-top:10px}.quote-item-head,.quote-item{display:grid;grid-template-columns:2fr .7fr .7fr .6fr .9fr 28px;gap:7px;align-items:center}.quote-item-head{font-size:10px;text-transform:uppercase;color:#888;padding:0 4px 5px}.quote-item{margin-bottom:7px}.it-area{font-size:12px}.emenda{grid-column:1/-1;font-size:11px;color:#777}.env-extra{margin-top:10px;text-align:right;font-size:12px}.quote-v2-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.quote-v2-summary div{background:#181818;color:#fff;border-radius:12px;padding:14px}.quote-v2-summary span{display:block;font-size:11px;opacity:.7}.quote-v2-summary strong{display:block;font-size:20px;margin-top:4px}.quote-v2-foot{position:sticky;bottom:-24px;background:#f7f5f1;padding:14px 0 0;border-top:1px solid #ddd7ce}.quote-v2-foot>div{display:flex;gap:8px}@media(max-width:800px){.quote-v2-grid,.quote-v2-fields,.quote-v2-summary{grid-template-columns:1fr}.quote-env-head{grid-template-columns:1fr 1fr}.quote-item-head{display:none}.quote-item{grid-template-columns:1fr 1fr}.quote-item .it-desc{grid-column:1/-1}.quote-v2-form{padding:14px}}`;document.head.appendChild(s)}

injectStyles();
const button=document.getElementById('new-budget');
if(button){button.onclick=()=>openEditor();}
refreshBudgetList();
window.PorcelaneQuotes={openEditor,refreshBudgetList,calcTotals};
