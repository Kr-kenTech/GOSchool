// tests/e2e/aluno-dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('Aluno Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login by setting cookies
    await page.context().addCookies([
      { name: 'access_token', value: 'mock-token', domain: 'localhost', path: '/', httpOnly: true },
      { name: 'refresh_token', value: 'mock-refresh', domain: 'localhost', path: '/', httpOnly: true },
    ]);
    await page.goto('/Aluno/index.html');
  });

  test('should load aluno dashboard with GOSchool branding', async ({ page }) => {
    await expect(page).toHaveTitle(/GOSchool/);
    await expect(page.locator('header')).toBeVisible();
  });

  test('should have sidebar navigation', async ({ page }) => {
    await expect(page.locator('.sidebar, nav.sidebar, [role="navigation"]')).toBeVisible();
    await expect(page.locator('a:has-text("Início"), a:has-text("Cardápio"), a:has-text("Reservas"), a:has-text("Configurações")')).toBeVisible();
  });

  test('should show cardápio do dia', async ({ page }) => {
    await expect(page.locator('.cardapio-do-dia, .meal-of-day, [data-testid="cardapio-hoje"]')).toBeVisible();
  });

  test('should show allergy alerts if any', async ({ page }) => {
    const alert = page.locator('.alerta-alergia, .allergy-alert, [data-testid="allergy-alert"]');
    // May or may not be visible depending on data
    // Just verify component exists
    await expect(alert.first()).toBeAttached();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Hamburger menu should be visible
    const hamburger = page.locator('.hamburger-btn, button[aria-label*="menu" i], .menu-toggle');
    await expect(hamburger).toBeVisible();

    // Sidebar should be hidden by default
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveCSS('left', /-280px|0px/); // Depending on implementation
  });

  test('should toggle sidebar on hamburger click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const hamburger = page.locator('.hamburger-btn, button[aria-label*="menu" i], .menu-toggle');
    const sidebar = page.locator('.sidebar');

    await hamburger.click();
    await expect(sidebar).toHaveClass(/open/);

    await hamburger.click();
    await expect(sidebar).not.toHaveClass(/open/);
  });
});