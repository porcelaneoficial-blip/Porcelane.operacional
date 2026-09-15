-- PORCELANE OPERACIONAL
-- Ambientes, itens técnicos, ordens de acabamento, produtividade e rateio de desconto.
-- Regra comercial: desconto percentual concedido no pedido é aplicado proporcionalmente
-- ao valor bruto de cada ambiente. O valor líquido do ambiente é a base operacional.

alter table public.pedidos add column if not exists desconto_percentual numeric(5,2) not null default 0;
alter table public.pedidos add column if not exists valor_bruto numeric(12,2);

alter table public.orcamentos add column if not exists desconto_percentual numeric(5,2) not null default 0;
alter table public.orcamentos add column if not exists valor_bruto numeric(12,2);

create table if not exists public.pedido_ambientes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  nome text not null,
  apelido text,
  valor_bruto numeric(12,2) not null default 0,
  desconto_percentual numeric(5,2) not null default 0,
  desconto_valor numeric(12,2) not null default 0,
  valor_liquido numeric(12,2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.catalogo_servicos_produtivos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nome text not null unique,
  categoria text not null default 'acabamento',
  unidade text not null default 'un',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.regras_produtividade (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid,
  servico_id uuid not null references public.catalogo_servicos_produtivos(id) on delete cascade,
  tipo_calculo text not null check (tipo_calculo in ('valor_fixo','percentual')),
  valor numeric(12,4) not null default 0,
  base_percentual text,
  ativo boolean not null default true,
  vigencia_inicio date,
  vigencia_fim date,
  criado_em timestamptz not null default now()
);

create table if not exists public.itens_tecnicos_ambiente (
  id uuid primary key default gen_random_uuid(),
  ambiente_id uuid not null references public.pedido_ambientes(id) on delete cascade,
  servico_id uuid not null references public.catalogo_servicos_produtivos(id),
  descricao text,
  quantidade numeric(12,3) not null default 1,
  aprovado_tecnico boolean not null default false,
  origem text not null default 'desenho_tecnico',
  criado_em timestamptz not null default now()
);

create table if not exists public.ordens_acabamento (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  ambiente_id uuid not null references public.pedido_ambientes(id) on delete cascade,
  numero text,
  status text not null default 'pendente' check (status in ('pendente','em_execucao','concluida','reprovada','cancelada')),
  liberada_em timestamptz,
  concluida_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists public.ordens_acabamento_itens (
  id uuid primary key default gen_random_uuid(),
  ordem_acabamento_id uuid not null references public.ordens_acabamento(id) on delete cascade,
  item_tecnico_id uuid references public.itens_tecnicos_ambiente(id),
  servico_id uuid not null references public.catalogo_servicos_produtivos(id),
  quantidade numeric(12,3) not null default 1,
  profissional_id uuid,
  tipo_calculo text,
  valor_unitario numeric(12,4),
  percentual numeric(7,4),
  base_percentual numeric(12,2),
  valor_previsto numeric(12,2) not null default 0,
  quantidade_executada numeric(12,3) not null default 0,
  valor_executado numeric(12,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente','executado','aprovado','pago','cancelado')),
  reexecucao boolean not null default false,
  responsabilidade_retrabalho text,
  criado_em timestamptz not null default now()
);

create table if not exists public.produtividade_lancamentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.ordens_acabamento_itens(id) on delete cascade,
  pessoa_id uuid,
  quantidade_executada numeric(12,3) not null default 0,
  valor_calculado numeric(12,2) not null default 0,
  data_execucao date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente','aprovado','pago','cancelado')),
  reexecucao boolean not null default false,
  responsabilidade_retrabalho text,
  criado_em timestamptz not null default now()
);

-- Rateio proporcional: 5% no pedido => 5% em cada ambiente.
create or replace function public.calcular_desconto_ambiente(
  p_valor_bruto numeric,
  p_desconto_percentual numeric
) returns numeric language sql immutable as $$
  select round(coalesce(p_valor_bruto,0) * greatest(coalesce(p_desconto_percentual,0),0) / 100, 2);
$$;

create or replace function public.aplicar_desconto_ambiente() returns trigger language plpgsql as $$
begin
  new.desconto_valor := public.calcular_desconto_ambiente(new.valor_bruto, new.desconto_percentual);
  new.valor_liquido := round(coalesce(new.valor_bruto,0) - new.desconto_valor, 2);
  new.atualizado_em := now();
  return new;
end; $$;

drop trigger if exists trg_aplicar_desconto_ambiente on public.pedido_ambientes;
create trigger trg_aplicar_desconto_ambiente before insert or update of valor_bruto,desconto_percentual on public.pedido_ambientes for each row execute function public.aplicar_desconto_ambiente();

create or replace function public.sincronizar_desconto_dos_ambientes(p_pedido_id uuid) returns void language plpgsql as $$
declare pct numeric;
begin
  select coalesce(desconto_percentual,0) into pct from public.pedidos where id=p_pedido_id;
  update public.pedido_ambientes
     set desconto_percentual=pct,
         desconto_valor=public.calcular_desconto_ambiente(valor_bruto,pct),
         valor_liquido=round(coalesce(valor_bruto,0)-public.calcular_desconto_ambiente(valor_bruto,pct),2),
         atualizado_em=now()
   where pedido_id=p_pedido_id;
end; $$;

-- A soma dos ambientes deve fechar com o valor bruto do pedido quando os ambientes
-- representam 100% do escopo comercial. A função não altera preços automaticamente.
create or replace function public.resumo_desconto_pedido(p_pedido_id uuid)
returns table(valor_bruto_ambientes numeric, desconto_total numeric, valor_liquido_ambientes numeric)
language sql stable as $$
  select coalesce(sum(valor_bruto),0), coalesce(sum(desconto_valor),0), coalesce(sum(valor_liquido),0)
  from public.pedido_ambientes where pedido_id=p_pedido_id;
$$;

-- Catálogo inicial sem valores de pagamento: os valores devem ser configurados por pessoa/regra.
insert into public.catalogo_servicos_produtivos (codigo,nome,categoria,unidade) values
 ('CUBA','Cuba','acabamento','un'),
 ('NICHO','Nicho','acabamento','un'),
 ('BANHEIRO','Banheiro','acabamento','ambiente'),
 ('LAVABO','Lavabo','acabamento','ambiente'),
 ('BOX','Box','acabamento','un'),
 ('FRONTAO','Frontão','acabamento','un'),
 ('RODABANCA','Rodabanca','acabamento','un'),
 ('SAIA','Saia','acabamento','un'),
 ('MEIA_ESQUADRIA','Meia-esquadria','acabamento','un'),
 ('BANCADA','Bancada','acabamento','un')
on conflict (nome) do nothing;

create index if not exists idx_pedido_ambientes_pedido on public.pedido_ambientes(pedido_id);
create index if not exists idx_itens_tecnicos_ambiente on public.itens_tecnicos_ambiente(ambiente_id,aprovado_tecnico);
create index if not exists idx_ordens_acabamento_pedido on public.ordens_acabamento(pedido_id,status);
create index if not exists idx_ordens_acabamento_itens_ordem on public.ordens_acabamento_itens(ordem_acabamento_id,status);
create index if not exists idx_produtividade_pessoa_data on public.produtividade_lancamentos(pessoa_id,data_execucao,status);
