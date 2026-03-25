import sys

def atualizar_status(tarefa):
    with open("DOCS_PROJETO.md", "r", encoding="utf-8") as f:
        linhas = f.readlines()

    with open("DOCS_PROJETO.md", "w", encoding="utf-8") as f:
        for linha in linhas:
            if tarefa in linha and "[ ]" in linha:
                f.write(linha.replace("[ ]", "[x]"))
                print(f"✅ Tarefa '{tarefa}' marcada como concluída!")
            else:
                f.write(linha)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Exemplo de uso: python atualizar_docs.py "Cadastro de Perfil"
        nome_tarefa = " ".join(sys.argv[1:])
        atualizar_status(nome_tarefa)
    else:
        print("Digite o nome da tarefa que deseja concluir.")