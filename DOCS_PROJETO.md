# 🛒 CompraZap - Manifesto do Projeto v20.0 (Atualizado 07/04)

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. Foco em UX mobile-first e checkout sem fricção. Atualmente otimizada para a venda de cucas artesanais no Condomínio Lanai.

---

## 📂 Novas Implementações (07/04)

### 1. Sistema de Edição Total
- **Botão Editar:** Integrado ao card de cada campanha no Portal Principal (`app/page.tsx`).
- **Persistência Explícita:** Correção de políticas RLS no Supabase para permitir `UPDATE` pelo criador da campanha via SQL Editor.
- **Limpeza de Mídia:** Lógica para envio de `null` ao banco ao excluir fotos de capa ou galeria, garantindo a atualização real dos dados e remoção de imagens indesejadas.

### 2. Vitrine Híbrida (Carrossel 3.0)
- **Modo Marquee:** Movimento automático contínuo para atrair o olhar do comprador.
- **Interação Mobile (iOS/Android):** Implementação de Scroll Snap com inércia nativa (`WebkitOverflowScrolling: touch`).
- **Interação Desktop:** Sistema de "Mouse Drag" (clicar e arrastar) para permitir navegação intuitiva com o mouse.
- **Visual:** Ajuste para `object-fit: contain` em fundo branco, garantindo que informações em fotos verticais não sejam cortadas.

### 3. Localização e Formatos
- **Data Brasileira:** Substituição do input nativo por campo de texto com máscara `dd/mm/aaaa`.
- **Conversão Automática:** Tratamento no front-end para salvar como ISO no banco e exibir como PT-BR no app.

---

## 🛠️ Log de Batalhas & Correções
- **Bug de Permissão (RLS):** Resolvido com a criação da política de segurança no Postgres para liberar o comando `UPDATE`.
- **Sincronização de Produtos:** Agora, ao editar a Campanha, o registro correspondente na tabela `products` é atualizado simultaneamente via `upsert`.
- **Cache do Navegador:** Implementado `window.location.href = '/'` após o salvamento para forçar o recarregamento total da lista de campanhas.

---

## 🚀 Próximos Passos (Amanhã)
1.  **Ajuste Fino do Carrossel:** Corrigir os "saltos" visuais ao entrar/sair do modo de pausa no desktop.
2.  **Card do WhatsApp 2.0:**
    - Criar um design de texto mais "copywriter" para conversão.
    - Implementar Meta Tags dinâmicas (OpenGraph) para que a foto da cuca apareça na prévia do link do WhatsApp.
3.  **Localização:** Iniciar seletor de condomínios para expansão além do Lanai.

---

## 🔗 Atalhos Rápidos
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)
- **Principais Tabelas:** `campaigns` / `products` / `orders`
- **Deploy:** `git add .` -> `git commit -m "..."` -> `git push`