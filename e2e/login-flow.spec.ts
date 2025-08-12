import { test, expect } from '@playwright/test'

test('login page has form elements', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByPlaceholder('Email address')).toBeVisible()
  await expect(page.getByPlaceholder('Password')).toBeVisible()
})

