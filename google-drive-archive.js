import { createClient } from '@supabase/supabase-js';

const db = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const ARCHIVE_URL = (import.meta.env.VITE_GOOGLE_DRIVE_ARCHIVE_URL || '').trim();

const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

export function driveConfigured() {
  return Boolean(ARCHIVE_URL);
}

export function driveArchiveStatus() {
  return driveConfigured() ? 'configurado' : 'não configurado';
}

async function authUser() {
  const { data: { user } } = await db.auth.getUser();
  return user || null;
}

async function pedidoInfo(pedidoId) {
  const { data, error } = await db
    .from('pedidos')
    .select('id,numero,status,criado_em,cliente:clientes(nome)')
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return data;
}

function monthName(date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date).toUpperCase();
}

function archivePayload(pedido, documents) {
  const date = new Date(pedido.criado_em || Date.now());
  const year = String(date.getFullYear());
  const month = `${String(date.getMonth() + 1).padStart(2, '0')} - ${monthName(date)}`;
  const client = String(pedido.cliente?.nome || 'CLIENTE').replace(/[\\/:*?\"<>|]+/g, ' ').trim();
  return {
    action: 'archive_order',
    pedido_id: pedido.id,
    numero: pedido.numero,
    year,
    month,
    folder_name: `${pedido.numero} - ${client}`,
    documents: documents.map((d) => ({
      documento_id: d.id,
      titulo: d.titulo,
      storage_path: d.arquivo_url,
    })),
  };
}

export async function archivePedidoToDrive(pedidoId) {
  if (!ARCHIVE_URL) throw new Error('Google Drive ainda não está configurado no Porcelane.');
  const user = await authUser();
  if (!user) throw new Error('Faça login para arquivar o pedido.');
  const pedido = await pedidoInfo(pedidoId);
  const { data: documents, error: docsError } = await db
    .from('documentos')
    .select('id,titulo,arquivo_url')
    .eq('pedido_id', pedidoId)
    .not('arquivo_url', 'is', null)
    .order('criado_em', { ascending: true });
  if (docsError) throw docsError;

  const response = await fetch(ARCHIVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(archivePayload(pedido, documents || [])),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `Falha no arquivamento (${response.status}).`);
  }

  const now = new Date().toISOString();
  const { error: orderError } = await db.from('pedidos').update({
    google_drive_folder_id: result.folder_id || null,
    google_drive_folder_url: result.folder_url || null,
    arquivado_em: now,
  }).eq('id', pedidoId);
  if (orderError) throw orderError;

  if (result.files?.length) {
    for (const file of result.files) {
      if (!file.documento_id) continue;
      await db.from('documentos').update({
        google_drive_file_id: file.file_id || null,
        google_drive_file_url: file.file_url || null,
        arquivado_drive_em: now,
      }).eq('id', file.documento_id);
    }
  }

  return result;
}

export function renderDriveArchiveButton(pedidoId, target) {
  if (!target) return;
  target.innerHTML = `<div class="drive-archive-box"><strong>Arquivo Google Drive</strong><span>${driveConfigured() ? 'Arquivamento automático disponível.' : 'Integração ainda não configurada.'}</span>${driveConfigured() ? `<button type="button" data-drive-archive="${esc(pedidoId)}">Arquivar pedido no Drive</button>` : ''}<small>Estrutura: PEDIDOS → ANO → MÊS → PEDIDO + CLIENTE.</small></div>`;
  const button = target.querySelector('[data-drive-archive]');
  if (button) button.onclick = async () => {
    button.disabled = true;
    button.textContent = 'Arquivando…';
    try {
      await archivePedidoToDrive(pedidoId);
      button.textContent = 'Arquivado no Drive';
      alert('Pedido arquivado no Google Drive.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Arquivar pedido no Drive';
      alert(error.message);
    }
  };
}

window.PorcelaneGoogleDrive = { archivePedidoToDrive, driveConfigured, driveArchiveStatus, renderDriveArchiveButton };
