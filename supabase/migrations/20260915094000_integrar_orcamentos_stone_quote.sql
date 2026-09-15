alter table public.orcamentos
  add column if not exists dados jsonb not null default '{}'::jsonb;

alter table public.orcamentos
  add column if not exists grupo_numero text;

alter table public.orcamentos
  add column if not exists tipo_orcamento text not null default 'convencional';

alter table public.orcamentos
  add column if not exists origem_orcamento_id uuid references public.orcamentos(id);

create index if not exists idx_orcamentos_grupo_numero
  on public.orcamentos(grupo_numero);
