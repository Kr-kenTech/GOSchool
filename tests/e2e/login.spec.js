// tests/e2e/login.spec.js
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Login/login.html');
  });

  test('should load login page with GOSchool branding', async ({ page }) => {
    await expect(page).toHaveTitle(/GOSchool/);
    await expect(page.locator('h1, h2')).toContainText('GOSchool');
  });

  test('should have email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error for empty submit', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"], .form-error')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error, [role="alert"], .form-error')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button[aria-label*="senha" i], button[aria-label*="password" i], .toggle-password');

    if (await toggleButton.isVisible()) {
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should have Google OAuth button', async ({ page }) => {
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google"), .btn-google');
    await expect(googleButton).toBeVisible();
  });

  test('should have link to register', async ({ page }) => {
    const registerLink = page.locator('a:has-text("cadastrar"), a:has-text("Cadastrar"), a:has-text("registrar")');
    await expect(registerLink).toBeVisible();
  });
});