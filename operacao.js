import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = createClient(url, key);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brDate = v => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

async function loadProduction(){
  const {data,error}=await db.from('ordens_producao').select('id,numero,status,data_liberacao,data_inicio,data_conclusao,observacoes,pedido_id,pedido:pedidos(numero,cliente:clientes(nome))').order('criado_em',{ascending:false});
  if(error){console.warn(error);return []}
  return data||[];
}
async function loadCuts(){
  const {data,error}=await db.from('ordens_corte').select('id,pedido_id,ordem_producao_id,status,data_liberacao,data_corte,operador,observacoes,pedido:pedidos(numero,cliente:clientes(nome))').order('criado_em',{ascending:false});
  if(error){console.warn(error);return []}
  return data||[];
}
async function loadMaterials(){
  const {data,error}=await db.from('materiais').select('id,nome,unidade,estoque,estoque_minimo,custo,preco').eq('ativo',true).order('nome');
  if(error){console.warn(error);return []}
  return data||[];
}
function panel(title,body){return `<div class="panel"><div class="panel-head"><h3>${title}</h3></div>${body}</div>`}
function rows(items,empty,mapper){return items.length?items.map(mapper).join(''): `<div class="empty">${empty}</div>`}
async function render(){
  const [ops,cuts,mats]=await Promise.all([loadProduction(),loadCuts(),loadMaterials()]);
  const prod=document.querySelector('#producao .production-grid');
  if(prod){
    const cards=ops.map(op=>`<div class="list-row"><strong>${esc(op.numero||'OP')}</strong><span>${esc(op.pedido?.numero||'')} · ${esc(op.pedido?.cliente?.nome||'')}</span><span class="badge ${op.status==='concluida'?'green':'amber'}">${esc(op.status||'liberada')}</span><button data-op="${op.id}">Abrir</button></div>`).join('')||'<div class="empty">Nenhuma ordem de produção.</div>';
    prod.innerHTML=panel('Ordens de produção',`<div class="list">${cards}</div>`)+panel('Corte / PCP',`<div class="list">${rows(cuts,'Nenhuma ordem de corte.',c=>`<div class="list-row"><strong>${esc(c.pedido?.numero||'Corte')}</strong><span>${esc(c.pedido?.cliente?.nome||'')}</span><span class="badge ${c.status==='concluida'?'green':'amber'}">${esc(c.status||'liberada')}</span><span>${brDate(c.data_liberacao)}</span><button data-cut="${c.id}">Abrir</button></div>`)}</div>`);
    prod.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>openOP(ops.find(x=>x.id===b.dataset.op)));
    prod.querySelectorAll('[data-cut]').forEach(b=>b.onclick=()=>openCut(cuts.find(x=>x.id===b.dataset.cut)));
  }
  const finish=document.querySelector('#acabamento .panel');
  if(finish) finish.innerHTML=`<div class="panel-head"><h3>Fila de acabamento</h3></div><div class="list">${rows(ops.filter(o=>o.status==='concluida'),'Nenhuma ordem pronta para acabamento.',o=>`<div class="list-row"><strong>${esc(o.numero)}</strong><span>${esc(o.pedido?.cliente?.nome||'')}</span><span class="badge green">Pronta para acabamento</span></div>`)}</div>`;
  const log=document.querySelector('#logistica .panel');
  if(log){const {data}=await db.from('entregas').select('id,pedido_id,data_agendada,hora_inicio,hora_fim,status,endereco,responsavel,pedido:pedidos(numero,cliente:clientes(nome))').order('data_agendada',{ascending:true});log.innerHTML=`<div class="panel-head"><h3>Agenda de carregamento e entrega</h3></div><div class="list">${rows(data||[],'Nenhuma entrega agendada.',e=>`<div class="list-row"><strong>${esc(e.pedido?.numero||'Entrega')}</strong><span>${esc(e.pedido?.cliente?.nome||'')}</span><span>${brDate(e.data_agendada)} ${e.hora_inicio?esc(e.hora_inicio):''}</span><span class="badge amber">${esc(e.status||'agendada')}</span></div>`)}</div>`}
  const inst=document.querySelector('#instalacao .panel');
  if(inst){const {data}=await db.from('instalacoes').select('id,pedido_id,data_agendada,hora_inicio,hora_fim,status,instalador,observacoes,pedido:pedidos(numero,cliente:clientes(nome))').order('data_agendada',{ascending:true});inst.innerHTML=`<div class="panel-head"><h3>Agenda de instalação</h3></div><div class="list">${rows(data||[],'Nenhuma instalação agendada.',i=>`<div class="list-row"><strong>${esc(i.pedido?.numero||'Instalação')}</strong><span>${esc(i.pedido?.cliente?.nome||'')}</span><span>${brDate(i.data_agendada)} ${i.hora_inicio?esc(i.hora_inicio):''}</span><span class="badge ${i.status==='concluida'?'green':'amber'}">${esc(i.status||'agendada')}</span><span>${esc(i.instalador||'')}</span></div>`)}</div>`}
  const stock=document.querySelector('#estoque .panel')||document.querySelector('#estoque');
  if(stock){stock.innerHTML=panel('Estoque operacional',`<div class="table-panel"><table><thead><tr><th>Material</th><th>Unid.</th><th>Estoque</th><th>Mínimo</th><th>Preço</th><th></th></tr></thead><tbody>${rows(mats,'Nenhum material cadastrado.',m=>`<tr><td>${esc(m.nome)}</td><td>${esc(m.unidade||'—')}</td><td>${Number(m.estoque||0)}</td><td>${Number(m.estoque_minimo||0)}</td><td>${money(m.preco)}</td><td>${Number(m.estoque||0)<=Number(m.estoque_minimo||0)?'<span class="badge amber">Repor</span>':'<span class="badge green">OK</span>'}</td></tr>`)}</tbody></table></div>`)}
}
function dialog(title,body,save){const old=document.getElementById('pcp-dialog');old?.remove();const d=document.createElement('dialog');d.id='pcp-dialog';d.innerHTML=`<form method="dialog" class="panel" style="min-width:min(680px,92vw)"><div class="panel-head"><h3>${title}</h3><button value="cancel">×</button></div>${body}<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button value="cancel">Cancelar</button><button class="primary" id="pcp-save">Salvar</button></div></form>`;document.body.appendChild(d);d.querySelector('#pcp-save').onclick=async e=>{e.preventDefault();if(await save(d))d.close()};d.showModal()}
async function openOP(op){if(!op)return;dialog(`Ordem ${op.numero}`,`<p><strong>${esc(op.pedido?.numero||'')}</strong> · ${esc(op.pedido?.cliente?.nome||'')}</p><label>Status<select id="s"><option ${op.status==='liberada'?'selected':''}>liberada</option><option ${op.status==='em_producao'?'selected':''}>em_producao</option><option ${op.status==='concluida'?'selected':''}>concluida</option></select></label><label>Observações<textarea id="n">${esc(op.observacoes||'')}</textarea></label>`,async d=>{const s=d.querySelector('#s').value;const patch={status:s,observacoes:d.querySelector('#n').value||null};if(s==='em_producao'&&!op.data_inicio)patch.data_inicio=new Date().toISOString().slice(0,10);if(s==='concluida')patch.data_conclusao=new Date().toISOString().slice(0,10);const {error}=await db.from('ordens_producao').update(patch).eq('id',op.id);if(error){alert(error.message);return false}await render();return true})}
async function openCut(c){if(!c)return;dialog(`Ordem de corte — ${c.pedido?.numero||''}`,`<p><strong>${esc(c.pedido?.cliente?.nome||'')}</strong></p><label>Status<select id="s"><option ${c.status==='liberada'?'selected':''}>liberada</option><option ${c.status==='em_corte'?'selected':''}>em_corte</option><option ${c.status==='concluida'?'selected':''}>concluida</option></select></label><label>Operador<input id="o" value="${esc(c.operador||'')}"></label><label>Observações<textarea id="n">${esc(c.observacoes||'')}</textarea></label>`,async d=>{const s=d.querySelector('#s').value;const patch={status:s,operador:d.querySelector('#o').value||null,observacoes:d.querySelector('#n').value||null};if(s==='concluida')patch.data_corte=new Date().toISOString().slice(0,10);const {error}=await db.from('ordens_corte').update(patch).eq('id',c.id);if(error){alert(error.message);return false}await render();return true})}
window.addEventListener('load',()=>setTimeout(render,1100));
window.addEventListener('hashchange',()=>setTimeout(render,250));