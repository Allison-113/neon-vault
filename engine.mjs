import { CREW, SCENES, ENDINGS } from './scenario.mjs';

export { CREW, SCENES };

export function createGame() {
  return {
    sceneIndex: 0, integrity: 6, heat: 0, score: 0,
    phase: 'playing', history: [], lastRoll: null,
  };
}

export function restart() {
  return createGame();
}

function validateState(state) {
  if (!state || !['playing', 'done'].includes(state.phase) ||
      !Number.isInteger(state.sceneIndex) || state.sceneIndex < 0 ||
      state.sceneIndex > SCENES.length || !Array.isArray(state.history) ||
      !Number.isInteger(state.integrity) || state.integrity < 0 || state.integrity > 6 ||
      !Number.isInteger(state.heat) || state.heat < 0 ||
      !Number.isInteger(state.score) || state.score < 0 || state.score > state.sceneIndex) {
    throw new Error('Invalid game state');
  }
}

/** Resolve exactly one scene; RNG follows Math.random's finite [0, 1) contract. */
export function choose(state, choiceId, crewId, random = Math.random) {
  validateState(state);
  if (state.phase !== 'playing' || state.integrity <= 0 || state.sceneIndex >= SCENES.length) {
    throw new Error('This run is already complete');
  }
  const scene = SCENES[state.sceneIndex];
  const choice = scene.choices.find(item => item.id === choiceId);
  const crew = CREW.find(item => item.id === crewId);
  if (!choice) throw new Error('Invalid choice for the current scene');
  if (!crew) throw new Error('Invalid crew member');
  if (typeof random !== 'function') throw new Error('Random must be a function');
  const sample = random();
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error('Random must return a finite number in [0, 1)');
  }

  const roll = Math.floor(sample * 20) + 1;
  const bonus = crew.stat === choice.stat ? crew.bonus : 0;
  const total = roll + bonus;
  const success = roll === 20 || (roll !== 1 && total >= choice.dc);
  const lastRoll = {
    roll, bonus, total, dc: choice.dc, success,
    critical: roll === 20 ? 'success' : roll === 1 ? 'failure' : null,
    choiceId, crewId, text: success ? choice.success : choice.failure,
  };
  const sceneIndex = state.sceneIndex + 1;
  const integrity = state.integrity - (success ? 0 : 1);
  return {
    sceneIndex, integrity,
    heat: Math.max(0, state.heat + (success ? 1 : 2) - (roll === 20 ? 1 : 0)),
    score: state.score + (success ? 1 : 0),
    phase: sceneIndex >= SCENES.length || integrity <= 0 ? 'done' : 'playing',
    history: [...state.history, {
      ...lastRoll, sceneId: scene.id, floor: scene.floor,
      choiceLabel: choice.label, crewName: crew.name,
    }],
    lastRoll,
  };
}

export function getEnding(state) {
  validateState(state);
  if (state.phase !== 'done') return null;
  const grade = state.integrity <= 0 ? 'captured' : state.score >= 4 ? 'clean' : 'costly';
  const ending = ENDINGS[grade];
  // Include the actual vault outcome, including a failed attempt, rather than
  // implying that escaping the tower necessarily saved the intelligence.
  const finalChoice = state.history.findLast(item => item.sceneId === SCENES.at(-1).id);
  return {
    title: ending.title,
    text: finalChoice ? `${ending.text}\n\n${finalChoice.text}` : ending.text,
    grade,
  };
}
