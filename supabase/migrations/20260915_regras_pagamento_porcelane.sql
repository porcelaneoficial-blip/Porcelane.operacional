-- Regra comercial vigente: 40% Pix + 60% cartão em até 2x.
update public.pedidos
set forma_pagamento = '40% Pix + 60% cartão até 2x'
where forma_pagamento ilike '%40% Pix%60% cartão%3x%';

update public.orcamentos
set forma_pagamento = '40% Pix + 60% cartão até 2x'
where forma_pagamento ilike '%40% Pix%60% cartão%3x%';

create or replace function public.normalizar_pagamento_porcelane() returns trigger
language plpgsql as $$
begin
  if new.forma_pagamento ilike '%40% Pix%60% cartão%3x%' then
    new.forma_pagamento := '40% Pix + 60% cartão até 2x';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalizar_pagamento_pedido on public.pedidos;
create trigger trg_normalizar_pagamento_pedido
before insert or update of forma_pagamento on public.pedidos
for each row execute function public.normalizar_pagamento_porcelane();

drop trigger if exists trg_normalizar_pagamento_orcamento on public.orcamentos;
create trigger trg_normalizar_pagamento_orcamento
before insert or update of forma_pagamento on public.orcamentos
for each row execute function public.normalizar_pagamento_porcelane();
