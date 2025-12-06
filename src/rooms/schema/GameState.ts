import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") nickname: string = "";
  @type("number") score: number = 0;
  @type("number") lastRoundScore: number = 0;
  @type(["string"]) answers: ArraySchema<string> = new ArraySchema<string>();
  @type("boolean") hasSubmitted: boolean = false;
  @type("string") selectedOption: string = "";
}

export class Question extends Schema {
  @type("string") text: string = "";
  @type("string") type: string = "order"; // order, logo, audio
  @type("string") image: string = "";
  @type("string") audio: string = "";
  @type("string") correctAnswer: string = "";
  @type(["string"]) answers: ArraySchema<string> = new ArraySchema<string>();
  @type(["string"]) correctOrder: ArraySchema<string> = new ArraySchema<string>();
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gamePhase: string = "lobby"; // lobby, playing, results
  @type(Question) currentQuestion: Question = new Question();
  @type("number") questionStartTime: number = 0;
  @type("string") hostId: string = "";
  @type("number") currentRound: number = 1;
  @type("number") totalRounds: number = 2;
  @type(["number"]) roundPoints: ArraySchema<number> = new ArraySchema<number>();
  @type(["string"]) roundTypes: ArraySchema<string> = new ArraySchema<string>();
  @type(["string"]) completedAnswers: ArraySchema<string> = new ArraySchema<string>();
  @type([Question]) completedQuestions: ArraySchema<Question> = new ArraySchema<Question>();
  @type("number") totalPossiblePoints: number = 0;
}
