export const maskPhone = (value: string) => {
    let r = value.replace(/\D/g, ""); // Remove tudo o que não é dígito
    r = r.replace(/^(\d{2})(\d)/g, "($1) $2"); // Coloca parênteses em volta dos dois primeiros dígitos
    r = r.replace(/(\d{5})(\d)/, "$1-$2"); // Coloca hífen entre o quinto e o sexto dígitos
    // Limita a 15 caracteres (ex: (99) 99999-9999)
    return r.substring(0, 15);
};