-- PORCELANE OPERACIONAL
-- WhatsApp integrado: filas, chatbot e atendimento humano.

create table if not exists public.whatsapp_filas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.whatsapp_fila_usuarios (
  fila_id uuid not null references public.whatsapp_filas(id) on delete cascade,
  usuario_id uuid not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (fila_id, usuario_id)
);

create table if not exists public.whatsapp_conversas (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  nome_cliente text,
  cliente_id uuid references public.clientes(id) on delete set null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  fila_id uuid references public.whatsapp_filas(id) on delete set null,
  assunto text,
  status text not null default 'bot',
  responsavel_id uuid,
  ultima_mensagem_em timestamptz not null default now(),
  nao_lidas integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (status in ('bot','aguardando','humano','resolvido','arquivado'))
);

create table if not exists public.whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.whatsapp_conversas(id) on delete cascade,
  direcao text not null,
  remetente text,
  conteudo text,
  media_url text,
  media_tipo text,
  external_id text,
  origem text not null default 'whatsapp',
  criado_em timestamptz not null default now(),
  check (direcao in ('entrada','saida'))
);

insert into public.whatsapp_filas (codigo, nome, descricao) values
('vendas','Vendas','Orçamentos, pedidos e oportunidades comerciais.'),
('financeiro','Financeiro','Pagamentos, parcelas, cobranças e comprovantes.'),
('medicao','Medição / Conferência','Medições e conferências.'),
('producao','Produção','Produção, corte e andamento de fábrica.'),
('acabamento','Acabamento','Acabamento e execução.'),
('instalacao','Instalação','Agendamento e acompanhamento de instalação.'),
('pos_venda','Pós-venda','Ocorrências, dúvidas e atendimento após entrega.'),
('geral','Atendimento geral','Assuntos ainda não classificados.')
on conflict (codigo) do nothing;

create index if not exists idx_whatsapp_conversas_fila_status
on public.whatsapp_conversas(fila_id, status, ultima_mensagem_em desc);

create index if not exists idx_whatsapp_conversas_telefone
on public.whatsapp_conversas(telefone);

create index if not exists idx_whatsapp_mensagens_conversa
on public.whatsapp_mensagens(conversa_id, criado_em);

alter table public.whatsapp_filas enable row level security;
alter table public.whatsapp_fila_usuarios enable row level security;
alter table public.whatsapp_conversas enable row level security;
alter table public.whatsapp_mensagens enable row level security;

create policy "anon_select_whatsapp_filas" on public.whatsapp_filas for select to anon, authenticated using (true);
create policy "anon_insert_whatsapp_filas" on public.whatsapp_filas for insert to anon, authenticated with check (true);
create policy "anon_update_whatsapp_filas" on public.whatsapp_filas for update to anon, authenticated using (true) with check (true);

create policy "anon_select_whatsapp_fila_usuarios" on public.whatsapp_fila_usuarios for select to anon, authenticated using (true);
create policy "anon_insert_whatsapp_fila_usuarios" on public.whatsapp_fila_usuarios for insert to anon, authenticated with check (true);
create policy "anon_update_whatsapp_fila_usuarios" on public.whatsapp_fila_usuarios for update to anon, authenticated using (true) with check (true);

create policy "anon_select_whatsapp_conversas" on public.whatsapp_conversas for select to anon, authenticated using (true);
create policy "anon_insert_whatsapp_conversas" on public.whatsapp_conversas for insert to anon, authenticated with check (true);
create policy "anon_update_whatsapp_conversas" on public.whatsapp_conversas for update to anon, authenticated using (true) with check (true);

create policy "anon_select_whatsapp_mensagens" on public.whatsapp_mensagens for select to anon, authenticated using (true);
create policy "anon_insert_whatsapp_mensagens" on public.whatsapp_mensagens for insert to anon, authenticated with check (true);

-- Observação: o recebimento real de mensagens do WhatsApp deve ocorrer por webhook/server-side.
-- A interface do Porcelane não armazena tokens secretos nem credenciais da Meta.
