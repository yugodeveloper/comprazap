# Projeto CompraZap ⚡ - Portal Condomínio Lanai

## 📝 Status Atual do Projeto
O sistema evoluiu de uma ferramenta de uso único para uma plataforma multicondomínio. Já suporta múltiplos vendedores, diferentes locais (condomínios) e possui travas de segurança para campanhas encerradas.

## 🚀 Implementações Recentes (Abril 2026)

### 1. Sistema Multicondomínio (Locais)
- **Base de Dados:** Criação da tabela `locations` e vínculo dinâmico com a tabela `campaigns`.
- **Inteligência de Cadastro:** Implementação de Autocomplete na criação de campanhas. O vendedor pode selecionar um condomínio já existente (cadastrado por ele ou outros) ou criar um novo instantaneamente.
- **Landing Page Dinâmica:** O local exibido para o comprador agora é extraído do banco de dados, removendo textos fixos e permitindo que o vendedor atue em diferentes prédios.

### 2. Fluxo de Login e Segurança
- **Recuperação de Senha:** Adicionado link "Esqueci minha senha" que direciona o usuário para o WhatsApp do suporte (Gustavo), com mensagem pré-preenchida contendo o telefone do solicitante.
- **Políticas de Acesso (RLS):** Ajuste nas permissões do Supabase para permitir que usuários não autenticados (visitantes/compradores) consultem a lista de locais para o autocomplete.
- **Persistência de Estado:** Correção do bug que mantinha dados de uma campanha anterior ao tentar criar uma nova logo após uma edição.

### 3. Ajustes de UX e Interface
- **Padronização:** Botão principal alterado para "+ NOVA CAMPANHA".
- **Feedback visual:** Link de recuperação de senha posicionado estrategicamente para ser visível em dispositivos móveis.

## 🛠 Próximos Passos (Backlog)
- [ ] Ajustar layout do Relatório de Entregas para impressão/PDF.
- [ ] Implementar sistema de notificações via WhatsApp (API) para aprovação de Pix.
- [ ] Adicionar campo de "Estoque Limitado" por variação de produto.
- [ ] Criar dashboard financeiro consolidado para o vendedor.

## 🔒 Futuras Alterações Importantes (Segurança e Escala)
- **Criptografia de Senhas:** Migrar o armazenamento de senhas de "texto simples" para "hash" (criptografadas), garantindo que nem o administrador do banco tenha acesso às senhas reais.
- **Troca de Senha Interna:** Criar uma área no perfil do vendedor para alteração de senha autônoma, reduzindo a carga de suporte manual.
- **Portal do Morador:** Página centralizada onde o morador digita o nome do seu condomínio e vê todas as campanhas ativas naquele local.

## 📂 Estrutura de Arquivos Principal
- `app/page.tsx`: Portal do vendedor, login e gestão de perfil.
- `app/c/[id]/page.tsx`: Landing page dinâmica do comprador.
- `app/campanha/nova/page.tsx`: Formulário inteligente de criação/edição.
- `app/campanha/gestao/[id]/page.tsx`: Painel de pedidos e aprovação de Pix.
- `lib/supabase.ts`: Configuração da conexão com o banco.