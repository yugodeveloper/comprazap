# 🛒 CompraZap - Manifesto do Projeto v7.0

## 📌 Visão Geral
Sistema de vendas direta para condomínios (MVP iniciado para Café e expandido para Cucas/Geral).
Foco em identificação simples do vizinho, reserva com variações e upload de comprovante Pix.

---

## 🏗️ Arquitetura Técnica Atualizada
- **Framework:** Next.js 16.2.1 (App Router).
- **Banco de Dados:** Supabase (PostgreSQL).
- **Storage:** Supabase Storage (Buckets: `comprovantes` e `fotos-campanhas`).
- **QR Code:** Biblioteca `qrcode.react` para pagamentos instantâneos.

---

## 📂 Estrutura de Tabelas (Esquema Final)
| Tabela | Campos Principais |
| :--- | :--- |
| **profiles** | id, full_name, apartment, condo_name |
| **campaigns**| id, title, description, pix_key, image_url, expires_at, creator_id |
| **products** | id, campaign_id, name, price, variations (JSONB) |
| **orders** | id, campaign_id, buyer_name, buyer_contact, selected_variations (JSONB), quantity, receipt_url, status |

---

## ✅ Funcionalidades Implementadas
- [x] **Identificação Inteligente:** Vizinho entra com e-mail/tel e o sistema recupera pedidos anteriores.
- [x] **Cadastro Genérico:** Vendedor define variações (ex: "Sabor: Banana, Mel") via input de texto.
- [x] **Upload de Imagem:** Fotos das ofertas agora sobem para o bucket `fotos-campanhas`.
- [x] **Checkout Dinâmico:** QR Code gerado automaticamente com base na chave Pix do vendedor.
- [x] **Design Premium:** Header com foto em destaque, cronômetro de oferta e cards de seleção.

---

## 🛠️ Log de Batalhas (Erros Resolvidos)
- **RLS (Row Level Security):** Políticas criadas para permitir que o público veja campanhas e que vendedores autenticados façam upload de fotos.
- **Build Error:** Corrigida a diretiva `'use client'` que estava com erro de sintaxe.
- **Botão de Confirmação:** Corrigida a lógica de inserção na tabela `orders` para suportar campos JSONB.
- **Visibilidade de Imagem:** Resolvido o problema de permissão "SELECT" no Storage do Supabase.

---

## 🚀 Próximos Passos
1. **Refinamento de UI:** Ajustar cores de contraste dos inputs (Fundo vs Texto).
2. **Dashboard do Vendedor:** Melhorar o visual da lista de pedidos recebidos.
3. **Deploy:** Preparar variáveis de ambiente para publicação na Vercel.