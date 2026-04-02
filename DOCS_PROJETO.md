# 🛒 CompraZap - Manifesto do Projeto v17.0

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. Foco em UX mobile-first sem scroll excessivo, automação via Telegram e transparência total no fluxo de checkout para vizinhos.

---

## 🏗️ Arquitetura Técnica
- **Frontend:** Next.js 16.2.1 (App Router) - Tailwind / Inline CSS.
- **Backend:** Supabase (PostgreSQL + Auth).
- **Interatividade:** Telegram Bot API (@8625189600).
- **Segurança:** Máscaras de entrada (Regex) e tratamento de tipos JSONB para Arrays de variações.

---

## 📂 Estrutura de Dados (Consolidada)
| Tabela | Campo / Status | Descrição |
| :--- | :--- | :--- |
| **orders** | `observations` (TEXT) | Notas especiais inseridas pelo comprador na vitrine. |
| **orders** | `status` (Enum) | Estados: `pending`, `paid`, `rejected`, `cancelled`. |
| **campaigns**| `expires_at` | Data limite para novas compras (bloqueio automático). |

---

## ✅ Fluxo de UX Implementado (v17.0)
1. **Identificação Inteligente:**
   - Input de WhatsApp com máscara automática `(XX) XXXXX-XXXX`.
   - Badge de identificação persistente (Nome, Apto, Tel) com opção **"Alterar"** para reset de sessão.
2. **Vitrine & Seleção:**
   - Exibição de Local, Validade e Prova Social (Contagem real de compradores).
   - Preços em destaque visual (Cor Emerald, Negrito).
   - Histórico retrátil de **"Pedidos Anteriores desta Campanha"** integrado ao topo da vitrine.
3. **Checkout Transparente:**
   - Resumo do pedido persistente durante o preenchimento de dados de entrega e na tela de pagamento.
   - Opção de **Alterar Pedido** disponível até o último momento antes da confirmação.
4. **Pagamento & Notificação:**
   - QR Code dinâmico + Botão **"Copiar Chave Pix"**.
   - Pós-pagamento: Ocultação do QR Code e mensagem de confirmação de valor pago.
   - Gatilhos Telegram: Notificação instantânea na **Reserva** e no **Envio do Comprovante**.

---

## 🛠️ Log de Batalhas & Soluções (Últimas Atualizações)
- **Restauração Telegram:** Reativadas as chamadas `enviarNotificacaoTelegram` e `enviarComprovanteTelegram` que haviam sido perdidas em refatorações de layout.
- **UX de Conferência:** Implementada a exibição da lista de produtos selecionados logo abaixo do botão "Confirmar Pedido", garantindo que o usuário saiba o que está comprando antes de pagar.
- **Segurança de Fluxo:** Bloqueio da edição de itens e cancelamento após o envio do comprovante (pedido entra em estado de análise).

---

## 🚀 Próximos Passos (Backlog)
- [ ] **Dashboard do Vendedor:** Página `/dashboard` para gerenciar lista de entregas.
- [ ] **Filtro por Condomínio:** Preparar o sistema para múltiplos condomínios.
- [ ] **Relatório Consolidado:** Agrupamento de itens para produção (ex: "Total: 15 Cucas").
- [ ] **Persistência Local:** Garantir que o `LocalStorage` não limpe os itens acidentalmente em caso de refresh na tela de dados.

---

## 🔗 Links e Credenciais
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)
- **SQL de Update:** `ALTER TABLE orders ADD COLUMN observations TEXT;`