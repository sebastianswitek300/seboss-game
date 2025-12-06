import { test, expect, Page } from '@playwright/test';

async function joinGame(page: Page, nickname: string) {
  await page.goto('/');
  await page.fill('#nickname', nickname);
  await page.click('#joinBtn');
  await expect(page.locator('#lobbyScreen')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('Gameplay Tests', () => {
  test('host can start game with enough players', async ({ browser }) => {
    // Create two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const hostPage = await context1.newPage();
    const player2Page = await context2.newPage();

    try {
      // Join as host
      await joinGame(hostPage, 'Seba');

      // Join as second player
      await joinGame(player2Page, 'Player2');

      // Wait for both players to be in lobby
      await hostPage.waitForTimeout(1000);

      // Host starts the game
      await hostPage.click('#startBtn');

      // Both players should see game screen
      await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(player2Page.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Check question is displayed
      await expect(hostPage.locator('#questionText')).toBeVisible();
      const questionText = await hostPage.locator('#questionText').textContent();
      expect((questionText || '').length).toBeGreaterThan(0);

      // Check answers are displayed
      await expect(hostPage.locator('.led-answer-row')).toHaveCount(4);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('game displays shuffled answers for each player', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await joinGame(page1, 'Seba');
      await joinGame(page2, 'Player2');
      await page1.waitForTimeout(1000);
      await page1.click('#startBtn');

      // Wait for game to start
      await expect(page1.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Get answers from both players
      const answers1 = await page1.locator('.led-text').allTextContents();
      const answers2 = await page2.locator('.led-text').allTextContents();

      // Both should have same answers (might be in different order due to shuffle)
      expect(answers1.sort()).toEqual(answers2.sort());

      // Ensure 4 answers rendered
      expect(answers1).toHaveLength(4);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('player can drag and drop answers to reorder', async ({ browser }) => {
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPage = await context.newPage();

    try {
      await joinGame(hostPage, 'Seba');
      await joinGame(playerPage, 'Player2');
      await hostPage.waitForTimeout(1000);
      await hostPage.click('#startBtn');

      await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Get initial order
      const initialAnswers = await hostPage.locator('.led-text').allTextContents();

      // Drag first answer to second position (simplified test - actual drag may need more complex interaction)
      const firstAnswer = hostPage.locator('.led-answer-row').first();
      const secondAnswer = hostPage.locator('.led-answer-row').nth(1);

      // Get bounding boxes
      const firstBox = await firstAnswer.boundingBox();
      const secondBox = await secondAnswer.boundingBox();

      if (firstBox && secondBox) {
        // Perform drag
        await hostPage.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await hostPage.mouse.down();
        await hostPage.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2);
        await hostPage.mouse.up();

        await hostPage.waitForTimeout(500);

        // Verify order changed
        const newAnswers = await hostPage.locator('.led-text').allTextContents();
        expect(newAnswers).not.toEqual(initialAnswers);
      }
    } finally {
      await context.close();
    }
  });

  test('player can submit answers', async ({ browser }) => {
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

      // Submit answers
      await hostPage.click('#submitBtn');

      // Button should be disabled after submission
      await expect(hostPage.locator('#submitBtn')).toBeDisabled();

      // Toast success should appear
      await expect(hostPage.locator('.message.success')).toBeVisible({ timeout: 2000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('results screen shows after all players submit', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const hostPage = await context1.newPage();
    const playerPage = await context2.newPage();

    try {
      await joinGame(hostPage, 'Seba');
      await joinGame(playerPage, 'Player2');
      await hostPage.waitForTimeout(1000);
      await hostPage.click('#startBtn');

      // Wait for game screen
      await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Complete all rounds (order, logo, audio - up to 5 rounds)
      for (let round = 0; round < 5; round++) {
        // Check if results screen appeared
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
          await submitBtn.click();
          await playerPage.locator('#submitBtn').click();
          await hostPage.waitForTimeout(6000);
        }
      }

      // Results screen should appear for both
      await expect(hostPage.locator('#resultsScreen')).toBeVisible({ timeout: 10000 });
      await expect(playerPage.locator('#resultsScreen')).toBeVisible({ timeout: 5000 });

      // Check results table is displayed
      await expect(hostPage.locator('.results-table')).toBeVisible();
      await expect(hostPage.locator('#correctAnswers')).toBeVisible();
    } finally{
      await context1.close();
      await context2.close();
    }
  });

  test('results show correct answers and player scores', async ({ browser }) => {
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

      // Complete all rounds (order, logo, audio - up to 5 attempts)
      for (let round = 0; round < 5; round++) {
        // Check if results screen appeared
        const isResultsVisible = await hostPage.locator('#resultsScreen').isVisible();
        if (isResultsVisible) {
          console.log(`Results appeared after round ${round}`);
          break;
        }

        // Check if game screen is still visible
        const gameVisible = await hostPage.locator('#gameScreen').isVisible();
        if (!gameVisible) {
          console.log(`Game screen disappeared after round ${round}`);
          break;
        }

        await hostPage.waitForTimeout(1500);

        // Check for audio round - host needs to play audio
        const audioPlayBtn = hostPage.locator('button:has-text("Odtwórz utwór")');
        if (await audioPlayBtn.isVisible()) {
          await audioPlayBtn.click();
          await hostPage.waitForTimeout(1000);
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
          await submitBtn.click();
          await playerPage.locator('#submitBtn').click();
          await hostPage.waitForTimeout(3000);
        }
      }

      // Wait for results
      await expect(hostPage.locator('#resultsScreen')).toBeVisible({ timeout: 10000 });

      // Check that results table has entries for both players
      const resultsRows = await hostPage.locator('#resultsTable tr').count();
      expect(resultsRows).toBeGreaterThanOrEqual(2); // At least 2 players
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('correct answer displays for at least 4 seconds after all players submit', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const hostPage = await context1.newPage();
    const playerPage = await context2.newPage();

    try {
      await joinGame(hostPage, 'Seba');
      await joinGame(playerPage, 'Player2');
      await hostPage.waitForTimeout(1000);
      await hostPage.click('#startBtn');

      // Wait for game screen
      await expect(hostPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });
      await expect(playerPage.locator('#gameScreen')).toBeVisible({ timeout: 5000 });

      // Find a logo or audio round to test the timing
      let foundLogoOrAudioRound = false;
      for (let round = 0; round < 5; round++) {
        // Check if results screen appeared
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
          foundLogoOrAudioRound = true;

          // Select radio button
          await radioOptions.first().click();
          await playerPage.locator('.logo-option input[type="radio"]').first().click();
          await hostPage.waitForTimeout(500);

          // Both players submit
          const submitBtn = hostPage.locator('#submitBtn');
          if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
            await submitBtn.click();
            await playerPage.locator('#submitBtn').click();

            // Start timing when second player submits (all players submitted)
            const startTime = Date.now();

            // Wait for correct answer to appear
            await expect(hostPage.locator('.correct-answer')).toBeVisible({ timeout: 2000 });

            // Check if correct answer is still visible after 4 seconds
            await hostPage.waitForTimeout(4000);
            const isStillVisible = await hostPage.locator('.correct-answer').isVisible();

            // Measure how long it was visible
            const visibleDuration = Date.now() - startTime;

            console.log(`Correct answer was visible for ${visibleDuration}ms`);

            // Correct answer should still be visible after 4 seconds
            expect(isStillVisible).toBe(true);
            expect(visibleDuration).toBeGreaterThanOrEqual(4000);

            // Break after testing one logo/audio round
            break;
          }
        }

        // If it's an order round, just submit and continue
        const submitBtn = hostPage.locator('#submitBtn');
        if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
          await submitBtn.click();
          await playerPage.locator('#submitBtn').click();
          await hostPage.waitForTimeout(3000);
        }
      }

      // Ensure we actually tested a logo/audio round
      expect(foundLogoOrAudioRound).toBe(true);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
