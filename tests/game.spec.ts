import { test, expect, Page } from '@playwright/test';

// Helper function to join game with a nickname
async function joinGame(page: Page, nickname: string) {
  await page.goto('/');
  await expect(page.locator('#loginScreen')).toBeVisible();
  await page.fill('#nickname', nickname);
  await page.click('#joinBtn');
  // Wait for WebSocket connection and lobby to appear
  await expect(page.locator('#lobbyScreen')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500); // Small additional wait for state sync
}

test.describe('Familiada Game Tests', () => {
  test('should display login screen on initial load', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#loginScreen h1')).toContainText('Seboss Game');
    await expect(page.locator('#nickname')).toBeVisible();
    await expect(page.locator('#joinBtn')).toBeVisible();
    await expect(page.locator('#loginScreen')).not.toHaveClass(/hidden/);
  });

  test('should successfully join the game with a nickname', async ({ page }) => {
    await page.goto('/');

    const nickname = 'Player1';
    await page.fill('#nickname', nickname);
    await page.click('#joinBtn');

    // Should navigate to lobby
    await expect(page.locator('#lobbyScreen')).toBeVisible();
    await expect(page.locator('#loginScreen')).toHaveClass(/hidden/);

    // Should see player in the players list
    await expect(page.locator('#playersList')).toContainText(nickname);
  });

  test('should not allow joining with empty nickname', async ({ page }) => {
    await page.goto('/');

    await page.click('#joinBtn');

    // Should still be on login screen
    await expect(page.locator('#loginScreen')).toBeVisible();
    await expect(page.locator('#lobbyScreen')).toHaveClass(/hidden/);
  });

  test('should display player count in lobby', async ({ page }) => {
    await joinGame(page, 'TestPlayer');

    // Check player count is displayed
    const playerCount = await page.locator('#playerCount').textContent();
    expect(parseInt(playerCount || '0')).toBeGreaterThanOrEqual(1);
  });

  test('should show host badge for host player', async ({ page }) => {
    await joinGame(page, 'Seba');

    // Seba should be marked as host according to GameRoom.ts:26
    await expect(page.locator('.host-badge')).toBeVisible();
  });

  test('should show start button only for host', async ({ page }) => {
    await joinGame(page, 'Seba');

    // Host should see start button
    await expect(page.locator('#startBtn')).toBeVisible();
    await expect(page.locator('#startBtn')).not.toHaveClass(/hidden/);
  });

  test('should not show start button for non-host players', async ({ page }) => {
    await joinGame(page, 'RegularPlayer');

    // Non-host should not see start button
    await expect(page.locator('#startBtn')).toHaveClass(/hidden/);
    await expect(page.locator('#waitingMessage')).toBeVisible();
  });
});
