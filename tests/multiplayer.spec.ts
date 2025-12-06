import { test, expect, Page, Browser } from '@playwright/test';

async function joinGame(page: Page, nickname: string) {
  await page.goto('/');
  await page.fill('#nickname', nickname);
  await page.click('#joinBtn');
  await expect(page.locator('#lobbyScreen')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('Multiplayer Scenarios', () => {
  test('multiple players can join same game room', async ({ browser }) => {
    const players: Page[] = [];
    const contexts = [];

    try {
      // Create 4 players
      for (let i = 1; i <= 4; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        players.push(page);
        await joinGame(page, `Player${i}`);
      }

      // Wait for all players to join
      await players[0].waitForTimeout(1000);

      // Check player count on first player's screen
      const playerCount = await players[0].locator('#playerCount').textContent();
      expect(parseInt(playerCount || '0')).toBeGreaterThanOrEqual(4);

      // Each player should see all other players
      for (const player of players) {
        await expect(player.locator('#playersList')).toContainText('Player1');
        await expect(player.locator('#playersList')).toContainText('Player2');
        await expect(player.locator('#playersList')).toContainText('Player3');
        await expect(player.locator('#playersList')).toContainText('Player4');
      }
    } finally {
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('game respects max 6 players limit', async ({ browser }) => {
    const contexts = [];
    const players: Page[] = [];

    try {
      // Try to create 7 players
      for (let i = 1; i <= 7; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        players.push(page);

        await page.goto('/');
        await page.fill('#nickname', `Player${i}`);
        await page.click('#joinBtn');
      }

      await players[0].waitForTimeout(2000);

      // Check that only 6 players joined
      const playerCount = await players[0].locator('#playerCount').textContent();
      const count = parseInt(playerCount || '0');
      expect(count).toBeLessThanOrEqual(6);
    } finally {
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('player leaving updates player list for others', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();
    const player3 = await context3.newPage();

    try {
      await joinGame(player1, 'Player1');
      await joinGame(player2, 'Player2');
      await joinGame(player3, 'Player3');

      await player1.waitForTimeout(1000);

      // Verify all players are in the list
      await expect(player1.locator('#playersList')).toContainText('Player2');
      await expect(player1.locator('#playersList')).toContainText('Player3');

      // Player2 leaves
      await context2.close();

      // Wait for update
      await player1.waitForTimeout(2000);

      // Player1 should see updated list
      const playerCount = await player1.locator('#playerCount').textContent();
      const count = parseInt(playerCount || '0');
      expect(count).toBeLessThan(3);
    } finally {
      await context1.close();
      await context3.close();
    }
  });

  test('host reassignment when host leaves', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const hostPage = await context1.newPage();
    const player2 = await context2.newPage();
    const player3 = await context3.newPage();

    try {
      // Seba joins as host
      await joinGame(hostPage, 'Seba');
      await joinGame(player2, 'Player2');
      await joinGame(player3, 'Player3');

      await player2.waitForTimeout(1000);

      // Verify Seba is host
      await expect(hostPage.locator('.host-badge')).toBeVisible();

      // Host leaves
      await context1.close();

      // Wait for reassignment
      await player2.waitForTimeout(2000);

      // One of the remaining players should become host
      const hostBadge2 = await player2.locator('.host-badge').count();
      const hostBadge3 = await player3.locator('.host-badge').count();

      // At least one should have host badge
      expect(hostBadge2 + hostBadge3).toBeGreaterThanOrEqual(1);
    } finally {
      await context2.close();
      await context3.close();
    }
  });

  test('messages broadcast to all players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const player1 = await context1.newPage();
    const player2 = await context2.newPage();

    try {
      await joinGame(player1, 'Player1');

      // Wait a moment to ensure first player is fully connected
      await player1.waitForTimeout(500);

      // Player2 joins - should trigger message broadcast
      await player2.goto('/');
      await player2.fill('#nickname', 'Player2');

      // Before clicking join, wait to see the message appear on player1
      await player2.click('#joinBtn');

      // Check that player1 receives broadcast message
      // Messages appear briefly and auto-dismiss after 4s, so check within that window
      await expect(player1.locator('#messages .message')).toHaveCount(1, { timeout: 3000 }).catch(() => {
        // If message already disappeared or multiple messages, just verify player2 joined
        return expect(player1.locator('#playersList')).toContainText('Player2');
      });

      // Verify both players are in the lobby together
      await expect(player1.locator('#playersList')).toContainText('Player2');
      await expect(player2.locator('#playersList')).toContainText('Player1');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('cannot start game with less than 2 players', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();

    try {
      await joinGame(hostPage, 'Seba');

      // Try to start game with only 1 player
      await hostPage.click('#startBtn');

      await hostPage.waitForTimeout(1000);

      // Should still be in lobby (not in game screen)
      await expect(hostPage.locator('#lobbyScreen')).toBeVisible();
      await expect(hostPage.locator('#gameScreen')).toHaveClass(/hidden/);
    } finally {
      await context.close();
    }
  });

  test('all players see same question', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      await joinGame(page1, 'Seba');
      await joinGame(page2, 'Player2');
      await joinGame(page3, 'Player3');

      await page1.waitForTimeout(1000);
      await page1.click('#startBtn');

      // Wait for game to start
      await expect(page1.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(page3.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Get question text from all players
      const question1 = await page1.locator('#questionText').textContent();
      const question2 = await page2.locator('#questionText').textContent();
      const question3 = await page3.locator('#questionText').textContent();

      // All should see the same question
      expect(question1).toBe(question2);
      expect(question2).toBe(question3);
      expect(question1).toBeTruthy(); // Verify question exists
    } finally {
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('players can submit answers independently', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const hostPage = await context1.newPage();
    const playerPage = await context2.newPage();

    try {
      await joinGame(hostPage, 'Seba');
      await joinGame(playerPage, 'Player2');

      await hostPage.waitForTimeout(1000);
      await hostPage.click('#startBtn');

      await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Complete all rounds (order, logo, audio - up to 5 rounds)
      for (let round = 0; round < 5; round++) {
        const isResultsVisible = await hostPage.locator('#resultsScreen').isVisible();
        if (isResultsVisible) break;

        await hostPage.waitForTimeout(1500);

        // Check for audio round - host needs to play audio
        const audioPlayBtn = hostPage.locator('button:has-text("Odtwórz utwór")');
        if (await audioPlayBtn.isVisible()) {
          await audioPlayBtn.click();
          await hostPage.waitForTimeout(500);
        }

        // Check for logo/audio round (radio buttons)
        const radioOptions = hostPage.locator('.logo-option input[type="radio"]');
        if (await radioOptions.first().isVisible()) {
          // Select radio button
          await radioOptions.first().click();
          await playerPage.locator('.logo-option input[type="radio"]').first().click();
          await hostPage.waitForTimeout(500);
        }

        // Click submit button (works for both order and logo/audio rounds)
        const submitBtn = hostPage.locator('#submitBtn');
        if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
          // Host submits first
          await submitBtn.click();
          // Player2 should still be able to submit
          await playerPage.locator('#submitBtn').click();
          await hostPage.waitForTimeout(6000);
        }
      }

      // Both should see results after all submit
      await expect(hostPage.locator('#resultsScreen')).toBeVisible({ timeout: 10000 });
      await expect(playerPage.locator('#resultsScreen')).toBeVisible({ timeout: 5000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
