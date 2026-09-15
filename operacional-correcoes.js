import { createClient } from '@supabase/supabase-js';

const db = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = v => v ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR') : '—';

function printA4(title, body) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) { alert('Permita pop-ups para gerar o PDF.'); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#151515;font-size:10.5px;line-height:1.4;margin:0}h1{font-size:21px;margin:0}h2{font-size:13px;margin:18px 0 8px;border-bottom:1px solid #222;padding-bottom:5px}.brand{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}.meta{color:#666}.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.box{border:1px solid #ccc;padding:8px;border-radius:4px}.label{font-size:8px;text-transform:uppercase;color:#666}.value{font-weight:600;margin-top:2px}.items{width:100%;border-collapse:collapse}.items th,.items td{border:1px solid #ccc;padding:5px;text-align:left}.items th{background:#f3f1ed}.right{text-align:right}.total{font-size:14px;font-weight:700;text-align:right;margin-top:10px}.footer{margin-top:25px;padding-top:7px;border-top:1px solid #ccc;font-size:8px;color:#666}@media print{button{display:none}}</style></head><body><div class="brand"><div><h1>PORCELANE</h1><div class="meta">Gestão operacional · Documento A4</div></div><div class="meta">${new Date().toLocaleDateString('pt-BR')}</div></div>${body}<div class="footer">PORCELANE · Documento gerado pelo sistema operacional.</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  w.document.close();
}

async function loadOrder(id) {
  const { data, error } = await db.from('pedidos').select('id,numero,status,tipo,valor_total,desconto,forma_pagamento,tipo_entrega,data_medicao,medicao_aprovada,cliente:clientes(nome,telefone,email),obra:obras(nome)').eq('id', id).maybeSingle();
  if (error || !data) throw new Error('Pedido não encontrado.');
  const { data: items, error: itemError } = await db.from('pedido_itens').select('descricao,quantidade,unidade,valor_unitario,valor_total,observacoes').eq('pedido_id', id).order('criado_em', { ascending: true });
  if (itemError) throw itemError;
  return { ...data, items: items || [] };
}

function itemRows(items) {
  if (!items.length) return '<tr><td colspan="5">Nenhum item detalhado registrado.</td></tr>';
  return items.map(i => `<tr><td>${esc(i.descricao || 'Item')}</td><td>${esc(i.quantidade ?? '')}</td><td>${esc(i.unidade || '')}</td><td class="right">${money(i.valor_unitario)}</td><td class="right">${money(i.valor_total)}</td></tr>`).join('');
}

async function openItemized(type, id) {
  try {
    const p = await loadOrder(id);
    const title = type === 'pedido' ? `Pedido ${p.numero}` : type === 'protocolo' ? `Protocolo ${p.numero}` : `Termo ${p.numero}`;
    const head = `<h2>${type === 'pedido' ? 'Pedido' : type === 'protocolo' ? 'Protocolo de entrega/retirada' : 'Termo de entrega e recebimento'} ${esc(p.numero)}</h2><div class="grid"><div class="box"><div class="label">Cliente</div><div class="value">${esc(p.cliente?.nome)}</div></div><div class="box"><div class="label">Obra</div><div class="value">${esc(p.obra?.nome)}</div></div><div class="box"><div class="label">Medição</div><div class="value">${p.data_medicao ? `${date(p.data_medicao)} · ${p.medicao_aprovada ? 'APROVADA' : 'PENDENTE'}` : 'Não registrada'}</div></div><div class="box"><div class="label">Pagamento</div><div class="value">${esc(p.forma_pagamento || '')}</div></div></div>`;
    const table = `<h2>Itens do pedido</h2><table class="items"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Un.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${itemRows(p.items)}</tbody></table><div class="total">Total: ${money(p.valor_total)}</div>`;
    const note = type === 'pedido' ? '<h2>Conferência</h2><p>Medição registrada e aprovação conferida conforme fluxo operacional.</p>' : '<h2>Registro</h2><p>Documento vinculado ao mesmo pedido e aos mesmos itens registrados no sistema.</p>';
    printA4(title, head + table + note);
  } catch (e) {
    alert(`Não foi possível gerar o documento: ${e.message || e}`);
  }
}

function installDocumentFix() {
  if (window.__porcelaneDocumentFix) return;
  window.__porcelaneDocumentFix = true;
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-doc][data-id]');
    if (!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openItemized(button.dataset.doc, button.dataset.id);
  }, true);
}

installDocumentFix();
window.addEventListener('load', () => setTimeout(installDocumentFix, 500));
