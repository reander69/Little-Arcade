const gameContent = document.querySelector("#game-content");
const panelGameName = document.querySelector("#panel-game-name");
const gameButtons = [...document.querySelectorAll(".game-card")];

let secretNumber = randomInteger(1, 100);
let guesses = 0;
let guessFinished = false;
let rpsScore = { wins: 0, losses: 0, draws: 0 };
let mathScore = 0;
let mathTimeLeft = 30;
let mathTimer = null;
let mathAnswer = 0;
let mathRunning = false;

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function selectGame(game) {
  gameButtons.forEach((button) => {
    const selected = button.dataset.game === game;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  if (mathTimer) {
    window.clearInterval(mathTimer);
    mathTimer = null;
    mathRunning = false;
    mathTimeLeft = 30;
  }

  const titles = {
    guess: "NUMBER GUESS",
    rps: "ROCK PAPER SCISSORS",
    math: "QUICK MATH",
  };
  panelGameName.textContent = titles[game];

  if (game === "guess") renderGuessGame();
  if (game === "rps") renderRpsGame();
  if (game === "math") renderMathGame();
}

function renderGuessGame(feedback = "", feedbackClass = "") {
  gameContent.innerHTML = `
    <div class="game-view">
      <h3 class="game-heading">I'm thinking of a number...</h3>
      <p class="game-subheading">Can you guess it? It's somewhere between 1 and 100.</p>
      <form class="guess-form" id="guess-form">
        <label class="visually-hidden" for="guess-input">Your guess, from 1 to 100</label>
        <input class="guess-input" id="guess-input" type="number" min="1" max="100" placeholder="?" required ${guessFinished ? "disabled" : ""} />
        <button class="primary-button" type="submit" ${guessFinished ? "disabled" : ""}>Take a guess <span aria-hidden="true">↗</span></button>
      </form>
      <p class="game-feedback ${feedbackClass}" id="guess-feedback" role="status" aria-live="polite">${feedback}</p>
      <div class="guess-stats">
        <div class="stat"><span class="stat-label">GUESSES</span><span class="stat-value">${guesses}</span></div>
        <div class="stat"><span class="stat-label">RANGE</span><span class="stat-value">1 — 100</span></div>
      </div>
      ${guessFinished ? '<div class="guess-reset"><button class="secondary-button" id="guess-reset" type="button">Play again ↻</button></div>' : ""}
    </div>
  `;

  document.querySelector("#guess-form").addEventListener("submit", handleGuess);
  if (guessFinished) {
    document.querySelector("#guess-reset").addEventListener("click", resetGuessGame);
  } else {
    document.querySelector("#guess-input").focus({ preventScroll: true });
  }
}

function handleGuess(event) {
  event.preventDefault();
  const input = document.querySelector("#guess-input");
  const guess = Number(input.value);
  const feedback = document.querySelector("#guess-feedback");

  if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
    feedback.textContent = "Enter a whole number from 1 to 100.";
    feedback.className = "game-feedback error";
    input.focus();
    return;
  }

  guesses += 1;
  if (guess === secretNumber) {
    guessFinished = true;
    renderGuessGame(`You got it in ${guesses} ${guesses === 1 ? "guess" : "guesses"}! Nice one.`, "success");
    return;
  }

  const hint = guess < secretNumber ? "Too low — try a little higher!" : "Too high — try a little lower!";
  renderGuessGame(hint);
  document.querySelector("#guess-input").focus({ preventScroll: true });
}

function resetGuessGame() {
  secretNumber = randomInteger(1, 100);
  guesses = 0;
  guessFinished = false;
  renderGuessGame();
}

function renderRpsGame(result = "Pick your move to start!", resultIcon = "✊") {
  gameContent.innerHTML = `
    <div class="game-view">
      <h3 class="game-heading">Ready, set, throw!</h3>
      <p class="game-subheading">Can you beat the computer? First to five is a good streak.</p>
      <div class="rps-score" aria-label="Score">
        <span class="score-chip">YOU<strong>${rpsScore.wins}</strong></span>
        <span class="score-chip">TIES<strong>${rpsScore.draws}</strong></span>
        <span class="score-chip">CPU<strong>${rpsScore.losses}</strong></span>
      </div>
      <div class="rps-result" role="status" aria-live="polite">
        <span class="rps-result-icon" aria-hidden="true">${resultIcon}</span>
        <span class="rps-result-text"><strong>${result}</strong>Choose your move below.</span>
      </div>
      <div class="choice-row" aria-label="Choose rock, paper, or scissors">
        <button class="choice-button" type="button" data-move="rock" aria-label="Rock">✊</button>
        <button class="choice-button" type="button" data-move="paper" aria-label="Paper">✋</button>
        <button class="choice-button" type="button" data-move="scissors" aria-label="Scissors">✌</button>
      </div>
    </div>
  `;
  document.querySelectorAll(".choice-button").forEach((button) => {
    button.addEventListener("click", () => playRps(button.dataset.move));
  });
}

function playRps(playerMove) {
  const moves = ["rock", "paper", "scissors"];
  const icons = { rock: "✊", paper: "✋", scissors: "✌" };
  const computerMove = moves[randomInteger(0, moves.length - 1)];
  let outcome;

  if (playerMove === computerMove) {
    rpsScore.draws += 1;
    outcome = "It's a tie!";
  } else if (
    (playerMove === "rock" && computerMove === "scissors") ||
    (playerMove === "paper" && computerMove === "rock") ||
    (playerMove === "scissors" && computerMove === "paper")
  ) {
    rpsScore.wins += 1;
    outcome = "You win this round!";
  } else {
    rpsScore.losses += 1;
    outcome = "Computer wins this round.";
  }

  renderRpsGame(`${outcome} ${icons[playerMove]} vs ${icons[computerMove]}`, icons[playerMove]);
}

function renderMathGame() {
  const gameOver = mathTimeLeft === 0;
  gameContent.innerHTML = `
    <div class="game-view">
      <div class="math-top">
        <div>
          <h3 class="game-heading">A little brain sprint</h3>
          <p class="game-subheading">Solve as many as you can in 30 seconds.</p>
        </div>
        <span class="timer-badge ${mathTimeLeft <= 5 ? "urgent" : ""}" id="math-timer">${mathTimeLeft}s</span>
      </div>
      <div class="math-problem" id="math-problem">${mathRunning ? `${mathProblemText}` : gameOver ? `Score: ${mathScore}` : "Ready?"}</div>
      ${mathRunning ? `
        <form class="math-form" id="math-form">
          <label class="visually-hidden" for="math-input">Your answer</label>
          <input class="math-input" id="math-input" type="number" inputmode="numeric" autocomplete="off" placeholder="Answer" required />
          <button class="primary-button" type="submit">Check ↗</button>
        </form>
      ` : ""}
      <p class="math-feedback" id="math-feedback" role="status" aria-live="polite">${gameOver ? `You got ${mathScore} ${mathScore === 1 ? "answer" : "answers"} right. Want another go?` : mathRunning ? " " : "No calculators, just vibes."}</p>
      ${!mathRunning ? `<div class="math-start-row"><button class="primary-button" id="math-start" type="button">${gameOver ? "Play again ↻" : "Start the clock ↗"}</button></div>` : ""}
    </div>
  `;

  if (mathRunning) {
    document.querySelector("#math-form").addEventListener("submit", handleMathAnswer);
    document.querySelector("#math-input").focus({ preventScroll: true });
  } else {
    document.querySelector("#math-start").addEventListener("click", startMathGame);
  }
}

let mathProblemText = "";

function newMathProblem() {
  const operation = randomInteger(0, 1);
  let left = randomInteger(2, 20);
  let right = randomInteger(2, 20);

  if (operation === 0) {
    mathAnswer = left + right;
    mathProblemText = `${left} + ${right}`;
  } else {
    if (right > left) [left, right] = [right, left];
    mathAnswer = left - right;
    mathProblemText = `${left} − ${right}`;
  }
}

function startMathGame() {
  mathScore = 0;
  mathTimeLeft = 30;
  mathRunning = true;
  newMathProblem();
  renderMathGame();
  mathTimer = window.setInterval(() => {
    mathTimeLeft -= 1;
    if (mathTimeLeft <= 0) {
      mathTimeLeft = 0;
      window.clearInterval(mathTimer);
      mathTimer = null;
      mathRunning = false;
      renderMathGame();
      return;
    }
    const timer = document.querySelector("#math-timer");
    timer.textContent = `${mathTimeLeft}s`;
    timer.classList.toggle("urgent", mathTimeLeft <= 5);
  }, 1000);
}

function handleMathAnswer(event) {
  event.preventDefault();
  const input = document.querySelector("#math-input");
  const feedback = document.querySelector("#math-feedback");
  if (Number(input.value) === mathAnswer) {
    mathScore += 1;
    feedback.textContent = "That's right! Keep going.";
    feedback.className = "math-feedback success";
    newMathProblem();
    document.querySelector("#math-problem").textContent = mathProblemText;
    input.value = "";
    input.focus();
  } else {
    feedback.textContent = "Not quite — give it another try!";
    feedback.className = "math-feedback";
    input.select();
  }
}

gameButtons.forEach((button) => {
  button.addEventListener("click", () => selectGame(button.dataset.game));
});

renderGuessGame();
