/**
 * Ponte Google Apps Script para o arquivamento oficial do Porcelane.
 *
 * Deploy: Web app / executar como proprietário / acesso conforme a política da empresa.
 * O script cria: PORCELANE/PEDIDOS/ANO/MÊS/PEDIDO - CLIENTE.
 * O arquivo é copiado a partir de uma URL assinada pelo Porcelane; não passa pelo PC.
 */

const ROOT_NAME = 'PORCELANE';
const ORDERS_NAME = 'PEDIDOS';

function json(data, status) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeName(value) {
  return String(value || 'SEM NOME').replace(/[\\/:*?\"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function folderByName(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function rootFolder() {
  const it = DriveApp.getFoldersByName(ROOT_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
}

function archiveDocument(folder, document) {
  if (!document.storage_path) return { documento_id: document.documento_id, error: 'storage_path ausente' };

  // O Porcelane deve enviar uma URL assinada temporária se esta ponte for usada
  // diretamente. Para manter a ponte simples e segura, storage_path pode ser uma
  // URL HTTPS assinada quando o backend do Porcelane preparar o payload.
  const url = String(document.storage_path);
  if (!/^https:\/\//i.test(url)) {
    return { documento_id: document.documento_id, error: 'É necessário enviar uma URL assinada HTTPS do arquivo.' };
  }

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    return { documento_id: document.documento_id, error: 'Falha ao baixar o PDF do Storage.' };
  }

  const blob = response.getBlob().setName(safeName(document.titulo || 'documento.pdf'));
  const file = folder.createFile(blob);
  return {
    documento_id: document.documento_id,
    file_id: file.getId(),
    file_url: file.getUrl(),
  };
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    if (payload.action !== 'archive_order') return json({ ok: false, error: 'Ação inválida.' });
    if (!payload.numero || !payload.year || !payload.month || !payload.folder_name) {
      return json({ ok: false, error: 'Dados do pedido incompletos.' });
    }

    const root = rootFolder();
    const orders = folderByName(root, ORDERS_NAME);
    const year = folderByName(orders, safeName(payload.year));
    const month = folderByName(year, safeName(payload.month));
    const order = folderByName(month, safeName(payload.folder_name));

    const results = (payload.documents || []).map((document) => archiveDocument(order, document));
    const errors = results.filter((item) => item.error);

    return json({
      ok: errors.length === 0,
      folder_id: order.getId(),
      folder_url: order.getUrl(),
      files: results,
      errors,
    });
  } catch (error) {
    return json({ ok: false, error: String(error && error.message || error) });
  }
}
