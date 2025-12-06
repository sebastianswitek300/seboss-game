import { Room, Client } from "colyseus";
import { GameState, Player, Question } from "./schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 6;
  // Round 1: ordering questions
  private orderQuestionBank = [
    {
      text: "Co można znaleźć w lesie?",
      correctOrder: ["Łosia", "Grzyby", "Jagody", "Zgubiony telefon"],
    },
    {
      text: "Co robi mąż po powrocie z pracy?",
      correctOrder: ["Piwko", "Siada na kanapie", "Włącza telewizor", "Śpi"],
    },
    {
      text: "Co robi się, kiedy człowiek jest pijany?",
      correctOrder: [
        "Nie trafia w klamkę",
        "Wymiotuje",
        "Zasypia",
        "Mówi, że kocha wszystkich",
      ],
    },
    {
      text: "Co jest żółte?",
      correctOrder: ["Żółte karteczki", "Banan", "Słońce", "Ser"],
    },
    {
      text: "Co można otworzyć?",
      correctOrder: ["Parasol", "Drzwi", "Okno", "Butelkę"],
    },
    {
      text: "Co jest w kuchni?",
      correctOrder: ["Chlebak", "Czajnik", "Lodówka", "Dżem"],
    },
    {
      text: "Co można zjeść na śniadanie?",
      correctOrder: ["Tosty", "Jajecznicę", "Kanapkę", "Zupę"],
    },
    {
      text: "Jakie znasz zwierzę domowe?",
      correctOrder: ["Kot", "Pies", "Chomik", "Królik"],
    },
    {
      text: "Co można robić w toalecie?",
      correctOrder: ["Żyć", "Czytać", "Scrollować telefon", "Myśleć"],
    },
  ];

  // Round 2: logo -> club name questions
  private logoQuestionBank = [
    {
      text: "Dopasuj klub do herbu",
      image: "/img/atalanta.png",
      correctAnswer: "Atalanta Bergamo",
      options: ["Atalanta Bergamo", "Inter Mediolan", "Lazio Rzym", "Empoli FC"],
    },
    {
      text: "Dopasuj klub do herbu",
      image: "/img/tottenham.png",
      correctAnswer: "Tottenham Hotspur",
      options: ["Tottenham Hotspur", "Swansea City", "Newcastle United", "Leeds United"],
    },
    {
      text: "Dopasuj klub do herbu",
      image: "/img/as-monaco.png",
      correctAnswer: "AS Monaco",
      options: ["AS Monaco", "Stade Reims", "Stade Rennais", "Royal Antwerp"],
    },
    {
      text: "Dopasuj klub do herbu",
      image: "/img/real-madryt.png",
      correctAnswer: "Real Madryt",
      options: ["Real Madryt", "Real Valladolid", "Real Betis", "Real Sociedad"],
    },
    {
      text: "Dopasuj markę modową do logo",
      image: "/img/c&a.png",
      correctAnswer: "C&A",
      options: ["C&A", "H&M", "Calvin Klein", "Reserved"],
    },
    {
      text: "Dopasuj markę modową do logo",
      image: "/img/gucci.png",
      correctAnswer: "Gucci",
      options: ["Gucci", "Guess", "Fendi", "Giorgio Armani"],
    },
    {
      text: "Dopasuj markę modową do logo",
      image: "/img/michael-kors.png",
      correctAnswer: "Michael Kors",
      options: ["Michael Kors", "Calvin Klein", "DKNY", "Tommy Hilfiger"],
    },
    {
      text: "Dopasuj markę modową do logo",
      image: "/img/versace.png",
      correctAnswer: "Versace",
      options: ["Versace", "Hermès", "Balmain", "Roberto Cavalli"],
    },
  ];

  // Round 3: audio -> song title questions (fill audio paths/options when ready)
  private audioQuestionBank: Array<{
    text: string;
    audio: string;
    correctAnswer: string;
    options: string[];
  }> = [
    {
      text: "Jaka to melodia?",
      audio: "/music/Aerosmith - Cryin.MP3",
      correctAnswer: "Aerosmith - Cryin'",
      options: [
        "Aerosmith - Cryin'",
        "Guns N' Roses - November Rain",
        "Bon Jovi - Always",
        "Def Leppard - Hysteria",
      ],
    },
    {
      text: "Jaka to melodia?",
      audio: "/music/Benny Benassi Bross - Every Single Day.MP3",
      correctAnswer: "Benny Benassi Bros - Every Single Day",
      options: [
        "Benny Benassi Bros - Every Single Day",
        "ATB - 9 PM (Till I Come)",
        "Gigi D'Agostino - The Riddle",
        "Ian Van Dahl - Castles in the Sky",
      ],
    },
    {
      text: "Jaka to melodia?",
      audio: "/music/Christina Aguilera - Genie In A Bottle.MP3",
      correctAnswer: "Christina Aguilera - Genie In A Bottle",
      options: [
        "Christina Aguilera - Genie In A Bottle",
        "Britney Spears - Baby One More Time",
        "Jessica Simpson - I Wanna Love You Forever",
        "Mandy Moore - Candy",
      ],
    },
    {
      text: "Jaka to melodia?",
      audio: "/music/Da Hool - meet her at the Loveparade.MP3",
      correctAnswer: "Da Hool - Meet Her at the Love Parade",
      options: [
        "Da Hool - Meet Her at the Love Parade",
        "Darude - Sandstorm",
        "The Chemical Brothers - Hey Boy Hey Girl",
        "Zombie Nation - Kernkraft 400",
      ],
    },
    {
      text: "Jaka to melodia?",
      audio: "/music/Oasis - Wonderwall .MP3",
      correctAnswer: "Oasis - Wonderwall",
      options: [
        "Oasis - Wonderwall",
        "Blur - Song 2",
        "The Verve - Bitter Sweet Symphony",
        "Radiohead - Creep",
      ],
    },
  ];

  onCreate(options: any) {
    this.setState(new GameState());

    // Seed first question placeholder and round configuration
    this.state.currentQuestion = this.getRandomOrderQuestion();
    this.state.roundPoints.clear();
    this.state.roundTypes.clear();
    this.state.totalPossiblePoints = 0;

    console.log("GameRoom created!");

    // Handle player joining
    this.onMessage("join", (client, message) => {
      const player = new Player();
      player.nickname = message.nickname;
      this.state.players.set(client.sessionId, player);

      // Set host if nickname is "Seba"
      if (message.nickname === "Seba" && !this.state.hostId) {
        this.state.hostId = client.sessionId;
        this.broadcast("message", { text: "Seba jest hostem gry!" });
      }

      this.broadcast("message", { text: `${message.nickname} dołączył do gry!` });
    });

    // Handle game start (only host can start)
    this.onMessage("startGame", (client) => {
      if (client.sessionId !== this.state.hostId) {
        client.send("error", { message: "Tylko host może rozpocząć grę!" });
        return;
      }

      if (this.state.players.size < 2) {
        client.send("error", { message: "Potrzeba przynajmniej 2 graczy!" });
        return;
      }

      // Reset rounds and points
      this.state.completedQuestions.clear();
      this.state.currentRound = 1;
      this.configureRounds();

      // Pick a fresh random question for round 1
      this.startOrderRound();
      this.state.gamePhase = "playing";
      this.state.questionStartTime = Date.now();
      this.state.players.forEach((player) => {
        player.answers.clear();
        player.hasSubmitted = false;
        player.score = 0;
        player.lastRoundScore = 0;
        player.selectedOption = "";
        const shuffled = this.shuffleArray([...this.state.currentQuestion.answers]);
        shuffled.forEach(answer => player.answers.push(answer));
      });

      this.broadcast("message", { text: "Gra rozpoczęta! Runda 1: ustaw kolejność odpowiedzi!" });
    });

    // Handle answer submission
    this.onMessage("submitAnswers", (client, message) => {
      if (this.state.gamePhase !== "playing") {
        return;
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.currentQuestion.type === "order") {
        player.answers.clear();
        message.answers.forEach((answer: string) => player.answers.push(answer));
        player.hasSubmitted = true;

        let score = 0;
        for (let i = 0; i < player.answers.length; i++) {
          if (player.answers[i] === this.state.currentQuestion.correctOrder[i]) {
            score++;
          }
        }
        player.lastRoundScore = score;
        player.score += score;
        this.sendOrderResult(client, player);
      } else if (this.state.currentQuestion.type === "logo") {
        const selected = message.selected as string;
        player.selectedOption = selected;
        player.hasSubmitted = true;
        const gained = selected === this.state.currentQuestion.correctAnswer ? 1 : 0;
        player.lastRoundScore = gained;
        player.score += gained;
        // Don't send result immediately - wait for all players
      } else if (this.state.currentQuestion.type === "audio") {
        const selected = message.selected as string;
        player.selectedOption = selected;
        player.hasSubmitted = true;
        const gained = selected === this.state.currentQuestion.correctAnswer ? 1 : 0;
        player.lastRoundScore = gained;
        player.score += gained;
        // Don't send result immediately - wait for all players
      }

      // Check if all players submitted
      const allSubmitted = Array.from(this.state.players.values()).every(p => p.hasSubmitted);
      if (allSubmitted) {
        this.state.completedQuestions.push(this.cloneQuestion(this.state.currentQuestion));

        // Send results to all players now that everyone has submitted
        this.state.players.forEach((p, sessionId) => {
          const client = Array.from(this.clients).find(c => c.sessionId === sessionId);
          if (client && (this.state.currentQuestion.type === "logo" || this.state.currentQuestion.type === "audio")) {
            this.sendSingleChoiceResult(client, p.lastRoundScore, p.selectedOption);
          }
        });

        // Wait 5 seconds before moving to next round so players can see the correct answer
        this.clock.setTimeout(() => {
          if (this.state.currentRound < this.state.totalRounds) {
            this.state.currentRound += 1;
            this.startRoundByType(this.state.roundTypes[this.state.currentRound - 1]);
          } else {
            this.state.gamePhase = "results";
            // No toast message - just move to results screen
          }
        }, 5000);
      }
    });

    // Host-controlled audio playback
    this.onMessage("audioControl", (client, message) => {
      if (client.sessionId !== this.state.hostId) {
        client.send("error", { message: "Tylko host może sterować odtwarzaniem!" });
        return;
      }
      this.broadcast("audioControl", { action: message.action });
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.broadcast("message", { text: `${player.nickname} opuścił grę!` });
      this.state.players.delete(client.sessionId);
    }

    // If host left, assign new host
    if (client.sessionId === this.state.hostId) {
      const remainingPlayers = Array.from(this.state.players.keys());
      if (remainingPlayers.length > 0) {
        this.state.hostId = remainingPlayers[0];
        const newHost = this.state.players.get(this.state.hostId);
        if (newHost) {
          this.broadcast("message", { text: `${newHost.nickname} jest teraz hostem!` });
        }
      }
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private shuffleArray(array: any[]) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getRandomOrderQuestion(): Question {
    const source =
      this.orderQuestionBank[Math.floor(Math.random() * this.orderQuestionBank.length)];
    const question = new Question();
    question.text = source.text;
    question.type = "order";
    source.correctOrder.forEach((answer) => {
      question.answers.push(answer);
      question.correctOrder.push(answer);
    });
    return question;
  }

  private getRandomLogoQuestion(): Question {
    const source =
      this.logoQuestionBank[Math.floor(Math.random() * this.logoQuestionBank.length)];
    const question = new Question();
    question.text = source.text;
    question.type = "logo";
    question.image = source.image;
    question.correctAnswer = source.correctAnswer;
    source.options.forEach((option: string) => {
      question.answers.push(option);
    });
    return question;
  }

  private startLogoRound() {
    this.state.currentQuestion = this.getRandomLogoQuestion();
    this.state.questionStartTime = Date.now();

    this.state.players.forEach((player) => {
      player.answers.clear();
      player.hasSubmitted = false;
      player.selectedOption = "";
      const shuffled = this.shuffleArray([...this.state.currentQuestion.answers]);
      shuffled.forEach((answer) => player.answers.push(answer));
    });

    this.broadcast("message", { text: "Runda 2: dobierz klub do herbu!" });
  }

  private startAudioRound() {
    this.state.currentQuestion = this.getRandomAudioQuestion();
    this.state.questionStartTime = Date.now();

    this.state.players.forEach((player) => {
      player.answers.clear();
      player.hasSubmitted = false;
      player.selectedOption = "";
      const shuffled = this.shuffleArray([...this.state.currentQuestion.answers]);
      shuffled.forEach((answer) => player.answers.push(answer));
    });

    this.broadcast("message", { text: "Runda 3: jaka to melodia?" });
  }

  private startOrderRound() {
    this.state.currentQuestion = this.getRandomOrderQuestion();
    this.state.questionStartTime = Date.now();

    this.state.players.forEach((player) => {
      player.answers.clear();
      player.hasSubmitted = false;
      player.lastRoundScore = 0;
      player.selectedOption = "";
      const shuffled = this.shuffleArray([...this.state.currentQuestion.answers]);
      shuffled.forEach((answer) => player.answers.push(answer));
    });
  }

  private startRoundByType(type: string) {
    if (type === "order") {
      this.startOrderRound();
    } else if (type === "logo") {
      this.startLogoRound();
    } else if (type === "audio") {
      this.startAudioRound();
    }
  }

  private cloneQuestion(source: Question): Question {
    const q = new Question();
    q.text = source.text;
    q.type = source.type;
    q.image = source.image;
    q.audio = source.audio;
    q.correctAnswer = source.correctAnswer;
    source.answers.forEach((a) => q.answers.push(a));
    source.correctOrder.forEach((a) => q.correctOrder.push(a));
    return q;
  }

  private getRandomAudioQuestion(): Question {
    if (this.audioQuestionBank.length === 0) {
      const fallback = new Question();
      fallback.text = "Dodaj pytania audio do audioQuestionBank.";
      fallback.type = "audio";
      fallback.audio = "";
      fallback.correctAnswer = "Brak pytania audio";
      fallback.answers.push("Brak opcji");
      return fallback;
    }
    const source =
      this.audioQuestionBank[Math.floor(Math.random() * this.audioQuestionBank.length)];
    const question = new Question();
    question.text = source.text;
    question.type = "audio";
    question.audio = source.audio;
    question.correctAnswer = source.correctAnswer;
    source.options.forEach((option: string) => {
      question.answers.push(option);
    });
    return question;
  }

  private sendOrderResult(client: Client, player: Player) {
    const perPosition: number[] = [];
    let gained = 0;
    for (let i = 0; i < player.answers.length; i++) {
      if (player.answers[i] === this.state.currentQuestion.correctOrder[i]) {
        perPosition.push(1);
        gained += 1;
      } else {
        perPosition.push(0);
      }
    }
    client.send("submissionResult", {
      questionType: "order",
      pointsEarned: gained,
      perPosition,
      correctOrder: [...this.state.currentQuestion.correctOrder],
      totalScore: player.score,
    });
  }

  private sendSingleChoiceResult(
    client: Client,
    points: number,
    selected: string
  ) {
    client.send("submissionResult", {
      questionType: this.state.currentQuestion.type,
      pointsEarned: points,
      correctAnswer: this.state.currentQuestion.correctAnswer,
      selected,
      totalScore: client.sessionId ? this.state.players.get(client.sessionId)?.score ?? 0 : 0,
    });
  }

  private configureRounds() {
    this.state.roundTypes.clear();
    this.state.roundPoints.clear();

    // Round 1: ordering (4 points)
    this.state.roundTypes.push("order");
    this.state.roundPoints.push(4);

    // Round 2: logo (1 point)
    this.state.roundTypes.push("logo");
    this.state.roundPoints.push(1);

    // Round 3: audio (1 point) only if questions provided
    if (this.audioQuestionBank.length > 0) {
      this.state.roundTypes.push("audio");
      this.state.roundPoints.push(1);
    }

    this.state.totalRounds = this.state.roundTypes.length;
    this.state.totalPossiblePoints = this.state.roundPoints.reduce(
      (sum, value) => sum + value,
      0
    );
  }
}
