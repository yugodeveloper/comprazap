# 🛒 CompraZap - Manifesto do Projeto v9.0 (Live na Vercel)

## 📌 Visão Geral
Sistema agnóstico de intermediação de vendas direta em condomínios. 
Permite que vendedores (ex: Café Gourmet, Cuca de Banana) criem ofertas personalizadas e que vizinhos comprem via Pix com upload de comprovante, sem necessidade de login complexo.

---

## 🏗️ Arquitetura Técnica Final
- **Framework:** Next.js 16.2.1 (App Router) com Turbopack.
- **Backend:** Supabase (PostgreSQL + RLS Policies).
- **Storage:** Supabase Storage (Buckets: `comprovantes` e `fotos-campanhas`).
- **Deploy:** Vercel (CI/CD via GitHub).
- **QR Code:** `qrcode.react` para geração dinâmica de Pix copia-e-cola.

---

## 📂 Esquema de Dados (Finalizado)
| Tabela | Função |
| :--- | :--- |
| **profiles** | Dados do vendedor (Nome, Apto, Condomínio). |
| **campaigns**| Cabeçalho da oferta (Título, Descrição, Foto, Pix, Expiração). |
| **products** | Regras do produto (Preço e Variações JSONB dinâmicas). |
| **orders** | Registros de compra (Dados do vizinho, variações escolhidas, comprovante). |

---

## ✅ Funcionalidades de Elite Implementadas
- [x] **Identificação Inteligente:** Vizinho é reconhecido pelo E-mail/Tel e recupera pedidos em aberto.
- [x] **Sistema de Variações Genérico:** Vendedor define via texto (ex: `Sabor: Banana, Mel; Tamanho: P, G`) e a LP gera os botões automaticamente.
- [x] **Upload de Imagens:** Suporte a fotos reais do produto no cabeçalho da oferta.
- [x] **Fluxo de Pagamento:** QR Code Pix e Chave Copia-e-Cola integrados.
- [x] **Design Premium:** Header com degradê, cards brancos nítidos e contraste forçado para Light Mode (ignorando preferências de sistema).

---

## 🛠️ Log de Batalhas (Histórico de Correções)
- **RLS (Row Level Security):** Ajustadas políticas de `INSERT` e `SELECT` para permitir que o público veja fotos e campanhas, mas apenas vendedores criem ofertas.
- **Build Error (Vercel):** Corrigida a diretiva `'use client'` que possuía erro de sintaxe (`use/client`).
- **Storage Permissions:** Corrigido erro `42501` (Must be owner) através da criação de políticas específicas para o bucket `fotos-campanhas`.
- **Visibilidade de Inputs:** Implementado reset de CSS em `globals.css` para evitar campos "invisíveis" causados pelo Dark Mode automático.

---

## 🚀 Próximas Evoluções (Backlog)
- [ ] Notificação automática via WhatsApp para o vendedor no momento da reserva.
- [ ] Dashboard Financeiro (Soma de vendas confirmadas).
- [ ] Exportação de lista de entregas do dia em PDF/Texto.

---

## 🔗 Links do Projeto
- **Repositório:** `https://github.com/yugodeveloper/comprazap`
- **Produção:** `https://comprazap.vercel.app` (Substituir pela URL real da Vercel)