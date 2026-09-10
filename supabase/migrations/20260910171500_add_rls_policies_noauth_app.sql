/*
# Add RLS policies for single-tenant no-auth app access

## Context
The Porcelane Operacional app is a single-tenant application with no sign-in screen.
Several tables have RLS enabled but zero policies, making them completely inaccessible
to the anon-key frontend client. Other tables used by the app have RLS disabled entirely.

## Changes
1. Adds anon+authenticated CRUD policies to tables that have RLS enabled but no policies:
   - clientes
   - obras
   - empresas
   - enderecos
   - projetos
   - ambientes
   - itens_projeto
   - leads
   - perfis

2. Enables RLS and adds anon+authenticated CRUD policies on tables the app
   needs to read/write that currently have RLS disabled:
   - pedidos
   - orcamentos
   - instalacoes
   - medicoes
   - ordens_producao
   - conferencias

## Security
- All policies use `TO anon, authenticated` because this is a single-tenant app
  with no login screen — the frontend operates as the `anon` role.
- `USING (true)` / `WITH CHECK (true)` is intentional: the data is shared across
  all users of this single-tenant app.

## Important notes
1. No user_id columns or auth.uid() checks — this is not a multi-user app.
2. No data is modified or deleted — only policies are added.
3. Tables not listed here are left unchanged.
*/

-- ============================================
-- TABLES WITH RLS ENABLED BUT NO POLICIES
-- ============================================

-- clientes
DROP POLICY IF EXISTS "anon_select_clientes" ON clientes;
CREATE POLICY "anon_select_clientes" ON clientes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_clientes" ON clientes;
CREATE POLICY "anon_insert_clientes" ON clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_clientes" ON clientes;
CREATE POLICY "anon_update_clientes" ON clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_clientes" ON clientes;
CREATE POLICY "anon_delete_clientes" ON clientes FOR DELETE TO anon, authenticated USING (true);

-- obras
DROP POLICY IF EXISTS "anon_select_obras" ON obras;
CREATE POLICY "anon_select_obras" ON obras FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_obras" ON obras;
CREATE POLICY "anon_insert_obras" ON obras FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_obras" ON obras;
CREATE POLICY "anon_update_obras" ON obras FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_obras" ON obras;
CREATE POLICY "anon_delete_obras" ON obras FOR DELETE TO anon, authenticated USING (true);

-- empresas
DROP POLICY IF EXISTS "anon_select_empresas" ON empresas;
CREATE POLICY "anon_select_empresas" ON empresas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_empresas" ON empresas;
CREATE POLICY "anon_insert_empresas" ON empresas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_empresas" ON empresas;
CREATE POLICY "anon_update_empresas" ON empresas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_empresas" ON empresas;
CREATE POLICY "anon_delete_empresas" ON empresas FOR DELETE TO anon, authenticated USING (true);

-- enderecos
DROP POLICY IF EXISTS "anon_select_enderecos" ON enderecos;
CREATE POLICY "anon_select_enderecos" ON enderecos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_enderecos" ON enderecos;
CREATE POLICY "anon_insert_enderecos" ON enderecos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_enderecos" ON enderecos;
CREATE POLICY "anon_update_enderecos" ON enderecos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_enderecos" ON enderecos;
CREATE POLICY "anon_delete_enderecos" ON enderecos FOR DELETE TO anon, authenticated USING (true);

-- projetos
DROP POLICY IF EXISTS "anon_select_projetos" ON projetos;
CREATE POLICY "anon_select_projetos" ON projetos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projetos" ON projetos;
CREATE POLICY "anon_insert_projetos" ON projetos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projetos" ON projetos;
CREATE POLICY "anon_update_projetos" ON projetos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projetos" ON projetos;
CREATE POLICY "anon_delete_projetos" ON projetos FOR DELETE TO anon, authenticated USING (true);

-- ambientes
DROP POLICY IF EXISTS "anon_select_ambientes" ON ambientes;
CREATE POLICY "anon_select_ambientes" ON ambientes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ambientes" ON ambientes;
CREATE POLICY "anon_insert_ambientes" ON ambientes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ambientes" ON ambientes;
CREATE POLICY "anon_update_ambientes" ON ambientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ambientes" ON ambientes;
CREATE POLICY "anon_delete_ambientes" ON ambientes FOR DELETE TO anon, authenticated USING (true);

-- itens_projeto
DROP POLICY IF EXISTS "anon_select_itens_projeto" ON itens_projeto;
CREATE POLICY "anon_select_itens_projeto" ON itens_projeto FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_itens_projeto" ON itens_projeto;
CREATE POLICY "anon_insert_itens_projeto" ON itens_projeto FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_itens_projeto" ON itens_projeto;
CREATE POLICY "anon_update_itens_projeto" ON itens_projeto FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_itens_projeto" ON itens_projeto;
CREATE POLICY "anon_delete_itens_projeto" ON itens_projeto FOR DELETE TO anon, authenticated USING (true);

-- leads
DROP POLICY IF EXISTS "anon_select_leads" ON leads;
CREATE POLICY "anon_select_leads" ON leads FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leads" ON leads;
CREATE POLICY "anon_update_leads" ON leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leads" ON leads;
CREATE POLICY "anon_delete_leads" ON leads FOR DELETE TO anon, authenticated USING (true);

-- perfis
DROP POLICY IF EXISTS "anon_select_perfis" ON perfis;
CREATE POLICY "anon_select_perfis" ON perfis FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_perfis" ON perfis;
CREATE POLICY "anon_insert_perfis" ON perfis FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_perfis" ON perfis;
CREATE POLICY "anon_update_perfis" ON perfis FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_perfis" ON perfis;
CREATE POLICY "anon_delete_perfis" ON perfis FOR DELETE TO anon, authenticated USING (true);

-- ============================================
-- TABLES WITH RLS DISABLED — ENABLE + ADD POLICIES
-- ============================================

-- pedidos
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pedidos" ON pedidos;
CREATE POLICY "anon_select_pedidos" ON pedidos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pedidos" ON pedidos;
CREATE POLICY "anon_insert_pedidos" ON pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pedidos" ON pedidos;
CREATE POLICY "anon_update_pedidos" ON pedidos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pedidos" ON pedidos;
CREATE POLICY "anon_delete_pedidos" ON pedidos FOR DELETE TO anon, authenticated USING (true);

-- orcamentos
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_orcamentos" ON orcamentos;
CREATE POLICY "anon_select_orcamentos" ON orcamentos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orcamentos" ON orcamentos;
CREATE POLICY "anon_insert_orcamentos" ON orcamentos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orcamentos" ON orcamentos;
CREATE POLICY "anon_update_orcamentos" ON orcamentos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orcamentos" ON orcamentos;
CREATE POLICY "anon_delete_orcamentos" ON orcamentos FOR DELETE TO anon, authenticated USING (true);

-- instalacoes
ALTER TABLE instalacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_instalacoes" ON instalacoes;
CREATE POLICY "anon_select_instalacoes" ON instalacoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_instalacoes" ON instalacoes;
CREATE POLICY "anon_insert_instalacoes" ON instalacoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_instalacoes" ON instalacoes;
CREATE POLICY "anon_update_instalacoes" ON instalacoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_instalacoes" ON instalacoes;
CREATE POLICY "anon_delete_instalacoes" ON instalacoes FOR DELETE TO anon, authenticated USING (true);

-- medicoes
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_medicoes" ON medicoes;
CREATE POLICY "anon_select_medicoes" ON medicoes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_medicoes" ON medicoes;
CREATE POLICY "anon_insert_medicoes" ON medicoes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_medicoes" ON medicoes;
CREATE POLICY "anon_update_medicoes" ON medicoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_medicoes" ON medicoes;
CREATE POLICY "anon_delete_medicoes" ON medicoes FOR DELETE TO anon, authenticated USING (true);

-- ordens_producao
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_ordens_producao" ON ordens_producao;
CREATE POLICY "anon_select_ordens_producao" ON ordens_producao FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ordens_producao" ON ordens_producao;
CREATE POLICY "anon_insert_ordens_producao" ON ordens_producao FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ordens_producao" ON ordens_producao;
CREATE POLICY "anon_update_ordens_producao" ON ordens_producao FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ordens_producao" ON ordens_producao;
CREATE POLICY "anon_delete_ordens_producao" ON ordens_producao FOR DELETE TO anon, authenticated USING (true);

-- conferencias
ALTER TABLE conferencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_conferencias" ON conferencias;
CREATE POLICY "anon_select_conferencias" ON conferencias FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_conferencias" ON conferencias;
CREATE POLICY "anon_insert_conferencias" ON conferencias FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_conferencias" ON conferencias;
CREATE POLICY "anon_update_conferencias" ON conferencias FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_conferencias" ON conferencias;
CREATE POLICY "anon_delete_conferencias" ON conferencias FOR DELETE TO anon, authenticated USING (true);
