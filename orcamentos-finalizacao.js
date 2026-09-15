import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();

const service = (name = '') => ({ id: uid(), name, qty: 1, unit_value: 0, internal_cost: 0 });
const supply = (name = '') => ({ id: uid(), name, qty: 1, unit_value: 0, internal_cost: 0 });
const item = () => ({ id: uid(), description: '', qty: 1, length: 0, width: 0, unit_price: 0, final_value: null, has_emenda: false, emenda_position: '', internal_cost: 0 });
const env = (name = '') => ({ id: uid(), name, material_name: '', material_price_m2: 0, material_cost_m2: 0, items: [item()], services: [], supplies: [], notes: '' });
const blank = () => ({
  date: new Date().toISOString().slice(0,10), client_name:'', phone:'', job_name:'', address:'', city:'', salesperson:'', salesperson_external:'', architect:'',
  type:'convencional', payment:'40% Pix + 60% cartão até 3x', delivery:'retirada', freight:0, discount:0, measurement_fee:0, validity:15,
  environments:[env('Cozinha')], operating_cost:0, commission_percent:0, notes:'', group_number:'', proposal_suffix:1
});

function calcItem(i, e) {
  const area = Math.max(0, Number(i.length||0) * Number(i.width||0));
  const total = i.final_value === null || i.final_value === '' || i.final_value === undefined
    ? area * Number(i.unit_price || e.material_price_m2 || 0) * Number(i.qty || 1)
    : Number(i.final_value || 0);
  const cost = Number(i.internal_cost || 0) || area * Number(e.material_cost_m2 || 0) * Number(i.qty || 1);
  return { area: area * Number(i.qty || 1), total, cost };
}
function calcEnv(e) {
  const items = (e.items||[]).reduce((a,i)=>{const c=calcItem(i,e);return {area:a.area+c.area,total:a.total+c.total,cost:a.cost+c.cost};},{area:0,total:0,cost:0});
  const services=(e.services||[]).reduce((a,x)=>({total:a.total+Number(x.qty||0)*Number(x.unit_value||0),cost:a.cost+Number(x.qty||0)*Number(x.internal_cost||0)}),{total:0,cost:0});
  const supplies=(e.supplies||[]).reduce((a,x)=>({total:a.total+Number(x.qty||0)*Number(x.unit_value||0),cost:a.cost+Number(x.qty||0)*Number(x.internal_cost||0)}),{total:0,cost:0});
  return {area:items.area,total:items.total+services.total+supplies.total,cost:items.cost+services.cost+supplies.cost};
}
function totals(d){
  const x=(d.environments||[]).reduce((a,e)=>{const c=calcEnv(e);return {area:a.area+c.area,subtotal:a.subtotal+c.total,cost:a.cost+c.cost};},{area:0,subtotal:0,cost:0});
  const gross=x.subtotal+Number(d.freight||0)+Number(d.measurement_fee||0)-Number(d.discount||0);
  const cost=x.cost+Number(d.operating_cost||0);
  const commission=gross*(Number(d.commission_percent||0)/100);
  return {...x,total:Math.max(0,gross),commission,profit:gross-cost-commission,margin:gross>0?((gross-cost-commission)/gross)*100:0};
}

async function nextGroup(){
  const {data}=await supabase.from('orcamentos').select('grupo_numero');
  const nums=(data||[]).map(x=>Number(x.grupo_numero)).filter(Number.isFinite);
  return String((nums.length?Math.max(...nums):0)+1);
}
async function nextSuffix(group){
  const {data}=await supabase.from('orcamentos').select('numero').eq('grupo_numero',group);
  const nums=(data||[]).map(x=>Number(String(x.numero||'').split('-').pop())).filter(Number.isFinite);
  return (nums.length?Math.max(...nums):0)+1;
}
function quoteNumber(group,suffix){return `${group}-${suffix}`;}

async function load(id){
  if(!id) return {d:blank(),status:'rascunho',number:''};
  const {data,error}=await supabase.from('orcamentos').select('*').eq('id',id).maybeSingle();
  if(error||!data) throw new Error('Orçamento não encontrado.');
  const d={...blank(),...(data.dados||{})};
  d.discount=Number(data.desconto||d.discount||0); d.measurement_fee=Number(data.medicao_taxa||d.measurement_fee||0);
  d.payment=data.forma_pagamento||d.payment; d.delivery=data.tipo_entrega||d.delivery; d.group_number=data.grupo_numero||d.group_number;
  const parts=String(data.numero||'').split('-'); d.proposal_suffix=Number(parts.pop())||d.proposal_suffix;
  return {d,status:data.status||'rascunho',number:data.numero||''};
}

function style(){
 if(document.getElementById('orc-final-style')) return;
 const s=document.createElement('style'); s.id='orc-final-style'; s.textContent=`
#orc-final-modal{border:0;border-radius:18px;width:min(1180px,96vw);max-height:94vh;padding:0;box-shadow:0 24px 80px #0003}.of-form{padding:0;background:#faf9f6;color:#171717}.of-head{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid #e7e3dc;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.of-head h2{margin:4px 0 0}.of-body{padding:20px 24px}.of-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.of-card{background:#fff;border:1px solid #e8e3db;border-radius:14px;padding:16px;margin-bottom:16px}.of-card h3{margin:0 0 12px}.of-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.of-fields label,.of-field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#555}.of-fields input,.of-fields select,.of-fields textarea,.of-inline input,.of-inline select{border:1px solid #ddd6cd;border-radius:9px;padding:9px;background:#fff;color:#111}.of-fields textarea{min-height:70px}.of-section{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.of-section h3{margin:0}.of-env{border:1px solid #e5dfd6;border-radius:12px;padding:12px;margin-top:12px}.of-env-head{display:grid;grid-template-columns:1.2fr 1.2fr .7fr auto auto;gap:8px}.of-items{margin-top:10px}.of-item{display:grid;grid-template-columns:2fr .65fr .65fr .7fr .9fr auto;gap:7px;align-items:center;margin:7px 0}.of-item small{font-size:11px;color:#777}.of-extra{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.of-list{display:grid;gap:6px}.of-line{display:grid;grid-template-columns:1.5fr .5fr .7fr .7fr auto;gap:7px;align-items:center}.of-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.of-summary div{background:#fff;border:1px solid #e8e3db;border-radius:12px;padding:12px}.of-summary span{display:block;color:#777;font-size:11px}.of-summary strong{font-size:18px}.of-internal{background:#f1eee8;border:1px dashed #cfc6b9}.of-foot{position:sticky;bottom:0;background:#fff;border-top:1px solid #e7e3dc;padding:14px 24px;display:flex;justify-content:space-between;gap:10px}.of-actions{display:flex;gap:8px;flex-wrap:wrap}.of-btn{border:1px solid #d8d0c5;background:#fff;border-radius:9px;padding:8px 11px;cursor:pointer}.of-primary{background:#1d1d1d;color:#fff;border-color:#1d1d1d}.of-danger{color:#a22}.of-muted{color:#777;font-size:12px}@media(max-width:800px){.of-grid,.of-fields,.of-summary{grid-template-columns:1fr}.of-env-head{grid-template-columns:1fr 1fr}.of-item{grid-template-columns:1fr 1fr 1fr}.of-line{grid-template-columns:1fr 1fr}}
`; document.head.appendChild(s);
}

function openEditor(id=null){
 style(); const old=$('#orc-final-modal'); if(old) old.remove();
 const dialog=document.createElement('dialog'); dialog.id='orc-final-modal';
 dialog.innerHTML=`<form class="of-form" method="dialog"><div class="of-head"><div><div class="of-muted">PORCELANE · ORÇAMENTOS</div><h2>${id?'Editar orçamento':'Novo orçamento'}</h2></div><button type="button" class="of-btn" id="of-close">×</button></div><div class="of-body" id="of-body"><div class="of-muted">Carregando...</div></div><div class="of-foot"><span class="of-muted" id="of-state">Dados integrados ao pedido</span><div class="of-actions"><button type="button" class="of-btn" id="of-cancel">Cancelar</button><button type="button" class="of-btn of-primary" id="of-save">Salvar orçamento</button></div></div></form>`;
 document.body.appendChild(dialog); dialog.showModal(); $('#of-close',dialog).onclick=()=>dialog.close(); $('#of-cancel',dialog).onclick=()=>dialog.close();
 load(id).then(x=>render(dialog,id,x.d,x.status,x.number)).catch(e=>{alert(e.message);dialog.close()});
}

function render(dialog,id,d,status,number){
 const body=$('#of-body',dialog); const t=totals(d);
 body.innerHTML=`<div class="of-grid"><section class="of-card"><h3>Dados comerciais</h3><div class="of-fields">
 <label>Cliente<input data-k="client_name" value="${esc(d.client_name)}"></label><label>Telefone / WhatsApp<input data-k="phone" value="${esc(d.phone)}"></label>
 <label>Obra<input data-k="job_name" value="${esc(d.job_name)}"></label><label>Endereço<input data-k="address" value="${esc(d.address)}"></label>
 <label>Cidade<input data-k="city" value="${esc(d.city)}"></label><label>Vendedor interno<input data-k="salesperson" value="${esc(d.salesperson)}"></label>
 <label>Vendedor externo<input data-k="salesperson_external" value="${esc(d.salesperson_external)}"></label><label>Arquiteto<input data-k="architect" value="${esc(d.architect)}"></label>
 <label>Tipo<select data-k="type"><option value="convencional">Convencional</option><option value="mfc">MFC</option></select></label>
 </div></section><section class="of-card"><h3>Condições</h3><div class="of-fields">
 <label>Pagamento<select data-k="payment"><option>40% Pix + 60% cartão até 3x</option><option>Pix</option><option>Cartão</option><option>Outro</option></select></label>
 <label>Entrega<select data-k="delivery"><option value="retirada">Retirada</option><option value="entrega_sem_instalacao">Entrega sem instalação</option><option value="entrega_instalacao">Entrega + instalação</option></select></label>
 <label>Frete<input data-k="freight" type="number" step="0.01" value="${Number(d.freight||0)}"></label><label>Desconto<input data-k="discount" type="number" step="0.01" value="${Number(d.discount||0)}"></label>
 <label>Taxa de medição<input data-k="measurement_fee" type="number" step="0.01" value="${Number(d.measurement_fee||0)}"></label><label>Validade<input data-k="validity" type="number" value="${Number(d.validity||15)}"></label>
 </div></section></div>
 <section class="of-card"><div class="of-section"><h3>Ambientes, peças, serviços e insumos</h3><button type="button" class="of-btn" id="of-add-env">+ Ambiente</button></div><div id="of-envs"></div></section>
 <section class="of-card of-internal"><div class="of-section"><h3>Custos internos</h3><span class="of-muted">não aparecem no PDF do cliente</span></div><div class="of-fields"><label>Custo operacional<input data-k="operating_cost" type="number" step="0.01" value="${Number(d.operating_cost||0)}"></label><label>Comissão %<input data-k="commission_percent" type="number" step="0.01" value="${Number(d.commission_percent||0)}"></label></div></section>
 <div class="of-summary"><div><span>Área</span><strong id="of-area">${t.area.toLocaleString('pt-BR',{maximumFractionDigits:2})} m²</strong></div><div><span>Subtotal</span><strong id="of-subtotal">${money(t.subtotal)}</strong></div><div><span>Total</span><strong id="of-total">${money(t.total)}</strong></div><div><span>Margem interna</span><strong id="of-margin">${t.margin.toFixed(1)}%</strong></div></div>
 <section class="of-card"><label class="of-field">Observações<textarea data-k="notes">${esc(d.notes||'')}</textarea></label></section>`;
 body.querySelectorAll('[data-k]').forEach(el=>{el.value=d[el.dataset.k]??el.value;el.addEventListener('input',()=>{const k=el.dataset.k;d[k]=el.type==='number'?Number(el.value||0):el.value;refreshTotals()})});
 const envBox=$('#of-envs',body);
 function refreshTotals(){const x=totals(d);$('#of-area').textContent=x.area.toLocaleString('pt-BR',{maximumFractionDigits:2})+' m²';$('#of-subtotal').textContent=money(x.subtotal);$('#of-total').textContent=money(x.total);$('#of-margin').textContent=x.margin.toFixed(1)+'%'}
 function renderEnvs(){
  envBox.innerHTML=(d.environments||[]).map((e,ei)=>`<div class="of-env"><div class="of-env-head"><input class="e-name" value="${esc(e.name)}"><input class="e-material" placeholder="Material" value="${esc(e.material_name)}"><input class="e-price" type="number" step="0.01" placeholder="Venda/m²" value="${Number(e.material_price_m2||0)}"><input class="e-cost" type="number" step="0.01" placeholder="Custo/m²" value="${Number(e.material_cost_m2||0)}"><button type="button" class="of-btn e-copy">Duplicar</button><button type="button" class="of-btn of-danger e-del">×</button></div>
  <div class="of-items"><div class="of-muted">Peças</div>${(e.items||[]).map((it,ii)=>{const c=calcItem(it,e);return `<div class="of-item"><input class="i-desc" placeholder="Descrição" value="${esc(it.description)}"><input class="i-l" type="number" step="0.001" placeholder="Comp." value="${Number(it.length||0)}"><input class="i-w" type="number" step="0.001" placeholder="Larg." value="${Number(it.width||0)}"><span><small>${c.area.toLocaleString('pt-BR',{maximumFractionDigits:2})} m²</small></span><input class="i-v" type="number" step="0.01" placeholder="Valor automático" value="${it.final_value==null?'':Number(it.final_value)}"><button type="button" class="of-btn of-danger i-del">×</button></div>`}).join('')}</div><button type="button" class="of-btn i-add">+ Peça</button>
  <div class="of-extra"><div><div class="of-muted">Serviços</div><div class="of-list services">${(e.services||[]).map((x,xi)=>`<div class="of-line"><input class="s-name" value="${esc(x.name)}" placeholder="Ex.: recorte cooktop"><input class="s-qty" type="number" step="0.01" value="${Number(x.qty||1)}"><input class="s-val" type="number" step="0.01" value="${Number(x.unit_value||0)}"><input class="s-cost" type="number" step="0.01" value="${Number(x.internal_cost||0)}"><button type="button" class="of-btn of-danger s-del">×</button></div>`).join('')}</div><button type="button" class="of-btn s-add">+ Serviço</button></div>
  <div><div class="of-muted">Insumos</div><div class="of-list supplies">${(e.supplies||[]).map((x,xi)=>`<div class="of-line"><input class="p-name" value="${esc(x.name)}" placeholder="Ex.: silicone"><input class="p-qty" type="number" step="0.01" value="${Number(x.qty||1)}"><input class="p-val" type="number" step="0.01" value="${Number(x.unit_value||0)}"><input class="p-cost" type="number" step="0.01" value="${Number(x.internal_cost||0)}"><button type="button" class="of-btn of-danger p-del">×</button></div>`).join('')}</div><button type="button" class="of-btn p-add">+ Insumo</button></div></div>
  <div class="of-muted" style="margin-top:8px">Subtotal do ambiente: <strong>${money(calcEnv(e).total)}</strong></div></div>`).join('');
  envBox.querySelectorAll('.of-env').forEach((card,ei)=>{
   const e=d.environments[ei];
   $('.e-name',card).oninput=x=>e.name=x.target.value; $('.e-material',card).oninput=x=>e.material_name=x.target.value; $('.e-price',card).oninput=x=>{e.material_price_m2=Number(x.target.value||0);renderEnvs()}; $('.e-cost',card).oninput=x=>e.material_cost_m2=Number(x.target.value||0);
   $('.e-del',card).onclick=()=>{d.environments.splice(ei,1);renderEnvs()}; $('.e-copy',card).onclick=()=>{const cp=JSON.parse(JSON.stringify(e));cp.id=uid();cp.name=e.name+' (cópia)';cp.items=(cp.items||[]).map(x=>({...x,id:uid()}));d.environments.splice(ei+1,0,cp);renderEnvs()};
   $('.i-add',card).onclick=()=>{e.items.push(item());renderEnvs()};
   card.querySelectorAll('.of-item').forEach((row,ii)=>{const it=e.items[ii];$('.i-desc',row).oninput=x=>it.description=x.target.value;$('.i-l',row).oninput=x=>{it.length=Number(x.target.value||0);renderEnvs()};$('.i-w',row).oninput=x=>{it.width=Number(x.target.value||0);renderEnvs()};$('.i-v',row).oninput=x=>it.final_value=x.target.value===''?null:Number(x.target.value);$('.i-del',row).onclick=()=>{e.items.splice(ii,1);renderEnvs()}});
   $('.s-add',card).onclick=()=>{e.services.push(service());renderEnvs()}; $('.p-add',card).onclick=()=>{e.supplies.push(supply());renderEnvs()};
   card.querySelectorAll('.services .of-line').forEach((row,xi)=>{const x=e.services[xi];$('.s-name',row).oninput=v=>x.name=v.target.value;$('.s-qty',row).oninput=v=>x.qty=Number(v.target.value||0);$('.s-val',row).oninput=v=>x.unit_value=Number(v.target.value||0);$('.s-cost',row).oninput=v=>x.internal_cost=Number(v.target.value||0);$('.s-del',row).onclick=()=>{e.services.splice(xi,1);renderEnvs()}});
   card.querySelectorAll('.supplies .of-line').forEach((row,xi)=>{const x=e.supplies[xi];$('.p-name',row).oninput=v=>x.name=v.target.value;$('.p-qty',row).oninput=v=>x.qty=Number(v.target.value||0);$('.p-val',row).oninput=v=>x.unit_value=Number(v.target.value||0);$('.p-cost',row).oninput=v=>x.internal_cost=Number(v.target.value||0);$('.p-del',row).onclick=()=>{e.supplies.splice(xi,1);renderEnvs()}});
  });
  refreshTotals();
 }
 $('#of-add-env',body).onclick=()=>{d.environments.push(env(`Ambiente ${d.environments.length+1}`));renderEnvs()}; renderEnvs();
 $('#of-save',dialog).onclick=()=>save(d,id,status,number,dialog);
}

async function ensureClient(name,phone){const {data:x}=await supabase.from('clientes').select('id').ilike('nome',name).maybeSingle();if(x)return x.id;const {data,error}=await supabase.from('clientes').insert({nome:name,telefone:phone||null}).select('id').single();if(error)throw error;return data.id}
async function ensureObra(name,clientId){const {data:x}=await supabase.from('obras').select('id').eq('cliente_id',clientId).ilike('nome',name).maybeSingle();if(x)return x.id;const {data,error}=await supabase.from('obras').insert({nome:name||'Obra sem nome',cliente_id:clientId}).select('id').single();if(error)throw error;return data.id}

async function save(d,id,status,number,dialog){
 if(!d.client_name.trim()){alert('Informe o cliente.');return}
 const group=d.group_number||await nextGroup(); const suffix=id?d.proposal_suffix||Number(String(number).split('-').pop())||1:await nextSuffix(group); d.group_number=group; d.proposal_suffix=suffix;
 const num=number||quoteNumber(group,suffix); const t=totals(d); const clientId=await ensureClient(d.client_name.trim(),d.phone); const obraId=await ensureObra(d.job_name.trim()||d.address.trim()||'Obra sem nome',clientId);
 const payload={cliente_id:clientId,obra_id:obraId,numero:num,grupo_numero:group,tipo_orcamento:d.type||'convencional',valor_total:t.total,area_m2:t.area,preco_m2:t.area?t.subtotal/t.area:0,desconto:Number(d.discount||0),margem_percentual:t.margin,forma_pagamento:d.payment,tipo_entrega:d.delivery,medicao_taxa:Number(d.measurement_fee||0),status:status||'rascunho',dados:d};
 const r=id?await supabase.from('orcamentos').update(payload).eq('id',id).select('id,numero').single():await supabase.from('orcamentos').insert(payload).select('id,numero').single();
 if(r.error)throw r.error; await supabase.from('auditoria_operacional').insert({tabela:'orcamentos',registro_id:r.data.id,acao:id?'edicao':'criacao',dados:{numero:r.data.numero,total:t.total}}); dialog.close(); await refresh();
}

function pdf(row){
 const d=row.dados||{},t=totals({...blank(),...d}); const w=window.open('','_blank','width=900,height=700'); if(!w)return;
 const envs=(d.environments||[]).map(e=>`<section><h3>${esc(e.name)} · ${esc(e.material_name||'Material não informado')}</h3><table><tr><th>Peça</th><th>Medidas</th><th>m²</th><th>Valor</th></tr>${(e.items||[]).map(i=>{const c=calcItem(i,e);return `<tr><td>${esc(i.description||'Peça')}</td><td>${Number(i.length||0)} × ${Number(i.width||0)}</td><td>${c.area.toFixed(2)}</td><td>${money(c.total)}</td></tr>`}).join('')}</table>${(e.services||[]).length?`<p><b>Serviços:</b> ${(e.services||[]).map(x=>`${esc(x.name)} (${x.qty} × ${money(x.unit_value)})`).join(', ')}</p>`:''}${(e.supplies||[]).length?`<p><b>Insumos:</b> ${(e.supplies||[]).map(x=>`${esc(x.name)} (${x.qty} × ${money(x.unit_value)})`).join(', ')}</p>`:''}</section>`).join('');
 w.document.write(`<html><head><title>Orçamento ${esc(row.numero)}</title><style>body{font:14px Arial;color:#222;padding:35px}h1{margin:0}h2{margin:6px 0 24px}section{margin:22px 0}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:22px;margin-top:20px}</style></head><body><h1>PORCELANE</h1><h2>Orçamento ${esc(row.numero)}</h2><p><b>Cliente:</b> ${esc(d.client_name||'')}<br><b>Obra:</b> ${esc(d.job_name||d.address||'')}<br><b>Endereço:</b> ${esc(d.address||'')} ${esc(d.city||'')}</p>${envs}<p class="total"><b>Total: ${money(t.total)}</b></p><p>Pagamento: ${esc(d.payment||'')} · Validade: ${Number(d.validity||15)} dias</p><p>${esc(d.notes||'')}</p><script>window.onload=()=>window.print()</script></body></html>`); w.document.close();
}

async function convert(row){
 const {data:existing}=await supabase.from('pedidos').select('id,numero').eq('orcamento_id',row.id).maybeSingle(); if(existing){alert(`Já existe o pedido ${existing.numero||''}.`);return}
 const d=row.dados||{}; const {data:order,error}=await supabase.from('pedidos').insert({cliente_id:row.cliente_id,obra_id:row.obra_id,orcamento_id:row.id,numero:row.numero,tipo:d.delivery||'retirada',status:'aberto',valor_total:row.valor_total,desconto:row.desconto||0,forma_pagamento:row.forma_pagamento||d.payment,tipo_entrega:row.tipo_entrega||d.delivery,observacoes:d.notes||null,medicao_aprovada:false}).select('id,numero').single();
 if(error){alert('Não foi possível gerar o pedido: '+error.message);return}
 await supabase.from('orcamentos').update({status:'aprovado',aprovado_em:new Date().toISOString()}).eq('id',row.id);
 await supabase.from('auditoria_operacional').insert({tabela:'pedidos',registro_id:order.id,acao:'origem_orcamento',dados:{orcamento_id:row.id,numero_orcamento:row.numero}});
 alert(`Pedido ${order.numero||row.numero} criado. A produção continua bloqueada até medição aprovada.`); await refresh();
}

async function refresh(){
 const {data,error}=await supabase.from('orcamentos').select('id,numero,grupo_numero,status,valor_total,area_m2,dados,cliente_id,obra_id,forma_pagamento,tipo_entrega,desconto,criado_em').order('criado_em',{ascending:false}); if(error)return;
 const tbody=document.getElementById('budgets-table'); if(!tbody)return;
 tbody.innerHTML=(data||[]).map(b=>{const d=b.dados||{};return `<tr><td>${esc(b.numero)}</td><td>${esc(d.client_name||'')}</td><td>${esc(d.job_name||d.address||'')}</td><td>${money(b.valor_total)}</td><td>${esc(b.status||'rascunho')}</td><td><div class="of-actions"><button type="button" class="of-btn" data-edit="${b.id}">Editar</button><button type="button" class="of-btn" data-pdf="${b.id}">PDF</button><button type="button" class="of-btn" data-copy="${b.id}">Aditivo</button><button type="button" class="of-btn of-primary" data-order="${b.id}">Gerar pedido</button></div></td></tr>`}).join('');
 const byId=new Map((data||[]).map(x=>[x.id,x]));
 $$('[data-edit]',tbody).forEach(b=>b.onclick=()=>openEditor(b.dataset.edit)); $$('[data-pdf]',tbody).forEach(b=>b.onclick=()=>pdf(byId.get(b.dataset.pdf))); $$('[data-order]',tbody).forEach(b=>b.onclick=()=>convert(byId.get(b.dataset.order)));
 $$('[data-copy]',tbody).forEach(b=>b.onclick=async()=>{const r=byId.get(b.dataset.copy);const d={...blank(),...(r.dados||{})};d.group_number=r.grupo_numero||String(r.numero||'').split('-')[0];d.proposal_suffix=await nextSuffix(d.group_number);openEditorWithData(d);});
}
function openEditorWithData(d){style();const id=null;const old=$('#orc-final-modal');if(old)old.remove();const dialog=document.createElement('dialog');dialog.id='orc-final-modal';dialog.innerHTML=`<form class="of-form" method="dialog"><div class="of-head"><div><div class="of-muted">PORCELANE · COMERCIAL</div><h2>Novo aditivo</h2></div><button type="button" class="of-btn" id="of-close">×</button></div><div class="of-body" id="of-body"></div><div class="of-foot"><span class="of-muted">Novo número será criado dentro do mesmo grupo</span><div><button type="button" class="of-btn" id="of-cancel">Cancelar</button><button type="button" class="of-btn of-primary" id="of-save">Salvar orçamento</button></div></div></form>`;document.body.appendChild(dialog);dialog.showModal();$('#of-close',dialog).onclick=()=>dialog.close();$('#of-cancel',dialog).onclick=()=>dialog.close();render(dialog,id,d,'rascunho','');}

window.PorcelaneQuotes={...(window.PorcelaneQuotes||{}),openEditor,refreshBudgetList:refresh,refresh};
setTimeout(refresh,1000);
