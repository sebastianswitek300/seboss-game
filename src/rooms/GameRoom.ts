import { Room, Client } from "colyseus";
import { GameState, Player, Question } from "./schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 6;
  private questionSequence: Question[] = [];
  private questionIndex = 0;
  private questionTimer: any = null;
  private resultsRevealed = false;
  // Round 1: ordering questions — conspiracy & UFO themed
  private orderQuestionBank = [
    {
      text: "Najpopularniejsze teorie spiskowe wg liczby wyznawców",
      correctOrder: [
        "Lądowanie na Księżycu było sfałszowane",
        "Ziemia jest płaska",
        "Illuminati rządzą światem",
        "Reptilianie wśród nas",
      ],
    },
    {
      text: "Co rząd ukrywa w Strefie 51?",
      correctOrder: [
        "Rozbity statek UFO",
        "Ciała kosmitów",
        "Broń przyszłości",
        "Przepis na Coca-Colę",
      ],
    },
    {
      text: "Co się dzieje podczas porwania przez kosmitów?",
      correctOrder: [
        "Jasne światło z nieba",
        "Lewitacja do statku",
        "Badania na stole operacyjnym",
        "Wymazanie pamięci",
      ],
    },
    {
      text: "Jak rozpoznać reptilianina?",
      correctOrder: [
        "Pionowe źrenice",
        "Zimna skóra dłoni",
        "Nigdy nie mruga",
        "Nie je czosnku",
      ],
    },
    {
      text: "Etapy wtajemniczenia w Illuminati",
      correctOrder: [
        "Zaproszenie na tajne spotkanie",
        "Przysięga milczenia",
        "Tatuaż z okiem opatrzności",
        "Kontrola jednego banku centralnego",
      ],
    },
    {
      text: "Dowody płaskoziemców na to, że Ziemia jest płaska",
      correctOrder: [
        "Horyzont wygląda na płaski",
        "Woda nie zakrzywia się",
        "Samoloty nie latają do góry nogami",
        "Pingwiny pilnują krawędzi",
      ],
    },
    {
      text: "Co naprawdę jest na ciemnej stronie Księżyca?",
      correctOrder: [
        "Baza kosmitów",
        "Opuszczone miasto",
        "Nadajnik kontroli umysłów",
        "Parking IKEA",
      ],
    },
    {
      text: "Teorie o Trójkącie Bermudzkim — co tam jest?",
      correctOrder: [
        "Portal do innego wymiaru",
        "Podwodna baza UFO",
        "Zatopiona Atlantyda",
        "Gigantyczny magnes",
      ],
    },
    {
      text: "Jak Illuminati kontrolują ludzkość?",
      correctOrder: [
        "Media i telewizja",
        "System edukacji",
        "Fluorek w wodzie",
        "Ukryte przekazy w muzyce pop",
      ],
    },
  ];

  // Round 2: famous movie scene -> title questions
  private logoQuestionBank = [
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/5-element.jpg",
      correctAnswer: "Piaty Element",
      options: [
        "Piaty Element",
        "Blade Runner",
        "Total Recall",
        "Gattaca",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/dzien-niepodleglosci.jpg",
      correctAnswer: "Dzien Niepodleglosci",
      options: [
        "Dzien Niepodleglosci",
        "Wojna swiatow",
        "Marsjanin",
        "Bitwa o Los Angeles",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/faceci-w-czerni.webp",
      correctAnswer: "Faceci w czerni",
      options: [
        "Faceci w czerni",
        "Dzien Niepodleglosci",
        "Matrix",
        "Piaty Element",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/marsjanie-atakuja.jpg",
      correctAnswer: "Marsjanie atakuja!",
      options: [
        "Marsjanie atakuja!",
        "Inwazja porywaczy cial",
        "Plan 9 z kosmosu",
        "Faceci w czerni",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/obcy.png",
      correctAnswer: "Obcy — 8. pasazer Nostromo",
      options: [
        "Obcy — 8. pasazer Nostromo",
        "Predator",
        "Cos (The Thing)",
        "Zycie (Life)",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/star-wars.jpeg",
      correctAnswer: "Gwiezdne wojny",
      options: [
        "Gwiezdne wojny",
        "Star Trek",
        "Battlestar Galactica",
        "Dune",
      ],
    },
    {
      text: "Rozpoznaj film po slynnej scenie",
      image: "/img/znaki.png",
      correctAnswer: "Znaki (Signs)",
      options: [
        "Znaki (Signs)",
        "Szosty zmysl",
        "Bliskie spotkania trzeciego stopnia",
        "Pojawienie sie (The Happening)",
      ],
    },
  ];

  // Round 3: audio -> sci-fi/conspiracy theme songs
  private audioQuestionBank: Array<{
    text: string;
    audio: string;
    correctAnswer: string;
    options: string[];
  }> = [
    {
      text: "Rozpoznaj motyw muzyczny",
      audio: "/music/x-files.mp3",
      correctAnswer: "Z Archiwum X (The X-Files)",
      options: [
        "Z Archiwum X (The X-Files)",
        "Stranger Things",
        "Twin Peaks",
        "Nie do wiary (TVN)",
      ],
    },
    {
      text: "Rozpoznaj motyw muzyczny",
      audio: "/music/interstellar.MP3",
      correctAnswer: "Interstellar (Hans Zimmer)",
      options: [
        "Interstellar (Hans Zimmer)",
        "Incepcja (Hans Zimmer)",
        "2001: Odyseja kosmiczna",
        "Grawitacja",
      ],
    },
    {
      text: "Rozpoznaj motyw muzyczny",
      audio: "/music/Men in black.MP3",
      correctAnswer: "Men in Black (Will Smith)",
      options: [
        "Men in Black (Will Smith)",
        "Ghostbusters (Ray Parker Jr.)",
        "Wild Wild West (Will Smith)",
        "Bad Boys (Inner Circle)",
      ],
    },
    {
      text: "Rozpoznaj motyw muzyczny",
      audio: "/music/odyseja-kosmiczna.MP3",
      correctAnswer: "2001: Odyseja kosmiczna",
      options: [
        "2001: Odyseja kosmiczna",
        "Interstellar (Hans Zimmer)",
        "Star Trek",
        "Gwiezdne wojny",
      ],
    },
    {
      text: "Rozpoznaj motyw muzyczny",
      audio: "/music/Nie do Wiary.mp3",
      correctAnswer: "Nie do wiary (TVN)",
      options: [
        "Nie do wiary (TVN)",
        "Z Archiwum X (The X-Files)",
        "Galileo (ProSieben)",
        "Wędrowycz — Na tropie zjawisk nadprzyrodzonych",
      ],
    },
  ];

  onCreate(options: any) {
    this.setState(new GameState());

    // Seed first question placeholder and round configuration
    this.state.currentQuestion = this.questionSequence[this.questionIndex];
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

      // Pick a fresh question for round 1
      this.loadQuestion(this.questionSequence[this.questionIndex]);
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

    // Handle answer submission — score is calculated but results are NOT sent yet.
    // Results are revealed only when the 20s question timer fires.
    this.onMessage("submitAnswers", (client, message) => {
      if (this.state.gamePhase !== "playing") {
        return;
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.hasSubmitted) return; // prevent double submit

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
        // Don't send result yet — wait for 20s timer
      } else if (this.state.currentQuestion.type === "logo") {
        const selected = message.selected as string;
        player.selectedOption = selected;
        player.hasSubmitted = true;
        const gained = selected === this.state.currentQuestion.correctAnswer ? 1 : 0;
        player.lastRoundScore = gained;
        player.score += gained;
      } else if (this.state.currentQuestion.type === "audio") {
        const selected = message.selected as string;
        player.selectedOption = selected;
        player.hasSubmitted = true;
        const gained = selected === this.state.currentQuestion.correctAnswer ? 1 : 0;
        player.lastRoundScore = gained;
        player.score += gained;
      }
      // Results are revealed by the 20s timer in loadQuestion, not here.
    });

    // Host-controlled audio playback
    this.onMessage("audioControl", (client, message) => {
      if (client.sessionId !== this.state.hostId) {
        client.send("error", { message: "Tylko host może sterować odtwarzaniem!" });
        return;
      }
      this.broadcast("audioControl", { action: message.action });
    });

    // Host controls flow: first click reveals answers, second click advances
    this.onMessage("nextQuestion", (client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.gamePhase !== "playing") return;

      if (!this.resultsRevealed) {
        // First click: reveal correct answers
        this.revealResults();
      } else {
        // Second click: advance to next question
        this.advanceQuestion();
      }
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

  private createOrderQuestion(source: { text: string; correctOrder: string[] }): Question {
    const question = new Question();
    question.text = source.text;
    question.type = "order";
    source.correctOrder.forEach((answer) => {
      question.answers.push(answer);
      question.correctOrder.push(answer);
    });
    return question;
  }

  private createLogoQuestion(source: { text: string; image: string; correctAnswer: string; options: string[] }): Question {
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

  private createAudioQuestion(source: { text: string; audio: string; correctAnswer: string; options: string[] }): Question {
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

  private getFallbackQuestion(type: string): Question {
    const fallback = new Question();
    fallback.text = "Brak pytań";
    fallback.type = type;
    fallback.correctAnswer = "Brak";
    fallback.answers.push("Brak opcji");
    return fallback;
  }

  private loadQuestion(question: Question | undefined) {
    const q = question ? this.cloneQuestion(question) : this.getFallbackQuestion("order");
    this.state.currentQuestion = q;
    this.state.questionStartTime = Date.now();
    this.state.currentRound = this.questionIndex + 1;

    this.state.players.forEach((player) => {
      player.answers.clear();
      player.hasSubmitted = false;
      player.lastRoundScore = 0;
      player.selectedOption = "";
      const shuffled = this.shuffleArray([...q.answers]);
      shuffled.forEach((answer) => player.answers.push(answer));
    });

    // No auto-advance timer — host controls when to move to next question
  }

  private revealResults() {
    this.resultsRevealed = true;
    this.state.completedQuestions.push(this.cloneQuestion(this.state.currentQuestion));

    // Send results to ALL players
    this.state.players.forEach((p, sessionId) => {
      const client = Array.from(this.clients).find(c => c.sessionId === sessionId);
      if (!client) return;
      if (this.state.currentQuestion.type === "order") {
        this.sendOrderResult(client, p);
      } else {
        this.sendSingleChoiceResult(client, p.lastRoundScore, p.selectedOption);
      }
    });
  }

  private advanceQuestion() {
    this.resultsRevealed = false;
    if (this.questionIndex + 1 < this.questionSequence.length) {
      this.questionIndex += 1;
      this.loadQuestion(this.questionSequence[this.questionIndex]);
    } else {
      this.state.gamePhase = "results";
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

    // Build linear sequence with all questions, shuffled across all types
    const allQuestions: Question[] = [
      ...this.orderQuestionBank.map((q) => this.createOrderQuestion(q)),
      ...this.logoQuestionBank.map((q) => this.createLogoQuestion(q)),
      ...this.audioQuestionBank.map((q) => this.createAudioQuestion(q)),
    ];
    this.questionSequence = this.shuffleArray(allQuestions);
    this.questionIndex = 0;

    this.state.roundTypes.push(...this.questionSequence.map((q) => q.type));
    this.state.roundPoints.push(
      ...this.questionSequence.map((q) => (q.type === "order" ? 4 : 1))
    );

    this.state.totalRounds = this.state.roundTypes.length;
    this.state.totalPossiblePoints = this.state.roundPoints.reduce((sum, v) => sum + v, 0);
  }
}
