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
- Orçamento com área m², preço/m², desconto, margem, forma de pagamento e tipo de entrega.
- Conversão de orçamento aprovado em pedido com vínculo ao orçamento e herança dos dados comerciais.
- Pedidos com gravação no Supabase.
- Clientes e obras vinculados.
- Medição/conferência com estado persistido de aprovação.
- Auditoria operacional de criação/alteração dos principais registros.
- Fila de produção.
- Instalação vinculada ao pedido.
- Regra de bloqueio de produção sem medição registrada e aprovada.
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
- Migration comercial/medição/auditoria aplicada no Supabase ativo `jwbbhqmyjrmfkdnzfyhl` e registrada no repositório.

## 4. O que ainda precisa ser concluído antes de produção real

1. Supabase Auth para usuários e perfis.
2. RLS/policies adequadas ao acesso por perfil; a configuração atual é single-tenant sem login.
3. PCP/produção real: corte, paginação de chapas, sobras, veios e consumo de estoque.
4. Acabamento, logística, entrega e pós-venda com registros reais.
5. Financeiro real com parcelas, Pix, cartão, recebimentos e comissões.
6. RH e produtividade.
7. Documentos/PDFs e organização por número do pedido.
8. Portais do cliente e funcionário.
9. Integração OneDrive, quando necessária.
10. Testes completos de build e fluxo antes da publicação.

## 5. Regra que não pode ser quebrada

A produção/ordem de corte só pode ser liberada quando existir `data_medicao` **e** `medicao_aprovada = true`. A instalação exige produção anterior e data de instalação. A finalização exige instalação e data.

Nunca usar o GitHub ou o Bolt como substituto da autenticação do aplicativo.

## 6. Regra de custo

Priorizar alterações diretas no código e no GitHub. Evitar reconstruções no Bolt e qualquer operação paga sem autorização prévia.
