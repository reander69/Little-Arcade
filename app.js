const gameContent = document.querySelector("#game-content");
const panelGameName = document.querySelector("#panel-game-name");
const gameButtons = [...document.querySelectorAll(".game-card")];
const levelButtons = [...document.querySelectorAll(".level-button")];
const startScreen = document.querySelector("#start-screen");
const startGameButton = document.querySelector("#start-game-btn");
const soundToggle = document.querySelector(".sound-toggle");
const mascotBubble = document.querySelector("#mascot-bubble");

let secretNumber = randomInteger(1, 100);
let soundEnabled = true;
let currentLevel = 1;
let musicTimer = null;
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

function playTone(frequency, duration, type = "sine", volume = 0.04, slide = 0) {
  if (!soundEnabled) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  if (slide) {
    oscillator.frequency.linearRampToValueAtTime(frequency + slide, context.currentTime + duration);
  }

  gainNode.gain.value = volume;
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.onended = () => context.close();
}

function playButtonSound() {
  playTone(440, 0.08, "triangle", 0.03, 60);
}

function playWinSound() {
  playTone(660, 0.12, "triangle", 0.04, 80);
  setTimeout(() => playTone(880, 0.14, "triangle", 0.035, 100), 80);
}

function playWrongSound() {
  playTone(180, 0.12, "sawtooth", 0.03, -40);
}

function setupSoundToggle() {
  if (!soundToggle) return;

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
    soundToggle.setAttribute("aria-label", soundEnabled ? "Sound on" : "Sound off");
    if (soundEnabled) {
      playButtonSound();
      if (!musicTimer) startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  });
}

function startBackgroundMusic() {
  if (!soundEnabled || musicTimer) return;

  const melody = [392, 523, 659, 523, 587, 659, 784, 659];
  let step = 0;

  musicTimer = window.setInterval(() => {
    const note = melody[step % melody.length];
    playTone(note, 0.16, "triangle", 0.015, 20);
    step += 1;
  }, 360);
}

function stopBackgroundMusic() {
  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

function triggerMascotCheer(message = "Yay!") {
  if (!mascotBubble) return;
  mascotBubble.textContent = message;
  mascotBubble.classList.remove("mascot-cheer");
  void mascotBubble.offsetWidth;
  mascotBubble.classList.add("mascot-cheer");
}

function createConfettiBurst() {
  const layer = document.querySelector(".confetti-layer") || document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  const colors = ["#ff7eb6", "#ffd76a", "#7ee8b8", "#8cc7ff", "#c59bff", "#ff9d6c"];
  for (let i = 0; i < 26; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 220}px`);
    piece.style.animationDelay = `${i * 0.03}s`;
    layer.appendChild(piece);
  }

  window.setTimeout(() => {
    layer.remove();
  }, 2000);
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
    guess: "GUESS THE NUMBER",
    rps: "ROCK PAPER SCISSORS",
    math: "FAST MATH",
  };
  panelGameName.textContent = titles[game];

  if (game === "guess") {
    const { max } = getGuessRange();
    secretNumber = randomInteger(1, max);
    guesses = 0;
    guessFinished = false;
    renderGuessGame();
  }
  if (game === "rps") renderRpsGame();
  if (game === "math") renderMathGame();
}

function getGuessRange() {
  if (currentLevel === 1) return { min: 1, max: 20 };
  if (currentLevel === 2) return { min: 1, max: 50 };
  return { min: 1, max: 100 };
}

function renderGuessGame(feedback = "", feedbackClass = "") {
  const { min, max } = getGuessRange();
  const rangeLabel = `${min} — ${max}`;
  const inputLabel = `Your guess, from ${min} to ${max}`;

  gameContent.innerHTML = `
    <div class="game-view">
      <h3 class="game-heading">I am thinking of a number!</h3>
      <p class="game-subheading">Can you find it? It is between ${min} and ${max}.</p>
      <form class="guess-form" id="guess-form">
        <label class="visually-hidden" for="guess-input">${inputLabel}</label>
        <input class="guess-input" id="guess-input" type="number" min="${min}" max="${max}" placeholder="?" required ${guessFinished ? "disabled" : ""} />
        <button class="primary-button" type="submit" ${guessFinished ? "disabled" : ""}>Guess! <span aria-hidden="true">↗</span></button>
      </form>
      <p class="game-feedback ${feedbackClass}" id="guess-feedback" role="status" aria-live="polite">${feedback}</p>
      <div class="guess-stats">
        <div class="stat"><span class="stat-label">TRIES</span><span class="stat-value">${guesses}</span></div>
        <div class="stat"><span class="stat-label">RANGE</span><span class="stat-value">${rangeLabel}</span></div>
      </div>
      ${guessFinished ? '<div class="guess-reset"><button class="secondary-button" id="guess-reset" type="button">Try another round ↻</button></div>' : ""}
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
  const { min, max } = getGuessRange();

  if (!Number.isInteger(guess) || guess < min || guess > max) {
    feedback.textContent = `Oops! Pick a whole number from ${min} to ${max}.`;
    feedback.className = "game-feedback error";
    input.focus();
    return;
  }

  guesses += 1;
  if (guess === secretNumber) {
    guessFinished = true;
    triggerMascotCheer("Yay!");
    createConfettiBurst();
    playWinSound();
    renderGuessGame(`Yay! You found it in ${guesses} ${guesses === 1 ? "try" : "tries"}! Great job!`, "success");
    return;
  }

  playWrongSound();
  const hint = guess < secretNumber ? "Too low! Try a bigger number." : "Too high! Try a smaller number.";
  renderGuessGame(hint);
  document.querySelector("#guess-input").focus({ preventScroll: true });
}

function resetGuessGame() {
  const { max } = getGuessRange();
  secretNumber = randomInteger(1, max);
  guesses = 0;
  guessFinished = false;
  renderGuessGame();
}

function renderRpsGame(result = "Pick a move to play!", resultIcon = "✊", round = null) {
  const icons = { rock: "✊", paper: "✋", scissors: "✌" };
  const playerIcon = round ? icons[round.playerMove] : "✊";
  const computerIcon = round ? icons[round.computerMove] : "✊";
  gameContent.innerHTML = `
    <div class="game-view">
      <h3 class="game-heading">Ready to play?</h3>
      <p class="game-subheading">Choose your hand and see if you can beat the computer!</p>
      <div class="rps-score" aria-label="Score">
        <span class="score-chip">YOU<strong>${rpsScore.wins}</strong></span>
        <span class="score-chip">TIES<strong>${rpsScore.draws}</strong></span>
        <span class="score-chip">CPU<strong>${rpsScore.losses}</strong></span>
      </div>
      <div class="rps-arena ${round ? "rps-reveal" : ""}" id="rps-arena" aria-label="${round ? `You played ${round.playerMove}; computer played ${round.computerMove}` : "Hands ready"}">
        <div class="rps-hand-card player-hand">
          <span class="rps-hand-label">YOU</span>
          <span class="rps-hand" id="player-hand" aria-hidden="true">${playerIcon}</span>
        </div>
        <span class="rps-versus" aria-hidden="true">VS</span>
        <div class="rps-hand-card computer-hand">
          <span class="rps-hand-label">COMPUTER</span>
          <span class="rps-hand" id="computer-hand" aria-hidden="true">${computerIcon}</span>
        </div>
        <span class="rps-countdown" id="rps-countdown" aria-live="polite">${round ? "GO!" : "Ready?"}</span>
      </div>
      <div class="rps-result" role="status" aria-live="polite">
        <span class="rps-result-icon" aria-hidden="true">${resultIcon}</span>
        <span class="rps-result-text"><strong>${result}</strong>${round ? "Pick again for another round!" : "Choose your move below!"}</span>
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

async function playRps(playerMove) {
  const arena = document.querySelector("#rps-arena");
  const countdown = document.querySelector("#rps-countdown");
  const choiceButtons = [...document.querySelectorAll(".choice-button")];
  if (!arena || !countdown || choiceButtons.some((button) => button.disabled)) return;

  choiceButtons.forEach((button) => {
    button.disabled = true;
  });
  arena.classList.add("rps-shaking");
  playButtonSound();

  for (const beat of ["Rock...", "Paper...", "Scissors..."]) {
    countdown.textContent = beat;
    await new Promise((resolve) => window.setTimeout(resolve, 420));
    if (!arena.isConnected) return;
  }

  const moves = ["rock", "paper", "scissors"];
  const icons = { rock: "✊", paper: "✋", scissors: "✌" };
  const computerMove = moves[randomInteger(0, moves.length - 1)];
  let outcome;
  const round = { playerMove, computerMove };

  if (playerMove === computerMove) {
    rpsScore.draws += 1;
    outcome = "It's a tie!";
    playButtonSound();
  } else if (
    (playerMove === "rock" && computerMove === "scissors") ||
    (playerMove === "paper" && computerMove === "rock") ||
    (playerMove === "scissors" && computerMove === "paper")
  ) {
    rpsScore.wins += 1;
    outcome = "You win this round!";
    triggerMascotCheer("Hooray!");
    createConfettiBurst();
    playWinSound();
  } else {
    rpsScore.losses += 1;
    outcome = "Computer wins this round.";
    playWrongSound();
  }

  renderRpsGame(outcome, icons[playerMove], round);
}

function renderMathGame() {
  const gameOver = mathTimeLeft === 0;
  gameContent.innerHTML = `
    <div class="game-view">
      <div class="math-top">
        <div>
          <h3 class="game-heading">Math time!</h3>
          <p class="game-subheading">Solve as many as you can in 30 seconds.</p>
        </div>
        <span class="timer-badge ${mathTimeLeft <= 5 ? "urgent" : ""}" id="math-timer">${mathTimeLeft}s</span>
      </div>
      <div class="math-problem" id="math-problem">${mathRunning ? `${mathProblemText}` : gameOver ? `Score: ${mathScore}` : "Ready, set, go!"}</div>
      ${mathRunning ? `
        <form class="math-form" id="math-form">
          <label class="visually-hidden" for="math-input">Your answer</label>
          <input class="math-input" id="math-input" type="number" inputmode="numeric" autocomplete="off" placeholder="Answer" required />
          <button class="primary-button" type="submit">Check ↗</button>
        </form>
      ` : ""}
      <p class="math-feedback" id="math-feedback" role="status" aria-live="polite">${gameOver ? `You got ${mathScore} ${mathScore === 1 ? "answer" : "answers"} right! Want another round?` : mathRunning ? " " : "No calculators, just your brain!"}</p>
      ${!mathRunning ? `<div class="math-start-row"><button class="primary-button" id="math-start" type="button">${gameOver ? "Play again ↻" : "Start game ↗"}</button></div>` : ""}
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
  playButtonSound();
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
    feedback.textContent = "Great job! You got it!";
    feedback.className = "math-feedback success";
    triggerMascotCheer("Yay!");
    createConfettiBurst();
    playWinSound();
    newMathProblem();
    document.querySelector("#math-problem").textContent = mathProblemText;
    input.value = "";
    input.focus();
  } else {
    feedback.textContent = "Nice try! Give it another go!";
    feedback.className = "math-feedback";
    playWrongSound();
    input.select();
  }
}

function setLevel(level) {
  currentLevel = level;
  levelButtons.forEach((button) => {
    const isSelected = Number(button.dataset.level) === level;
    button.classList.toggle("selected", isSelected);
  });
}

function startAdventure() {
  if (startScreen) startScreen.classList.add("hidden");
  startBackgroundMusic();
  playButtonSound();
  if (gameButtons[0]) {
    const firstGame = gameButtons[0].dataset.game;
    selectGame(firstGame);
  }
}

levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLevel(Number(button.dataset.level));
    playButtonSound();
  });
});

if (startGameButton) {
  startGameButton.addEventListener("click", startAdventure);
}

gameButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playButtonSound();
    selectGame(button.dataset.game);
  });
});

setupSoundToggle();
if (startScreen) startScreen.classList.remove("hidden");
renderGuessGame();
