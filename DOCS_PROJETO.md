# Projeto CompraZap ⚡ - Portal Condomínio Lanai

## 📝 Status Atual do Projeto
O projeto passou por testes reais com a campanha "Cucas da Vanessa". Foram validados os fluxos de criação, divulgação via WhatsApp, realização de pedidos por vizinhos e gestão de pagamentos via Pix com anexo de comprovante.

## 🚀 Implementações Recentes (Abril 2026)

### 1. Segurança e Regras de Negócio (Landing Page)
- **Bloqueio de Novos Pedidos:** Campanhas com data de validade (`expires_at`) vencida não aceitam mais novos compradores.
- **Continuidade de Fluxo:** Compradores que já possuem um pedido iniciado em uma campanha encerrada podem continuar para as telas de pagamento e envio de comprovante.
- **Texto de Identificação:** Alterado para "Para iniciar seu pedido, primeiro informe seu número de telefone no Whatsapp" para melhorar a clareza.

### 2. Interface e UX (Landing Page)
- **Cores dos Itens:** As opções de produtos ("O que você deseja?") agora possuem fundos em tons pastéis aleatórios, melhorando o apelo visual sem conflitar com a identidade verde (#059669).
- **Feedback de Seleção:** O item selecionado assume a cor verde sólida para destaque imediato.

### 3. Painel do Vendedor (Home)
- **Controle de Divulgação:** O botão "DIVULGAR" agora é desabilitado e renomeado para "ENCERRADA" (com estilo cinza) quando a campanha expira, evitando compartilhamentos indevidos.
- **Gestão de Status:** Reforço visual de campanhas ativas vs. encerradas.

## 🛠 Próximos Passos (Backlog)
- [ ] Ajustar layout do Relatório de Entregas para impressão/PDF.
- [ ] Implementar sistema de notificações via WhatsApp (API) para aprovação de Pix.
- [ ] Adicionar campo de "Estoque Limitado" por variação de produto.
- [ ] Criar dashboard financeiro consolidado para o vendedor.

## 📂 Estrutura de Arquivos Principal
- `app/page.tsx`: Portal principal do vendedor e login.
- `app/c/[id]/page.tsx`: Landing page do comprador (pública).
- `app/campanha/nova/page.tsx`: Formulário de criação/edição de ofertas.
- `app/campanha/gestao/[id]/page.tsx`: Painel de controle de pedidos e aprovação de Pix.
- `lib/supabase.ts`: Configuração e conexão com o banco de dados.