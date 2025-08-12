import { test, expect } from '@playwright/test'

const email = process.env.TEST_USER_EMAIL || 'user@example.com'
const password = process.env.TEST_USER_PASSWORD || 'Password123!'

test('login page loads', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
})

test('forgot password page loads', async ({ page }) => {
  await page.goto('/auth/forgot-password')
  await expect(page.getByText(/reset/i)).toBeVisible()
})

