# 🛒 CompraZap - Manifesto do Projeto v18.0

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. Foco em UX mobile-first, automação via Telegram e agora com foco total em **redução de fricção no checkout** através de links inteligentes e auto-login.

---

## 🏗️ Arquitetura Técnica
- **Frontend:** Next.js 16.2.1 (App Router) - Tailwind / Inline CSS.
- **Backend:** Supabase (PostgreSQL + Auth).
- **Interatividade:** Telegram Bot API (@8625189600).
- **Auto-Login:** Uso de SearchParams (`?w=phone`) com wrapper `<Suspense>` para identificação automática de clientes via link do WhatsApp.

---

## 📂 Estrutura de Dados (Atualizada)
| Tabela | Campo / Status | Descrição |
| :--- | :--- | :--- |
| **orders** | `observations` (TEXT) | Notas especiais (ex: "ponto da carne", "portaria"). |
| **orders** | `status` (Enum) | Estados: `pending`, `paid`, `rejected`, `cancelled`. |
| **campaigns**| `expires_at` | Lógica de encerramento automático implementada. |

---

## ✅ Fluxo de UX Implementado (v18.0)

### 1. Experiência do Comprador (`/c/[id]`)
- **Link Inteligente:** O link enviado pelo vendedor já carrega o telefone do cliente. O app identifica o parâmetro `?w=`, mascara o número e faz o login automático.
- **Identificação Persistente:** Badge verde no topo com Nome, Apto e Tel. Opção **"Alterar"** para trocar de usuário.
- **Histórico Rápido:** Link direto no topo para ver "Pedidos anteriores desta campanha" (abre uma lista retrátil).
- **Vitrine Dinâmica:** Preços em destaque (Verde Emerald, Negrito) e campo de observações integrado à lista.
- **Conferência:** Resumo detalhado dos itens aparece na tela de dados e na tela final do Pix.

### 2. Gestão do Vendedor (`/campanha/gestao/[id]`)
- **Dashboard de Atividade:** Métricas de Views, Pedidos Reais (exclui cancelados) e Pagamentos Confirmados.
- **Status Visual:** Pedidos cancelados aparecem com opacidade reduzida e etiqueta cinza.
- **Ações Rápidas:** Botões para Aprovar Pix ou Rejeitar Comprovante.
- **WhatsApp Dinâmico:** Botão que gera mensagens personalizadas baseadas no status (Cobrança de Pix, Erro no Comprovante, Sucesso ou Recuperação de Cancelados) incluindo o Link Inteligente.

---

## 🛠️ Log de Batalhas & Soluções (Últimas 24h)
- **Bug de Build (white):** Corrigido erro de sintaxe onde a cor "white" estava sem aspas no objeto de estilo.
- **Auto-login Fixo:** Implementado `useEffect` monitorando o estado da `campaign` para garantir que o login automático só dispare após o carregamento dos dados do banco.
- **Sincronia Telegram:** Restabelecidas as notificações de "Novo Pedido" e "Comprovante Enviado" após refatoração de layout.

---

## 🚀 Próximos Passos (Backlog)
- [ ] **Persistência Local:** Garantir que o `LocalStorage` não limpe itens se o usuário der refresh na tela de dados.
- [ ] **Edição de Campanhas:** Permitir que o vendedor altere título/descrição de uma oferta ativa.
- [ ] **Múltiplos Condomínios:** Criar o seletor de localização no cadastro do perfil.

---

## 🔗 Links e Credenciais
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)
- **SQL de Update:** `ALTER TABLE orders ADD COLUMN observations TEXT;`
- **Exemplo Link Inteligente:** `.../c/ID_DA_CAMPANHA?w=5511999998888`