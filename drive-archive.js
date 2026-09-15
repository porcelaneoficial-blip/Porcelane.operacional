import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
let running = false;

async function processArchiveQueue() {
  if (running) return;
  running = true;
  try {
    const { data: rows, error } = await supabase
      .from('arquivamento_pedidos')
      .select('pedido_id,numero_pedido,cliente_nome,status')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true })
      .limit(3);

    if (error || !rows?.length) return;

    for (const row of rows) {
      const { data, error: invokeError } = await supabase.functions.invoke('drive-archive', {
        body: { pedido_id: row.pedido_id },
      });

      if (invokeError) {
        console.warn('Google Drive:', invokeError.message);
        continue;
      }

      if (data?.ok && data.folder_url) {
        console.info(`Pedido ${row.numero_pedido} arquivado no Google Drive.`, data.folder_url);
      }
    }
  } finally {
    running = false;
  }
}

window.PorcelaneDriveArchive = {
  process: processArchiveQueue,
};

supabase.auth.getSession().then(({ data }) => {
  if (!data?.session) return;
  processArchiveQueue();
  setInterval(processArchiveQueue, 20000);
});
