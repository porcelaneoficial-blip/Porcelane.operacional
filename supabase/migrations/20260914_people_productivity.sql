-- Pessoas, permissões, produtividade e comissão do Porcelane.
-- Executar no SQL Editor do projeto Supabase uma única vez.

create extension if not exists pgcrypto;

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  cpf_cnpj text,
  tipo text not null default 'interno' check (tipo in ('interno','externo','arquiteto','comercial','outro')),
  cargo text,
  role text not null default 'cliente' check (role in ('admin','vendas','tecnico','pcp','financeiro','rh','instalacao','cliente')),
  data_entrada date,
  ativo boolean not null default true,
  comissao_percentual numeric(7,3) not null default 0,
  regra_comissao text not null default 'individual',
  regra_produtividade text not null default 'atividade',
  supervisor text,
  acesso jsonb not null default '{}'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.produtividade (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  tipo_atividade text not null,
  descricao text,
  inicio timestamptz,
  fim timestamptz,
  quantidade numeric(12,2),
  unidade text,
  status text not null default 'concluida',
  pontos numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.comissoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  pedido_id uuid references public.pedidos(id) on delete set null,
  tipo text not null default 'venda',
  base_calculo numeric(14,2) not null default 0,
  percentual numeric(7,3) not null default 0,
  valor numeric(14,2) generated always as (round((base_calculo * percentual / 100)::numeric,2)) stored,
  status text not null default 'prevista',
  competencia date,
  pago_em date,
  observacoes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_produtividade_colaborador on public.produtividade(colaborador_id);
create index if not exists idx_produtividade_pedido on public.produtividade(pedido_id);
create index if not exists idx_comissoes_colaborador on public.comissoes(colaborador_id);
create index if not exists idx_comissoes_pedido on public.comissoes(pedido_id);

alter table public.colaboradores enable row level security;
alter table public.produtividade enable row level security;
alter table public.comissoes enable row level security;

-- A autorização fina por perfil permanece no aplicativo e deve ser reforçada
-- com políticas RLS específicas quando os perfis administrativos estiverem em produção.
