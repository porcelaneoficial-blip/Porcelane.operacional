alter function public.validar_liberacao_producao() set search_path = public, pg_temp;
alter function public.validar_ordem_corte() set search_path = public, pg_temp;
alter function public.registrar_historico_pedido() set search_path = public, pg_temp;
alter function public.criar_ordens_producao() set search_path = public, pg_temp;
alter function public.atualizar_atualizado_em() set search_path = public, pg_temp;
alter function public.inicializar_producao_pedido() set search_path = public, pg_temp;
alter function public.criar_financeiro_pedido() set search_path = public, pg_temp;
alter function public.criar_comissao_pedido() set search_path = public, pg_temp;
alter function public.validar_fluxo_pedido() set search_path = public, pg_temp;
alter function public.gerar_parcelas_pedido() set search_path = public, pg_temp;
alter function public.fn_vincular_aditivo_orcamento() set search_path = public, pg_temp;

revoke execute on function public.current_user_role() from public, anon, authenticated;
revoke execute on function public.fn_copiar_itens_orcamento_pedido() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table if not exists public.arquivamento_pedidos (
  id uuid primary key default gen_random_uuid(), pedido_id uuid not null unique references public.pedidos(id) on delete cascade,
  numero_pedido text, cliente_nome text, ano integer not null, mes integer not null, pasta_relativa text not null,
  status text not null default 'pendente' check (status in ('pendente','arquivado','erro')),
  drive_folder_id text, drive_folder_url text, erro text,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index if not exists idx_arquivamento_pedidos_status on public.arquivamento_pedidos(status);
create index if not exists idx_arquivamento_pedidos_ano_mes on public.arquivamento_pedidos(ano, mes);

create or replace function public.fn_preparar_arquivamento_pedido()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare cliente_nome text; data_base date := current_date;
begin
  if new.status <> 'finalizado' then return new; end if;
  select c.nome into cliente_nome from public.clientes c where c.id = new.cliente_id;
  insert into public.arquivamento_pedidos(pedido_id,numero_pedido,cliente_nome,ano,mes,pasta_relativa)
  values(new.id,new.numero,cliente_nome,extract(year from data_base)::integer,extract(month from data_base)::integer,
         to_char(data_base,'YYYY/MM') || '/' || coalesce(new.numero,new.id::text) || ' - ' || coalesce(cliente_nome,'Cliente'))
  on conflict (pedido_id) do update set numero_pedido=excluded.numero_pedido,cliente_nome=excluded.cliente_nome,pasta_relativa=excluded.pasta_relativa,atualizado_em=now();
  return new;
end; $$;

drop trigger if exists trg_preparar_arquivamento_pedido on public.pedidos;
create trigger trg_preparar_arquivamento_pedido after insert or update of status on public.pedidos for each row execute function public.fn_preparar_arquivamento_pedido();

alter table public.arquivamento_pedidos enable row level security;
create policy authenticated_full_access on public.arquivamento_pedidos for all to authenticated using (true) with check (true);

do $$ declare r record; begin
  for r in select schemaname,tablename from pg_tables where schemaname='public' and not rowsecurity loop
    execute format('alter table %I.%I enable row level security',r.schemaname,r.tablename);
    execute format('drop policy if exists authenticated_full_access on %I.%I',r.schemaname,r.tablename);
    execute format('create policy authenticated_full_access on %I.%I for all to authenticated using (true) with check (true)',r.schemaname,r.tablename);
  end loop;
end $$;
