-- PORCELANE OPERACIONAL
-- Migration 2026-09-11: regras comerciais, medição, produção, financeiro e auditoria.
-- Aplicada no projeto Supabase principal. Mantida no repositório para rastreabilidade.

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

alter table public.instalacoes drop constraint if exists ck_instalacao_horario_diurno;
alter table public.instalacoes add constraint ck_instalacao_horario_diurno check (hora_inicio is null or (hora_inicio >= time '07:00' and hora_inicio < time '19:00'));

create or replace function public.validar_fluxo_pedido() returns trigger language plpgsql as $$
begin
  if old.status='finalizado' and new.status<>old.status then raise exception 'Pedido finalizado e protegido contra alteração'; end if;
  if new.status in ('producao','instalacao','finalizado') and (new.data_medicao is null or coalesce(new.medicao_aprovada,false)=false) then raise exception 'Produção, instalação e finalização exigem medição registrada e aprovada'; end if;
  if new.status='instalacao' and old.status not in ('producao','instalacao') then raise exception 'Instalação exige pedido em produção'; end if;
  if new.status='finalizado' and old.status not in ('instalacao','finalizado') then raise exception 'Finalização exige instalação'; end if;
  if new.status='finalizado' and not exists(select 1 from public.instalacoes i where i.pedido_id=new.id and i.data_agendada is not null) then raise exception 'Finalização exige data de instalação'; end if;
  return new;
end; $$;

drop trigger if exists trg_validar_fluxo_pedido on public.pedidos;
create trigger trg_validar_fluxo_pedido before update on public.pedidos for each row execute function public.validar_fluxo_pedido();

create or replace function public.registrar_historico_pedido() returns trigger language plpgsql as $$
begin
  if old.status is distinct from new.status then
    insert into public.pedido_status_historico(pedido_id,status_anterior,status_novo,observacao,criado_em) values(new.id,old.status,new.status,'Alteração operacional automática',now());
  end if;
  return new;
end; $$;

drop trigger if exists trg_historico_pedido on public.pedidos;
create trigger trg_historico_pedido after update on public.pedidos for each row execute function public.registrar_historico_pedido();

create or replace function public.inicializar_producao_pedido() returns trigger language plpgsql as $$
begin
  if new.status='producao' and old.status is distinct from new.status then
    if not exists(select 1 from public.ordens_producao where pedido_id=new.id) then
      insert into public.ordens_producao(pedido_id,numero,status,data_liberacao) values(new.id,'OP-'||right(replace(new.numero,'-',''),6),'liberada',current_date);
    end if;
    if not exists(select 1 from public.ordens_corte where pedido_id=new.id) then
      insert into public.ordens_corte(pedido_id,status,data_liberacao) values(new.id,'liberada',current_date);
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_criar_ordens_producao on public.pedidos;
create trigger trg_criar_ordens_producao after update on public.pedidos for each row execute function public.inicializar_producao_pedido();

create or replace function public.criar_financeiro_pedido() returns trigger language plpgsql as $$
begin
  if new.status='aberto' and old.status is distinct from new.status and new.valor_total is not null and new.valor_total>0 then
    if not exists(select 1 from public.contas_receber where pedido_id=new.id) then
      insert into public.contas_receber(pedido_id,cliente_id,descricao,valor,vencimento,status,observacoes) values(new.id,new.cliente_id,'Pedido '||new.numero,new.valor_total,current_date,'aberto','Gerado automaticamente pelo Porcelane');
    end if;
  end if;
  if new.status='finalizado' and old.status is distinct from new.status then update public.contas_receber set status='finalizado',atualizado_em=now() where pedido_id=new.id and status <> 'pago'; end if;
  return new;
end; $$;

drop trigger if exists trg_financeiro_pedido on public.pedidos;
create trigger trg_financeiro_pedido after update on public.pedidos for each row execute function public.criar_financeiro_pedido();

create or replace function public.criar_comissao_pedido() returns trigger language plpgsql as $$
declare pct numeric;
begin
  if new.status='finalizado' and old.status is distinct from new.status and new.valor_total is not null then
    pct:=coalesce(new.comissao_percentual,case when new.valor_total>100000 then 3 else 2 end);
    if not exists(select 1 from public.comissoes where pedido_id=new.id) then
      insert into public.comissoes(pedido_id,vendedor_nome,percentual,valor_base,valor_comissao,status) values(new.id,'Amanda Ferraz',pct,new.valor_total,new.valor_total*pct/100,'aberta');
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_comissao_pedido on public.pedidos;
create trigger trg_comissao_pedido after update on public.pedidos for each row execute function public.criar_comissao_pedido();

create index if not exists idx_auditoria_operacional_registro on public.auditoria_operacional(registro_id,criado_em desc);
create index if not exists idx_pedidos_medicao on public.pedidos(data_medicao,medicao_aprovada);
create index if not exists idx_pedidos_status on public.pedidos(status);
create index if not exists idx_ordens_producao_pedido on public.ordens_producao(pedido_id);
create index if not exists idx_ordens_corte_pedido on public.ordens_corte(pedido_id);
