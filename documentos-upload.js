import { createClient } from '@supabase/supabase-js';

const db = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const BUCKET = 'pedidos-fechados';

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function empresaAtual(){
  const {data:{user}}=await db.auth.getUser();
  if(!user?.email)return null;
  const {data}=await db.from('perfis').select('empresa_id').ilike('email',user.email).eq('ativo',true).maybeSingle();
  return data?.empresa_id||null;
}

function safeName(name){return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_');}

async function uploadPdf(pedidoId,file){
  if(file.type!=='application/pdf'){alert('Selecione um arquivo PDF.');return false;}
  if(file.size>25*1024*1024){alert('O PDF deve ter no máximo 25 MB.');return false;}
  const empresaId=await empresaAtual();
  if(!empresaId){alert('Não foi possível identificar a empresa do usuário logado.');return false;}
  const path=`${empresaId}/pedidos/${pedidoId}/${Date.now()}-${safeName(file.name)}`;
  const {error:uploadError}=await db.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:false});
  if(uploadError){alert('Não foi possível carregar o PDF: '+uploadError.message);return false;}
  const {data:{user}}=await db.auth.getUser();
  const {error:docError}=await db.from('documentos').insert({pedido_id:pedidoId,tipo:'pdf',titulo:file.name,status:'ativo',arquivo_url:path});
  if(docError){await db.storage.from(BUCKET).remove([path]);alert('O PDF foi enviado, mas não foi possível registrar o documento: '+docError.message);return false;}
  await db.from('documento_versoes').insert({documento_id:(await db.from('documentos').select('id').eq('pedido_id',pedidoId).eq('arquivo_url',path).maybeSingle()).data?.id,versao:1,arquivo_url:path,criado_por:user?.id||null});
  alert('PDF carregado e registrado no pedido.');
  await renderUploaded(pedidoId);
  return true;
}

async function renderUploaded(pedidoId){
  const host=document.querySelector(`[data-uploaded-docs="${pedidoId}"]`); if(!host)return;
  const {data,error}=await db.from('documentos').select('id,titulo,arquivo_url,criado_em').eq('pedido_id',pedidoId).not('arquivo_url','is',null).order('criado_em',{ascending:false});
  if(error){host.innerHTML='';return;}
  host.innerHTML=(data||[]).map(d=>`<button class="doc-file" data-doc-path="${esc(d.arquivo_url)}">📄 ${esc(d.titulo)}</button>`).join('');
  host.querySelectorAll('[data-doc-path]').forEach(b=>b.onclick=async()=>{const {data:e,error:e2}=await db.storage.from(BUCKET).createSignedUrl(b.dataset.docPath,300);if(e2){alert('Não foi possível abrir o PDF: '+e2.message);return}window.open(e.signedUrl,'_blank','noopener,noreferrer');});
}

function enhance(){
  document.querySelectorAll('#documentos .doc-grid .panel').forEach(panel=>{
    if(panel.dataset.pdfReady)return;
    const strong=panel.querySelector('strong');
    const buttons=panel.querySelectorAll('[data-doc]');
    if(!strong || !buttons.length)return;
    const pedidoId=buttons[0].dataset.id;
    panel.dataset.pdfReady='1';
    const wrap=document.createElement('div');
    wrap.className='pdf-upload-area';
    wrap.innerHTML=`<label class="pdf-upload-label">Carregar PDF<input type="file" accept="application/pdf" data-pdf-upload="${esc(pedidoId)}"></label><div class="uploaded-docs" data-uploaded-docs="${esc(pedidoId)}"></div>`;
    panel.appendChild(wrap);
    wrap.querySelector('input').onchange=async e=>{const file=e.target.files?.[0];if(file)await uploadPdf(pedidoId,file);e.target.value='';};
    renderUploaded(pedidoId);
  });
}

window.addEventListener('load',()=>{enhance();setInterval(enhance,1200);});
