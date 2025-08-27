import { test, expect } from '@playwright/test'

// Helpers to sign in quickly if login is required. Adjust if your app requires auth.
async function signInIfNeeded(page) {
  await page.goto('/dashboard/properties')
  if (
    await page
      .getByRole('heading', { name: /sign in/i })
      .isVisible({ timeout: 1000 })
      .catch(() => false)
  ) {
    await page.getByLabel(/email address/i).fill(process.env.TEST_USER_EMAIL || 'user@example.com')
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD || 'Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL('**/dashboard')
    await page.goto('/dashboard/properties')
  }
}

test('Create property using current location and verify saved', async ({ page, context }) => {
  // Mock geolocation
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: -1.2921, longitude: 36.8219 })

  await signInIfNeeded(page)

  // Open the Add Property form
  const addButtons = page.getByRole('button', { name: /add property/i })
  const count = await addButtons.count()
  if (count > 0) {
    await addButtons.first().click()
  } else {
    // Fallback: click the "Add Property" in the header area
    await page.getByRole('button', { name: /add property/i }).click()
  }

  // The PropertyForm is a modal; fill name
  await expect(page.getByText(/add new property|edit property/i)).toBeVisible()
  await page.getByLabel(/property name/i).fill('Test Property (GPS)')

  // Click "Use current" button to populate address and coordinates
  await page.getByRole('button', { name: /use current/i }).click()

  // Wait for address field to be populated by reverse geocode
  const addressInput = page
    .locator('label:has-text("Physical Address")')
    .locator('..')
    .locator('input')
  await expect(addressInput).toHaveValue(/-?\d+\.?\d*,\s*-?\d+\.?\d*|[a-z]/i, { timeout: 8000 })

  // Submit the form
  await page.getByRole('button', { name: /create property|update property|creating/i }).click()

  // Expect a refresh back to properties list and presence of the new property name
  await expect(page.getByText('Test Property (GPS)')).toBeVisible({ timeout: 10000 })
})
