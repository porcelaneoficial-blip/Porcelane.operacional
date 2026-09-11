-- Porcelane Operacional: comercial, medição aprovada e auditoria.
-- Aplicada no projeto Supabase jwbbhqmyjrmfkdnzfyhl.

alter table public.pedidos add column if not exists medicao_aprovada boolean not null default false;
alter table public.pedidos add column if not exists data_aprovacao_medicao date;
alter table public.pedidos add column if not exists forma_pagamento text;
alter table public.pedidos add column if not exists tipo_entrega text;
alter table public.pedidos add column if not exists comissao_percentual numeric(5,2);
alter table public.pedidos add column if not exists centro_custo text;

alter table public.orcamentos add column if not exists area_m2 numeric(12,2);
alter table public.orcamentos add column if not exists preco_m2 numeric(12,2);
alter table public.orcamentos add column if not exists margem_percentual numeric(5,2);
alter table public.orcamentos add column if not exists forma_pagamento text;
alter table public.orcamentos add column if not exists tipo_entrega text;
alter table public.orcamentos add column if not exists comissao_percentual numeric(5,2);
alter table public.orcamentos add column if not exists aprovado_em timestamptz;
alter table public.orcamentos add column if not exists aprovado_por uuid;
alter table public.orcamentos add column if not exists medicao_taxa numeric(12,2) not null default 0;

alter table public.medicoes add column if not exists aprovada boolean not null default false;
alter table public.medicoes add column if not exists aprovada_em timestamptz;

create table if not exists public.auditoria_operacional (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid,
  acao text not null,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.auditoria_operacional enable row level security;
drop policy if exists "anon_select_auditoria_operacional" on public.auditoria_operacional;
create policy "anon_select_auditoria_operacional" on public.auditoria_operacional for select to anon, authenticated using (true);
drop policy if exists "anon_insert_auditoria_operacional" on public.auditoria_operacional;
create policy "anon_insert_auditoria_operacional" on public.auditoria_operacional for insert to anon, authenticated with check (true);

create index if not exists idx_auditoria_operacional_registro on public.auditoria_operacional(registro_id, criado_em desc);
create index if not exists idx_pedidos_medicao on public.pedidos(data_medicao, medicao_aprovada);
create index if not exists idx_orcamentos_status on public.orcamentos(status);