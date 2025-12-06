# Familiada Game - Playwright Tests

This directory contains end-to-end tests for the Familiada multiplayer game using Playwright.

## Test Structure

### `game.spec.ts` - Basic Game Flow Tests
- Login screen display and validation
- Player joining with nickname
- Empty nickname validation
- Player count display
- Host badge visibility
- Start button visibility for host vs. non-host players

### `gameplay.spec.ts` - Gameplay Tests
- Host starting game with minimum players
- Answer shuffling for different players
- Drag and drop answer reordering
- Answer submission
- Results screen display
- Correct answer display and scoring

### `multiplayer.spec.ts` - Multiplayer Scenarios
- Multiple players joining same room
- Maximum player limit (6 players)
- Player leaving and list updates
- Host reassignment when host leaves
- Message broadcasting to all players
- Game start validation (minimum 2 players)
- Synchronized question display across players
- Independent answer submission
- Results synchronization

## Running Tests

### Install dependencies
```bash
npm install
```

### Install Playwright browsers
```bash
npx playwright install
```

### Run all tests
```bash
npm test
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

### Run specific test file
```bash
npx playwright test tests/game.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test -g "should display login screen"
```

## Test Configuration

The tests are configured in `playwright.config.ts` with the following settings:

- **Base URL**: http://localhost:2567
- **Workers**: 1 (sequential execution for multiplayer tests)
- **Retries**: 2 on CI, 0 locally
- **Browser**: Chromium (Desktop Chrome)
- **Web Server**: Automatically starts `npm start` before running tests

## Key Test Scenarios

### Single Player Flow
1. User enters nickname
2. Joins lobby
3. Waits for more players or becomes host

### Host Flow
1. Host (nickname "Seba") joins
2. Sees start button
3. Waits for at least 2 players
4. Starts the game
5. Answers question
6. Views results

### Regular Player Flow
1. Player joins with any nickname
2. Sees waiting message
3. Waits for host to start
4. Answers question when game starts
5. Views results

### Multiplayer Flow
1. Multiple players join same room
2. All players see each other in lobby
3. Host starts game
4. All players see same question
5. Each player drags answers to preferred order
6. Players submit independently
7. Results show when all players submit
8. Correct answers and scores displayed

## Expected Game Behavior

- **Max Players**: 6
- **Min Players to Start**: 2
- **Host Privilege**: Player with nickname "Seba" becomes host
- **Host Powers**: Can start the game
- **Question**: "Więcej niż jedno zwierzę to:"
- **Correct Answer Order**: Stado → Wataha → Ławica → Klucz

## Troubleshooting

### Tests fail to start server
- Ensure port 2567 is available
- Check if server starts manually with `npm start`

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check network connectivity

### Drag and drop tests fail
- These tests use mouse simulation and may be flaky
- Run in headed mode to debug: `npm run test:headed`

### Multiple player tests fail
- Ensure `workers: 1` in config to prevent race conditions
- These tests create multiple browser contexts simultaneously

## Writing New Tests

When adding new tests:

1. Use the helper function `joinGame(page, nickname)` to join the game
2. Create separate browser contexts for multiplayer scenarios
3. Always close contexts in `finally` blocks
4. Use appropriate timeouts for network operations
5. Test both positive and negative scenarios

Example:
```typescript
test('your test name', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await joinGame(page, 'TestPlayer');
    // Your test code here
  } finally {
    await context.close();
  }
});
```

## CI/CD Integration

To run tests in CI:

```bash
# In your CI pipeline
npm install
npx playwright install --with-deps
npm test
```

The tests will automatically retry failed tests twice in CI environments.
