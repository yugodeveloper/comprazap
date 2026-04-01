# 🛒 CompraZap - Manifesto do Projeto v16.0

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. Foco em UX mobile-first, automação via Telegram e confiança entre vizinhos através da identificação clara do vendedor e prova social.

---

## 🏗️ Arquitetura Técnica
- **Frontend:** Next.js 16.2.1 (App Router) - Tailwind / Inline CSS.
- **Backend:** Supabase (PostgreSQL + Auth).
- **Interatividade:** Telegram Bot API (@8625189600).
- **Segurança:** Bloqueio de duplicidade via `maybeSingle()` e tratamento de erros de rede com `try/catch`.

---

## 📂 Estrutura de Dados (Atualizada)
| Tabela | Campo Novo | Descrição |
| :--- | :--- | :--- |
| **orders** | `observations` (TEXT) | Notas especiais (ex: "sem cebola", "portaria"). |
| **orders** | `status` (Enum) | Adicionado status `cancelled`. |
| **campaigns**| `expires_at` | Lógica de encerramento retroativo (ontem) implementada. |

---

## ✅ Fluxo de UX Implementado (v16.0)
1. **Identificação:** WhatsApp + Recuperação automática de Nome/Apto de pedidos globais anteriores.
2. **Vitrine Gourmet:** - Exibição de Local (Condomínio), Data de Expiração e Prova Social ("X vizinhos já pediram").
   - Card do Vendedor com link direto para o WhatsApp de suporte.
3. **Seleção & Obs:** O comprador monta a lista e pode adicionar observações por escrito.
4. **Gestão de Pedido:** - Opção de **Cancelar Pedido** antes do envio do comprovante (limpa o estado e libera para nova compra).
   - Edição de itens bloqueada após o upload do comprovante para segurança do vendedor.

---

## 🛠️ Log de Batalhas & Soluções
- **Bug n?.variations?.map:** Resolvido com a limpeza de dados no `fetchData` (conversão de String para Array) e proteção `Array.isArray()` no render.
- **Persistência de Encerramento:** Forçado `expires_at` para 24h atrás no momento do clique para evitar conflitos de fuso horário.
- **Tela Preta (Vercel):** Corrigido substituindo `.single()` por `.maybeSingle()` e adicionando verificação de variáveis de ambiente no `useEffect` (Dedo-duro de config).

---

## 🚀 Próximos Passos (Backlog)
- [ ] **Dashboard do Vendedor:** Página `/dashboard` para gerenciar lista de entregas.
- [ ] **Filtro por Condomínio:** Preparar o sistema para múltiplos condomínios (Atualmente fixo: Lanai).
- [ ] **Relatório Consolidado:** Agrupamento de itens para produção (ex: "Total: 15 Cucas").

---

## 🔗 Links e Credenciais
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)
- **SQL de Update:** `ALTER TABLE orders ADD COLUMN observations TEXT;`