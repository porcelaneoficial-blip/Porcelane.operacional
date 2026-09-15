-- Arquivamento oficial de documentos no Google Drive.
-- O Drive é arquivo/backup; a operação continua no Porcelane/Supabase.

alter table if exists pedidos
  add column if not exists google_drive_folder_id text,
  add column if not exists google_drive_folder_url text,
  add column if not exists arquivado_em timestamptz;

alter table if exists documentos
  add column if not exists google_drive_file_id text,
  add column if not exists google_drive_file_url text,
  add column if not exists arquivado_drive_em timestamptz;

create index if not exists idx_pedidos_google_drive_folder_id
  on pedidos(google_drive_folder_id);

create index if not exists idx_documentos_google_drive_file_id
  on documentos(google_drive_file_id);

comment on column pedidos.google_drive_folder_id is 'ID da pasta do pedido no Google Drive.';
comment on column pedidos.google_drive_folder_url is 'URL da pasta do pedido no Google Drive.';
comment on column pedidos.arquivado_em is 'Momento em que o pedido foi arquivado no Google Drive.';
comment on column documentos.google_drive_file_id is 'ID do arquivo correspondente no Google Drive.';
comment on column documentos.google_drive_file_url is 'URL do arquivo correspondente no Google Drive.';
comment on column documentos.arquivado_drive_em is 'Momento em que o documento foi arquivado no Google Drive.';
