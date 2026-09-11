# PORCELANE OPERACIONAL — STATUS ATUAL

Atualizado em 11/09/2026.

## 1. Projeto correto

Este é o repositório ativo do novo Porcelane Operacional:

`porcelaneoficial-blip/Porcelane.operacional`

O Porcelane antigo em produção permanece separado e protegido.

## 2. O que já está implementado

- Interface principal Porcelane.
- Navegação por módulos.
- Dashboard operacional.
- Orçamentos com gravação no Supabase.
- Pedidos com gravação no Supabase.
- Clientes e obras vinculados.
- Medição/conferência.
- Fila de produção.
- Instalação vinculada ao pedido.
- Regra de bloqueio de produção sem data de medição.
- Proteção de pedido finalizado contra alteração direta.
- Configuração por `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## 3. Correções aplicadas em 11/09/2026

- README alinhado ao código real: Vite + JavaScript + Supabase.
- Fluxo oficial atualizado: projeto, leitura, ambientes, medição, desenho, produção, acabamento, logística, instalação, entrega e pós-venda.
- Regras comerciais atuais registradas: tipos de atendimento, taxa de medição, pagamento, comissões, margem e instalação diurna.
- Separação entre autenticação do GitHub e autenticação dos usuários do Porcelane documentada.
- OneDrive definido como integração externa preferencial para documentos quando configurado; Supabase Storage permanece como armazenamento do aplicativo.
- Márcia e IATA registrados como funções internas.
- Service worker corrigido para não deixar `app.js` desatualizado no cache.
- Guardas adicionais do fluxo operacional aplicadas: medição antes da conferência/produção, conferência antes da produção, produção antes da instalação e instalação + data antes da finalização.
- Bloqueio de retorno de etapa no fluxo operacional.
- Exemplos financeiros e de estoque fixos removidos da operação exibida para evitar mistura de dados fictícios com dados reais.

## 4. O que ainda precisa ser concluído antes de produção real

1. Supabase Auth para usuários e perfis.
2. RLS/policies adequadas ao acesso por perfil.
3. Campo persistido de aprovação formal da medição.
4. Orçamento completo com cálculo de m², preço/m², desconto, margem, pagamento e conversão para pedido.
5. Pedido herdando integralmente os dados do orçamento aprovado.
6. PCP/produção real: corte, paginação de chapas, sobras, veios e consumo de estoque.
7. Acabamento, logística, entrega e pós-venda com registros reais.
8. Financeiro real com parcelas, Pix, cartão, recebimentos e comissões.
9. RH e produtividade.
10. Documentos/PDFs e organização por número do pedido.
11. Portais do cliente e funcionário.
12. Integração OneDrive, quando necessária.
13. Testes completos de build e fluxo antes da publicação.

## 5. Regra que não pode ser quebrada

A existência de `data_medicao` é obrigatória para liberar produção/ordem de corte. A evolução definitiva deverá manter também um estado persistido de medição aprovada/conferida.

Nunca usar o GitHub ou o Bolt como substituto da autenticação do aplicativo.

## 6. Regra de custo

Priorizar alterações diretas no código e no GitHub. Evitar reconstruções no Bolt e qualquer operação paga sem autorização prévia.
