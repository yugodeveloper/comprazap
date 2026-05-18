# Projeto CompraZap ⚡ - Portal Condomínio Lanai

## 🎯 Visão Geral
O CompraZap é uma plataforma de "Social Commerce" hiper-local, focada em facilitar vendas diretas entre vizinhos. O fluxo é otimizado para compartilhamento via WhatsApp, pagamentos via Pix e gestão simplificada para o vendedor, eliminando a necessidade de aplicativos complexos ou carrinhos de compra tradicionais.

### 🏗 Arquitetura Técnica
- **Frontend:** Next.js 14+ (App Router) com TypeScript.
- **Estilização:** Inline CSS (estilo modular) para performance e portabilidade.
- **Backend/Database:** Supabase (PostgreSQL) com Real-time (para status de pedidos) e Storage (para comprovantes).
- **Notificações:** Integração resiliente com a API de Bots do Telegram.
- **Hospedagem:** Vercel (Build automático via Git).

---

## 📂 Estrutura de Funcionalidades e Fluxos

### 🏪 Portal do Vendedor (`app/page.tsx`)
- **Identificação:** Baseada no número de telefone formatado `(00) 00000-0000`.
- **Resiliência Supabase:** Lógica que identifica se o banco está em "stand-by" (unhealthy) e avisa ao vendedor para aguardar 1 minuto em vez de exibir erro de código.
- **Gestão de Campanha:**
    - **Ativas:** Exibição de Views, Pedidos e Conversão em tempo real. Suporte a até 10 mídias.
    - **Encerradas:** Filtro de cinza para diferenciação visual.
    - **Duplicação:** Função de "Clonagem" que permite criar uma nova campanha idêntica a uma antiga com um clique, facilitando vendas recorrentes.
    - **Notificações:** Cadastro do `telegram_id` no perfil para que cada vendedor receba seus próprios alertas de venda.

### 🔗 Landing Page do Comprador (`app/c/[id]/page.tsx`)
- **Experiência sem Fricção:** O comprador se identifica apenas pelo telefone (salvo em `localStorage`).
- **Galeria Multimídia:** Carrossel inteligente que detecta e renderiza Imagens, Vídeos (.mp4), YouTube (Embed) e Instagram Reels (Embed) mantendo a navegação lateral.
- **Redimensionamento Responsivo:** Conteúdo multimídia (vídeos, embeds) na galeria agora redimensiona automaticamente para se ajustar ao espaço disponível, mantendo o aspecto original e evitando cortes.
- **Trava de Expiração:** Se a campanha expirou, o sistema impede novos pedidos, mas permite que quem já comprou veja o status e envie o comprovante.
- **Fluxo de Checkout:**
    1. Seleção de variações (botões em cores pastéis).
    2. Dados de entrega (Nome e Unidade).
    3. Geração de Pix (Copia e Cola + QR Code).
    4. Upload de Comprovante (armazenado no bucket `comprovantes`).
- **Notificação Silenciosa:** O envio para o Telegram não trava a interface do usuário. Se falhar, o cliente segue para o pagamento normalmente.

---

## 🗄️ Estrutura do Banco de Dados (Inferred Schema)

### Tabela: `profiles`
- `id` (uuid, PK)
- `phone` (text, Unique) - Chave primária de acesso.
- `full_name`, `email`, `unit` (text)
- `password` (text) - **Atenção:** Atualmente em texto simples.
- `telegram_id` (text) - Para notificações dinâmicas.

### Tabela: `campaigns`
- `id` (uuid, PK)
- `title`, `description` (text)
- `image_url` (text), `image_gallery` (text[])
- `pix_key` (text)
- `expires_at` (timestamp)
- `location_id` (uuid, FK) -> `locations.id`
- `creator_id` (uuid, FK) -> `profiles.id`

### Tabela: `orders`
- `id` (uuid, PK)
- `campaign_id` (uuid, FK)
- `buyer_contact`, `buyer_name`, `buyer_apto` (text)
- `selected_variations` (jsonb) - Lista de itens comprados.
- `status` (text) - 'pending', 'paid', 'rejected', 'cancelled'.
- `receipt_url` (text) - Link para o Supabase Storage.

### Tabela: `locations`
- `id` (uuid, PK)
- `name` (text) - Nome do condomínio/local.

---

## 🔐 Segurança e RLS (Row-Level Security)

Para o funcionamento correto da Landing Page pública, as seguintes políticas devem estar ativas no Supabase para a tabela `orders`:

1. **INSERT:** Permitido para o perfil `anon` (público).
2. **SELECT:** Permitido para o perfil `anon` (essencial para carregar o pedido após a criação).
3. **UPDATE:** Permitido para o perfil `anon` (essencial para o `upsert` e upload de comprovante).

---

## 🛠 Próximos Passos (Prioridades)

1. **Backlog de Impressão:**
    - [ ] Adicionar `@media print` no arquivo `app/campanha/gestao/[id]/page.tsx`.
    - [ ] Criar um botão "Imprimir Roteiro de Entrega" que gere um PDF limpo com Nome, Unidade e Itens.

2. **Backlog de Estoque:**
    - [ ] Adicionar coluna `stock_limit` na tabela de produtos/variações.
    - [ ] Implementar validação na Landing Page: esconder botões ou mostrar "Esgotado" se o estoque chegar a zero.

3. **Backlog de Segurança:**
    - [ ] **Hash de Senhas:** Implementar BCrypt/Argon2 para as senhas dos vendedores.
    - [ ] **Restrição de RLS:** Ajustar o `SELECT` na tabela `orders` para que um telefone X só consiga ler pedidos onde `buyer_contact == X`.

---

##  Como Retomar o Desenvolvimento
1. Certifique-se de que o Supabase está **Healthy** (se estiver parado, tente fazer um login no painel do vendedor e aguarde a mensagem de "servidor acordando").
2. Verifique se o arquivo `.env.local` contém `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` e `NEXT_PUBLIC_SUPABASE_URL/KEY`.
3. Ao abrir o VS Code, mantenha `app/page.tsx` e `app/c/[id]/page.tsx` abertos para contexto imediato.

---

## ✅ Histórico de Conquistas (Resumo)
- [x] **Checkout Resiliente (17/05):** Resolvido bug que travava a página em "Carregando oferta" via execução assíncrona do Telegram.
- [x] **Segurança de Banco (17/05):** Políticas de RLS aplicadas para permitir vendas e uploads por usuários anônimos.
- [x] **Galeria Multimídia Pro (17/05):** Limite estendido para 10 itens com suporte a Vídeos (.mp4), Instagram Reels e YouTube, com redimensionamento responsivo.
- [x] **Multi-condomínio:** Agora o sistema suporta vários locais via tabela `locations`.
- [x] **Clonagem de Campanha:** Botão de duplicar funcional.
- [x] **Inteligência de Mídia:** Sistema detecta automaticamente o formato para renderizar o player correto.
- [x] **Notificação Dinâmica:** O sistema avisa o vendedor certo no Telegram certo.
- [ ] **Layout de Impressão:** Adicionar `@media print` no Roteiro de Entregas para gerar PDFs limpos para os entregadores.
- [ ] **Estoque Limitado:** Adicionar campo `stock_quantity` na tabela de produtos/variações e validar no checkout.
- [ ] **Criptografia de Senhas:** Migrar senhas de `text` para `hash` no Supabase.
- [ ] **Notificação de Comprovante:** Melhorar o alerta no Telegram quando o cliente faz o upload do comprovante após o pedido já ter sido criado.

*Última atualização: 17 de Maio de 2026 - Encerramento do dia com Checkout e Galeria Multimídia estáveis.*
