// Validação de força de senha e mensagens amigáveis.
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Muito fraca" | "Fraca" | "Média" | "Boa" | "Forte";
  issues: string[];
  ok: boolean;
};

const MIN_LEN = 10;

export function evaluatePassword(pwd: string): PasswordStrength {
  const issues: string[] = [];
  if (pwd.length < MIN_LEN) issues.push(`Mínimo de ${MIN_LEN} caracteres`);
  if (!/[a-z]/.test(pwd)) issues.push("Uma letra minúscula");
  if (!/[A-Z]/.test(pwd)) issues.push("Uma letra maiúscula");
  if (!/[0-9]/.test(pwd)) issues.push("Um número");
  if (!/[^A-Za-z0-9]/.test(pwd)) issues.push("Um símbolo (!@#$…)");

  let score = 0;
  if (pwd.length >= MIN_LEN) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length >= 14) score = Math.min(4, score + 1) as 0 | 1 | 2 | 3 | 4;

  const labels = ["Muito fraca", "Fraca", "Média", "Boa", "Forte"] as const;
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: labels[score as 0 | 1 | 2 | 3 | 4],
    issues,
    ok: issues.length === 0,
  };
}

export function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered")) return "Este e-mail já possui cadastro.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (m.includes("password should be")) return "A senha não atende à política mínima.";
  if (m.includes("weak password")) return "Senha muito fraca — reforce com símbolos, números e maiúsculas.";
  if (m.includes("network")) return "Falha de rede. Verifique sua conexão.";
  if (m.includes("unauthorized") || m.includes("forbidden")) return "Você não tem permissão para esta operação.";
  return msg;
}
