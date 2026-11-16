// shared/tests/unit/validators.test.mjs
import {
  isInstitutionalEmail,
  getUserTypeFromEmail,
  isAdminEmail,
  validatePassword,
  sanitizeString,
  isValidDate,
  isValidTime,
  isValidMealCategory,
  isValidRole,
  validateReserva,
  validateCardapioItem,
} from '../../src/utils/validators.js';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('Validators', () => {
  describe('isInstitutionalEmail', () => {
    it('should return true for aluno.mg.gov.br emails', () => {
      assert.equal(isInstitutionalEmail('joao@aluno.mg.gov.br'), true);
      assert.equal(isInstitutionalEmail('JOÃO@ALUNO.MG.GOV.BR'), true);
    });

    it('should return true for educacao.mg.gov.br emails', () => {
      assert.equal(isInstitutionalEmail('professor@educacao.mg.gov.br'), true);
      assert.equal(isInstitutionalEmail('PROFESSOR@EDUCACAO.MG.GOV.BR'), true);
    });

    it('should return false for other domains', () => {
      assert.equal(isInstitutionalEmail('user@gmail.com'), false);
      assert.equal(isInstitutionalEmail('user@escola.edu.br'), false);
      assert.equal(isInstitutionalEmail(''), false);
      assert.equal(isInstitutionalEmail(null), false);
      assert.equal(isInstitutionalEmail(undefined), false);
    });
  });

  describe('getUserTypeFromEmail', () => {
    it('should return aluno for aluno.mg.gov.br', () => {
      assert.equal(getUserTypeFromEmail('aluno@aluno.mg.gov.br'), 'aluno');
    });

    it('should return professor for educacao.mg.gov.br', () => {
      assert.equal(getUserTypeFromEmail('prof@educacao.mg.gov.br'), 'professor');
    });

    it('should return null for non-institutional emails', () => {
      assert.equal(getUserTypeFromEmail('user@gmail.com'), null);
      assert.equal(getUserTypeFromEmail(''), null);
    });
  });

  describe('isAdminEmail', () => {
    it('should return true for configured admin emails', () => {
      process.env.ADMIN_EMAILS = 'admin@escola.edu.br,admin2@escola.edu.br';
      assert.equal(isAdminEmail('admin@escola.edu.br'), true);
      assert.equal(isAdminEmail('ADMIN@ESCOLA.EDU.BR'), true);
      assert.equal(isAdminEmail(' admin2@escola.edu.br '), true);
    });

    it('should return false for non-admin emails', () => {
      process.env.ADMIN_EMAILS = 'admin@escola.edu.br,admin2@escola.edu.br';
      assert.equal(isAdminEmail('professor@educacao.mg.gov.br'), false);
      assert.equal(isAdminEmail('user@gmail.com'), false);
      assert.equal(isAdminEmail(''), false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password', () => {
      const result = validatePassword('SenhaForte123!');
      assert.equal(result.valid, true);
    });

    it('should reject short password', () => {
      const result = validatePassword('Curta1!');
      assert.equal(result.valid, false);
      assert.ok(result.message.includes('8 caracteres'));
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('senhafraca123!');
      assert.equal(result.valid, false);
      assert.ok(result.message.includes('maiúscula'));
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('SENHAFORTE123!');
      assert.equal(result.valid, false);
      assert.ok(result.message.includes('minúscula'));
    });

    it('should reject password without number', () => {
      const result = validatePassword('SenhaFraca!');
      assert.equal(result.valid, false);
      assert.ok(result.message.includes('número'));
    });

    it('should reject password without special char', () => {
      const result = validatePassword('SenhaFraca123');
      assert.equal(result.valid, false);
      assert.ok(result.message.includes('especial'));
    });

    it('should reject empty/null password', () => {
      assert.equal(validatePassword('').valid, false);
      assert.equal(validatePassword(null).valid, false);
      assert.equal(validatePassword(undefined).valid, false);
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML entities', () => {
      assert.equal(sanitizeString('<script>alert(1)</script>'), '<script>alert(1)</script>');
      assert.equal(sanitizeString('"quoted"'), '"quoted"');
      assert.equal(sanitizeString("'single'"), '&#039;single&#039;');
      assert.equal(sanitizeString('&'), '&');
    });

    it('should trim whitespace', () => {
      assert.equal(sanitizeString('  hello  '), 'hello');
    });

    it('should handle empty/null/undefined', () => {
      assert.equal(sanitizeString(''), '');
      assert.equal(sanitizeString(null), '');
      assert.equal(sanitizeString(undefined), '');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid YYYY-MM-DD dates', () => {
      assert.equal(isValidDate('2024-01-15'), true);
      assert.equal(isValidDate('2024-12-31'), true);
      assert.equal(isValidDate('2024-02-29'), true); // leap year
    });

    it('should return false for invalid dates', () => {
      assert.equal(isValidDate('2024-13-01'), false); // invalid month
      assert.equal(isValidDate('2024-02-30'), false); // invalid day
      assert.equal(isValidDate('15-01-2024'), false); // wrong format
      assert.equal(isValidDate('2024/01/15'), false); // wrong format
      assert.equal(isValidDate(''), false);
      assert.equal(isValidDate(null), false);
    });
  });

  describe('isValidTime', () => {
    it('should return true for valid HH:MM times', () => {
      assert.equal(isValidTime('00:00'), true);
      assert.equal(isValidTime('12:30'), true);
      assert.equal(isValidTime('23:59'), true);
      assert.equal(isValidTime('07:05'), true);
    });

    it('should return false for invalid times', () => {
      assert.equal(isValidTime('24:00'), false);
      assert.equal(isValidTime('12:60'), false);
      assert.equal(isValidTime('7:5'), false);
      assert.equal(isValidTime(''), false);
      assert.equal(isValidTime(null), false);
    });
  });

  describe('isValidMealCategory', () => {
    it('should return true for valid categories', () => {
      assert.equal(isValidMealCategory('cafe_manha'), true);
      assert.equal(isValidMealCategory('almoco'), true);
      assert.equal(isValidMealCategory('lanche'), true);
      assert.equal(isValidMealCategory('jantar'), true);
    });

    it('should return false for invalid categories', () => {
      assert.equal(isValidMealCategory('breakfast'), false);
      assert.equal(isValidMealCategory(''), false);
      assert.equal(isValidMealCategory(null), false);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      assert.equal(isValidRole('aluno'), true);
      assert.equal(isValidRole('professor'), true);
      assert.equal(isValidRole('adm'), true);
    });

    it('should return false for invalid roles', () => {
      assert.equal(isValidRole('admin'), false);
      assert.equal(isValidRole('student'), false);
      assert.equal(isValidRole(''), false);
      assert.equal(isValidRole(null), false);
    });
  });

  describe('validateReserva', () => {
    it('should return valid for complete reserva', () => {
      const reserva = {
        categoria: 'almoco',
        data: '2024-01-15',
        horario: '12:00',
        professor: 'João Silva',
      };
      const result = validateReserva(reserva);
      assert.equal(result.valid, true);
      assert.deepEqual(result.errors, []);
    });

    it('should return errors for missing fields', () => {
      const result = validateReserva({});
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('Categoria inválida'));
      assert.ok(result.errors.includes('Data inválida (formato YYYY-MM-DD)'));
      assert.ok(result.errors.includes('Horário inválido (formato HH:MM)'));
      assert.ok(result.errors.includes('Nome do professor é obrigatório'));
    });

    it('should return error for invalid categoria', () => {
      const result = validateReserva({
        categoria: 'invalido',
        data: '2024-01-15',
        horario: '12:00',
        professor: 'João',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('Categoria inválida'));
    });
  });

  describe('validateCardapioItem', () => {
    it('should return valid for complete item', () => {
      const item = {
        nome: 'Arroz com Feijão',
        categoria: 'almoco',
        calorias: 350,
        proteina: 12,
        carboidrato: 55,
      };
      const result = validateCardapioItem(item);
      assert.equal(result.valid, true);
    });

    it('should return error for missing nome', () => {
      const result = validateCardapioItem({ categoria: 'almoco' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('Nome é obrigatório'));
    });

    it('should return error for negative nutritional values', () => {
      const result = validateCardapioItem({
        nome: 'Teste',
        categoria: 'almoco',
        calorias: -100,
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.includes('Calorias deve ser um número positivo'));
    });
  });
});