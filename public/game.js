let client;
let room;
let mySessionId;
let myNickname;
let sortable;
let audioPlayer = null;

// Get server URL (match current host/port/protocol)
const host = window.location.hostname;
const port = window.location.port;
const isSecure = window.location.protocol === 'https:';
let serverUrl;
if (port) {
    serverUrl = `${isSecure ? 'wss' : 'ws'}://${host}:${port}`;
} else if (host === 'localhost' || host === '127.0.0.1') {
    serverUrl = `${isSecure ? 'wss' : 'ws'}://${host}:2567`;
} else {
    serverUrl = `wss://${host}`;
}

// Initialize Colyseus client
client = new Colyseus.Client(serverUrl);

// UI Elements
const loginScreen = document.getElementById('loginScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const resultsScreen = document.getElementById('resultsScreen');

const nicknameInput = document.getElementById('nickname');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');

const playersList = document.getElementById('playersList');
const playerCount = document.getElementById('playerCount');
const waitingMessage = document.getElementById('waitingMessage');

const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const resultsTable = document.getElementById('resultsTable');

// Join game
joinBtn.addEventListener('click', async () => {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        showMessage('Wpisz swój nick!');
        return;
    }

    if (nickname.length > 20) {
        showMessage('Nick może mieć maksymalnie 20 znaków!');
        return;
    }

    try {
        myNickname = nickname;

        // Try to join existing room or create new one
        try {
            room = await client.joinOrCreate("game", { nickname });
        } catch (e) {
            showMessage('Błąd połączenia z serwerem!');
            console.error(e);
            return;
        }

        mySessionId = room.sessionId;

        // Send join message with nickname
        room.send("join", { nickname });

        // Setup room listeners
        setupRoomListeners();

        // Show lobby
        loginScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');

    } catch (e) {
        showMessage('Nie udało się dołączyć do gry!');
        console.error(e);
    }
});

// Start game (only host)
startBtn.addEventListener('click', () => {
    room.send("startGame");
});

// Submit answers
submitBtn.addEventListener('click', () => {
    playTap();
    const questionType = room.state.currentQuestion.type || 'order';

    if (questionType === 'order') {
        const answerElements = answersContainer.querySelectorAll('.led-answer-row');
        const answers = Array.from(answerElements).map(el => el.dataset.answer);

        room.send("submitAnswers", { answers });
    } else {
        const selected = answersContainer.querySelector('input[name="roundOption"]:checked');
        if (!selected) {
            showMessage('Wybierz odpowiedź!');
            return;
        }
        room.send("submitAnswers", { selected: selected.value });

        // Disable all radio buttons after submission
        const allRadios = answersContainer.querySelectorAll('input[name="roundOption"]');
        allRadios.forEach(radio => {
            radio.disabled = true;
        });

        // Highlight the selected answer
        const selectedLabel = selected.closest('.logo-option');
        if (selectedLabel) {
            selectedLabel.classList.add('selected-answer');
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wysłano odpowiedź!';
    submitBtn.classList.add('disabled');
});

// Setup room state listeners
function setupRoomListeners() {
    // Listen to state changes
    room.onStateChange((state) => {
        updatePlayersList(state);

        // Update UI based on game phase
        if (state.gamePhase === 'lobby') {
            lobbyScreen.classList.remove('hidden');
            gameScreen.classList.add('hidden');
            resultsScreen.classList.add('hidden');

            // Show start button if you're the host
            if (state.hostId === mySessionId) {
                startBtn.classList.remove('hidden');
                waitingMessage.classList.add('hidden');
            } else {
                startBtn.classList.add('hidden');
                waitingMessage.classList.remove('hidden');
            }
        } else if (state.gamePhase === 'playing') {
            lobbyScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            resultsScreen.classList.add('hidden');

            // Display question
            displayQuestion(state);
        } else if (state.gamePhase === 'results') {
            lobbyScreen.classList.add('hidden');
            gameScreen.classList.add('hidden');
            resultsScreen.classList.remove('hidden');

            // Display results
            displayResults(state);
        }
    });

    // Listen to messages
    room.onMessage("message", (message) => {
        showMessage(message.text);
    });

    room.onMessage("error", (message) => {
        showMessage(message.message, 'error');
    });

    room.onMessage("submissionResult", (payload) => {
        handleSubmissionResult(payload);
    });

    room.onMessage("audioControl", (payload) => {
        if (!audioPlayer) return;
        if (payload.action === 'play') {
            audioPlayer.currentTime = 0;
            audioPlayer.play().catch(() => {
                console.warn('Audio autoplay blocked');
            });
        } else if (payload.action === 'pause') {
            audioPlayer.pause();
        }
    });

    // Handle disconnection
    room.onLeave((code) => {
        showMessage('Rozłączono z serwerem!');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    });
}

// Update players list
function updatePlayersList(state) {
    playersList.innerHTML = '';
    playerCount.textContent = state.players.size;

    state.players.forEach((player, sessionId) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';

        const nicknameSpan = document.createElement('span');
        nicknameSpan.className = 'player-nickname';
        nicknameSpan.textContent = player.nickname;

        playerDiv.appendChild(nicknameSpan);

        // Show host badge
        if (sessionId === state.hostId) {
            const hostBadge = document.createElement('span');
            hostBadge.className = 'host-badge';
            hostBadge.textContent = 'HOST';
            playerDiv.appendChild(hostBadge);
        }

        playersList.appendChild(playerDiv);
    });
}

// Display question and answers
function displayQuestion(state) {
    questionText.textContent = state.currentQuestion.text;
    answersContainer.innerHTML = '';

    const questionType = state.currentQuestion.type || 'order';
    audioPlayer = null;

    // Get shuffled answers for current player
    const myPlayer = state.players.get(mySessionId);
    if (!myPlayer) return;

    if (questionType === 'order') {
        myPlayer.answers.forEach((answer, index) => {
            const answerRow = document.createElement('div');
            answerRow.className = 'led-answer-row';
            answerRow.dataset.answer = answer;

            const numberSpan = document.createElement('span');
            numberSpan.className = 'led-number';
            numberSpan.textContent = index + 1;

            const textSpan = document.createElement('span');
            textSpan.className = 'led-text';
            textSpan.textContent = answer;

            answerRow.appendChild(numberSpan);
            answerRow.appendChild(textSpan);
            answersContainer.appendChild(answerRow);
        });

        // Initialize drag & drop
        if (sortable) {
            sortable.destroy();
        }

        sortable = new Sortable(answersContainer, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function() {
                // Update numbers after reordering
                const items = answersContainer.querySelectorAll('.led-answer-row');
                items.forEach((item, index) => {
                    item.querySelector('.led-number').textContent = index + 1;
                });
            }
        });
    } else if (questionType === 'logo') {
        // Logo multiple choice
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }

        const logoWrapper = document.createElement('div');
        logoWrapper.className = 'logo-question';
        const img = document.createElement('img');
        img.className = 'logo-image';
        img.src = state.currentQuestion.image;
        img.alt = state.currentQuestion.text;
        logoWrapper.appendChild(img);
        answersContainer.appendChild(logoWrapper);

        const optionsWrapper = document.createElement('div');
        optionsWrapper.className = 'logo-options';

        myPlayer.answers.forEach((answer) => {
            const option = document.createElement('label');
            option.className = 'logo-option';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'roundOption';
            input.value = answer;

            const text = document.createElement('span');
            text.textContent = answer;

            option.appendChild(input);
            option.appendChild(text);
            optionsWrapper.appendChild(option);
        });

        answersContainer.appendChild(optionsWrapper);
    } else {
        // Audio multiple choice
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }

        const audioTitle = document.createElement('h3');
        audioTitle.className = 'audio-title';
        const trackNumber = (state.completedQuestions?.length || 0) + 1;
        audioTitle.textContent = `Utwór ${trackNumber}`;
        answersContainer.appendChild(audioTitle);

        const audioWrapper = document.createElement('div');
        audioWrapper.className = 'audio-question';
        const audio = document.createElement('audio');
        audio.className = 'audio-player';
        audio.controls = false;
        audio.src = state.currentQuestion.audio;
        audioWrapper.appendChild(audio);
        answersContainer.appendChild(audioWrapper);
        audioPlayer = audio;

        if (state.hostId === mySessionId) {
            const controlsWrapper = document.createElement('div');
            controlsWrapper.className = 'audio-controls';
            const playBtn = document.createElement('button');
            playBtn.textContent = 'Odtwórz utwór (host)';
            playBtn.addEventListener('click', () => {
                audio.play().catch(() => console.warn('Audio play blocked'));
                room.send("audioControl", { action: 'play' });
                playTap();
            });
            controlsWrapper.appendChild(playBtn);
            answersContainer.appendChild(controlsWrapper);
        }

        const optionsWrapper = document.createElement('div');
        optionsWrapper.className = 'audio-options';

        myPlayer.answers.forEach((answer) => {
            const option = document.createElement('label');
            option.className = 'logo-option';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'roundOption';
            input.value = answer;

            const text = document.createElement('span');
            text.textContent = answer;

            option.appendChild(input);
            option.appendChild(text);
            optionsWrapper.appendChild(option);
        });

        answersContainer.appendChild(optionsWrapper);
    }

    // Reset submit button
    submitBtn.disabled = false;
    submitBtn.classList.remove('disabled');
    submitBtn.textContent = 'Zatwierdź odpowiedź';
}

// Display results
function displayResults(state) {
    // Sort players by score
    const players = Array.from(state.players.entries())
        .map(([sessionId, player]) => ({ sessionId, ...player }))
        .sort((a, b) => b.score - a.score);

    // Display results table
    resultsTable.innerHTML = '';
    players.forEach((player, index) => {
        const row = document.createElement('tr');

        const placeCell = document.createElement('td');
        placeCell.textContent = index + 1;
        if (index === 0) placeCell.textContent += ' 🏆';
        if (index === 1) placeCell.textContent += ' 🥈';
        if (index === 2) placeCell.textContent += ' 🥉';

        const nicknameCell = document.createElement('td');
        nicknameCell.textContent = player.nickname;
        if (player.sessionId === mySessionId) {
            nicknameCell.style.fontWeight = 'bold';
            nicknameCell.style.color = '#667eea';
        }

        const scoreCell = document.createElement('td');
        const scoreBadge = document.createElement('span');
        scoreBadge.className = 'score-badge';
        const total = state.totalPossiblePoints || 5;
        scoreBadge.textContent = `${player.score}/${total}`;
        scoreCell.appendChild(scoreBadge);

        row.appendChild(placeCell);
        row.appendChild(nicknameCell);
        row.appendChild(scoreCell);

        resultsTable.appendChild(row);
    });
}

// Handle submission feedback per question
function handleSubmissionResult(payload) {
    const { questionType, pointsEarned } = payload;
    // No toast messages - just visual feedback on answers

    if (payload.totalScore !== undefined) {
        const totalEl = document.getElementById('totalScore');
        if (totalEl) totalEl.textContent = payload.totalScore;
    }

    if (questionType === 'order') {
        const items = answersContainer.querySelectorAll('.led-answer-row');
        items.forEach((item, index) => {
            const badge = document.createElement('span');
            badge.className = 'position-score';
            const correct = payload.perPosition && payload.perPosition[index];
            badge.textContent = correct ? '+1' : '0';
            if (correct) {
                item.classList.add('correct-answer');
            } else {
                item.classList.add('wrong-answer');
            }
            item.appendChild(badge);
        });
    } else {
        const options = answersContainer.querySelectorAll('label.logo-option');
        options.forEach((opt) => {
            const input = opt.querySelector('input');
            if (!input) return;
            if (input.value === payload.correctAnswer) {
                opt.classList.remove('selected-answer');
                opt.classList.add('correct-answer');
            } else if (input.checked || input.value === payload.selected) {
                opt.classList.remove('selected-answer');
                opt.classList.add('wrong-answer');
            }
        });
    }
}

// Show notification message
function showMessage(text, type = 'info') {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    if (type === 'success') {
        messageDiv.classList.add('success');
    }
    messageDiv.textContent = text;

    if (type === 'error') {
        messageDiv.style.background = '#dc3545';
    }

    messagesContainer.appendChild(messageDiv);

    // Auto remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s';
        setTimeout(() => {
            messageDiv.remove();
        }, 300);
    }, 4000);
}

// Allow enter key to join
nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        playTap();
        joinBtn.click();
    }
});

// Play UI tap sound
function playTap() {
    const tap = document.getElementById('tapSound');
    if (tap) {
        tap.currentTime = 0;
        tap.play().catch(() => {});
    }
}
