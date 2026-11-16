// ============================================================
// VALIDADORES — GOSchool (ESM)
// Funções de validação reutilizáveis
// ============================================================

/**
 * Valida email institucional (educacao.mg.gov.br ou aluno.mg.gov.br)
 */
export function isInstitutionalEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailLower = email.toLowerCase().trim();
  return emailLower.endsWith('@educacao.mg.gov.br') || emailLower.endsWith('@aluno.mg.gov.br');
}

/**
 * Extrai o tipo de usuário do email institucional
 */
export function getUserTypeFromEmail(email) {
  if (!isInstitutionalEmail(email)) return null;
  const emailLower = email.toLowerCase().trim();
  if (emailLower.endsWith('@aluno.mg.gov.br')) return 'aluno';
  if (emailLower.endsWith('@educacao.mg.gov.br')) return 'professor'; // adm verificado separadamente
  return null;
}

/**
 * Verifica se email é de administrador (lista fixa ou domínio específico)
 */
export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * Valida senha (mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial)
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return { valid: false, message: 'Senha é obrigatória' };
  if (password.length < 8) return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Senha deve conter pelo menos uma letra maiúscula' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Senha deve conter pelo menos uma letra minúscula' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Senha deve conter pelo menos um número' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, message: 'Senha deve conter pelo menos um caractere especial' };
  return { valid: true };
}

/**
 * Sanitiza string para uso seguro em HTML/SQL
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Valida data no formato YYYY-MM-DD
 */
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) && date.toISOString().split('T')[0] === dateStr;
}

/**
 * Valida horário no formato HH:MM
 */
export function isValidTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
}

/**
 * Valida categoria de refeição
 */
export function isValidMealCategory(category) {
  const validCategories = ['cafe_manha', 'almoco', 'lanche', 'jantar'];
  return validCategories.includes(category);
}

/**
 * Valida role de usuário
 */
export function isValidRole(role) {
  const validRoles = ['aluno', 'professor', 'adm'];
  return validRoles.includes(role);
}

/**
 * Valida objeto de reserva
 */
export function validateReserva(reserva) {
  const errors = [];
  if (!reserva.categoria || !isValidMealCategory(reserva.categoria)) {
    errors.push('Categoria inválida');
  }
  if (!reserva.data || !isValidDate(reserva.data)) {
    errors.push('Data inválida (formato YYYY-MM-DD)');
  }
  if (!reserva.horario || !isValidTime(reserva.horario)) {
    errors.push('Horário inválido (formato HH:MM)');
  }
  if (!reserva.professor || typeof reserva.professor !== 'string' || reserva.professor.trim().length < 2) {
    errors.push('Nome do professor é obrigatório');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida item de cardápio
 */
export function validateCardapioItem(item) {
  const errors = [];
  if (!item.nome || typeof item.nome !== 'string' || item.nome.trim().length < 2) {
    errors.push('Nome é obrigatório');
  }
  if (!item.categoria || !isValidMealCategory(item.categoria)) {
    errors.push('Categoria inválida');
  }
  if (item.calorias !== undefined && (typeof item.calorias !== 'number' || item.calorias < 0)) {
    errors.push('Calorias deve ser um número positivo');
  }
  if (item.proteina !== undefined && (typeof item.proteina !== 'number' || item.proteina < 0)) {
    errors.push('Proteína deve ser um número positivo');
  }
  if (item.carboidrato !== undefined && (typeof item.carboidrato !== 'number' || item.carboidrato < 0)) {
    errors.push('Carboidrato deve ser um número positivo');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}