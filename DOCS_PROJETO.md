# 🛒 CompraZap - Manifesto do Projeto v15.0

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. O sistema permite que vendedores independentes (Cucas, Cafés, Artesanatos) gerenciem pedidos de forma automatizada via Telegram, oferecendo uma experiência fluida de checkout para os vizinhos.

---

## 🏗️ Arquitetura Técnica (Full-Stack)
- **Frontend:** Next.js 16.2.1 (App Router) - Tailwind CSS.
- **Backend:** Supabase (PostgreSQL + Auth).
- **Interatividade:** Telegram Bot API com Webhooks dedicados.
- **Realtime:** Supabase Broadcast (Escuta de mudanças de status sem Refresh).
- **Persistência:** LocalStorage (Sessão de compra persistente por produto).
- **Deploy:** Vercel (CI/CD).

---

## 📂 Estrutura de Dados & Tabelas
| Tabela | Campos Chave | Relação |
| :--- | :--- | :--- |
| **profiles** | id, full_name, apartment, phone | 1:1 com Auth.User |
| **campaigns**| id, title, image_url, pix_key, creator_id | Pertence a um Profile |
| **products** | id, price, variations (JSONB), campaign_id | Pertence a uma Campaign |
| **orders** | id, buyer_name, status, selected_variations (JSONB), receipt_url | Vinculado a Campaign/Product |

---

## ✅ Fluxo de Automação Implementado
1. **Reserva:** Vizinho escolhe variações e quantidade -> Alerta de Texto no Telegram do Vendedor.
2. **Pagamento:** Vizinho anexa comprovante -> Foto enviada ao Telegram com Botões Inline (Aceitar/Recusar).
3. **Validação:** Vendedor clica no botão -> API Route (`/api/telegram-webhook`) processa via `SERVICE_ROLE_KEY`.
4. **Feedback:** O status no banco muda -> LP do vizinho atualiza na hora via Realtime confirmando a entrega.

---

## 🛠️ Log de Batalhas & Soluções (v15.0)
- **RLS vs Service Role:** Resolvido o erro de permissão ao atualizar status usando a Service Role Key em ambiente de servidor (Edge Function).
- **Conectividade Webhook:** Identificado e corrigido erro de `404` causado por barra dupla (`//`) na URL de registro do Webhook do Telegram.
- **Persistência de Sessão:** Implementada lógica de `localStorage` para evitar que o comprador perca o progresso do pedido ao recarregar a página.
- **Visibilidade Global:** Forçado `color-scheme: light` via CSS para garantir legibilidade de inputs em dispositivos com Dark Mode ativo.

---

## 🚀 Próximos Passos (Backlog)
- [ ] **Dashboard do Vendedor:** Página `/dashboard` para gerenciar lista de entregas e histórico financeiro.
- [ ] **Multi-vendedores:** Ajustar filtros para que o vendedor veja apenas seus próprios pedidos no Telegram/Painel.
- [ ] **Relatório de Produção:** Gerar lista consolidada (ex: "Total: 10 Cucas de Banana, 5 de Mel").

---

## 🔗 Links e Credenciais
- **Produção:** `https://comprazap.vercel.app`
- **Repositório:** `https://github.com/yugodeveloper/comprazap`
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)