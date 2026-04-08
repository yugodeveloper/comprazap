# 🛒 CompraZap - Manifesto do Projeto v19.0

## 📌 Visão Geral
Plataforma de micro-vendas para condomínios. Foco em UX mobile-first, automação via Telegram e **vitrine dinâmica de alta conversão** para produtos artesanais (Cucas).

---

## 🏗️ Arquitetura Técnica
- **Frontend:** Next.js 16.2.1 (App Router).
- **Backend:** Supabase (Auth + Storage + DB).
- **UX Dinâmica:** Marquee CSS para carrossel infinito e fallback inteligente de imagens de capa.
- **Auto-Login:** Bypass via `?w=phone` com wrapper `<Suspense>`.

---

## 📂 Estrutura de Dados (Atualizada)
| Tabela | Campo / Status | Descrição |
| :--- | :--- | :--- |
| **campaigns** | `image_url` | Imagem de capa (Header). |
| **campaigns** | `image_gallery` | Array JSONB com até 5 fotos para o carrossel. |
| **orders** | `status` | `pending`, `paid`, `rejected`, `cancelled`. |

---

## ✅ Fluxo de UX Implementado (v19.0)

### 1. Experiência do Comprador (`/c/[id]`)
- **Vitrine Automática:** Carrossel de fotos do produto desliza sozinho (Marquee) para chamar atenção.
- **Fallback Inteligente:** Se o vendedor não subir uma capa, o app usa a primeira foto da galeria como header.
- **Texto Formatado:** Descrições preservam quebras de linha (`pre-wrap`) para listas de preços.
- **Check-out de Segurança:** Persistência de carrinho via `localStorage` e resumo visual antes do PIX.

### 2. Painel do Morador (`/`)
- **Gestão de Campanhas:** Lista completa com métricas reais e selos de alerta de PIX.
- **Edição em Tempo Real:** Botão **"EDITAR ✏️"** que carrega dados existentes para ajustes rápidos sem mudar o link.
- **Social Condomínio:** Seção "Minhas Compras" para acompanhar pedidos feitos a outros vizinhos.

---

## 🛠️ Log de Batalhas & Soluções (Últimas Evoluções)
- **Bug de Looping:** Implementado efeito Marquee CSS puro para evitar dependências de bibliotecas de terceiros no mobile.
- **Recuperação de Edição:** Ajustada a lógica de `upsert` na criação de ofertas para diferenciar `insert` de `update` baseado no ID da URL.

---

## 🚀 Próximos Passos
- [ ] **Filtro por Condomínio:** Preparar o cadastro para multi-condomínios.
- [ ] **Persistência Local Total:** Garantir que dados de identificação (nome/apto) não sumam no refresh.

---

## 🔗 Links e Credenciais
- **Bot Telegram:** `@8625189600` (CompraZap Alertas)
- **Bucket Storage:** `comprovantes` (usado para recibos e fotos de produtos).