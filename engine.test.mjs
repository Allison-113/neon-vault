import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, restart, choose, getEnding, CREW, SCENES } from './engine.mjs';
import { ENDINGS } from './scenario.mjs';

const rng = roll => () => (roll - 0.5) / 20;
const choiceAt = (state, stat = 'hack') => SCENES[state.sceneIndex].choices.find(c => c.stat === stat);
const specialist = stat => CREW.find(c => c.stat === stat);
function play(rolls, finalStat = 'hack') {
  let state = createGame();
  for (const roll of rolls) {
    const stat = state.sceneIndex === SCENES.length - 1 ? finalStat : 'hack';
    state = choose(state, choiceAt(state, stat).id, specialist(stat).id, rng(roll));
  }
  return state;
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('scenario supplies six unique scenes, three specialists, legal checks and endings', () => {
  assert.equal(SCENES.length, 6);
  assert.equal(new Set(SCENES.map(s => s.id)).size, 6);
  assert.equal(CREW.length, 3);
  assert.equal(new Set(CREW.map(c => c.id)).size, 3);
  assert.deepEqual(CREW.map(c => c.stat).sort(), ['charm', 'force', 'hack']);
  for (const scene of SCENES) {
    assert.equal(scene.choices.length, 3);
    assert.equal(new Set(scene.choices.map(c => c.id)).size, 3);
    assert.deepEqual(scene.choices.map(c => c.stat).sort(), ['charm', 'force', 'hack']);
    for (const c of scene.choices) {
      assert.ok(Number.isInteger(c.dc) && c.dc >= 9 && c.dc <= 15);
      assert.ok(c.success && c.failure);
    }
  }
  for (const key of ['clean', 'costly', 'captured']) assert.ok(ENDINGS[key].text && ENDINGS[key].title);
});

test('new games and restart return independent, exact initial states', () => {
  const initial = {sceneIndex:0, integrity:6, heat:0, score:0, phase:'playing', history:[], lastRoll:null};
  const a = createGame();
  assert.deepEqual(a, initial);
  assert.deepEqual(restart(), initial);
  a.history.push({test:true});
  assert.deepEqual(createGame(), initial);
  assert.equal(getEnding(createGame()), null);
  assert.deepEqual(restart(play([20,20,20,20,20,20])), initial);
});

test('all twenty die bins and both RNG boundaries resolve correctly', () => {
  const state = createGame();
  const c = choiceAt(state);
  for (let roll = 1; roll <= 20; roll++) {
    const next = choose(state, c.id, specialist('hack').id, rng(roll));
    assert.equal(next.lastRoll.roll, roll);
  }
  assert.equal(choose(state, c.id, CREW[0].id, () => 0).lastRoll.roll, 1);
  assert.equal(choose(state, c.id, CREW[0].id, () => 1 - Number.EPSILON).lastRoll.roll, 20);
});

test('matching specialists add their bonus; a tied DC passes and one below fails', () => {
  const state = createGame();
  for (const c of SCENES[0].choices) {
    const crew = specialist(c.stat);
    const exact = c.dc - crew.bonus;
    const hit = choose(state, c.id, crew.id, rng(exact));
    assert.equal(hit.lastRoll.total, c.dc);
    assert.equal(hit.lastRoll.bonus, crew.bonus);
    assert.equal(hit.lastRoll.success, true);
    assert.equal(hit.heat, 1);
    assert.equal(hit.integrity, 6);
    assert.equal(hit.score, 1);
    const miss = choose(state, c.id, crew.id, rng(exact - 1));
    assert.equal(miss.lastRoll.success, false);
    assert.equal(miss.heat, 2);
    assert.equal(miss.integrity, 5);
    const other = CREW.find(member => member.stat !== c.stat);
    assert.equal(choose(state, c.id, other.id, rng(exact)).lastRoll.bonus, 0);
  }
});

test('natural one fails, natural twenty succeeds and cancels its heat increase', () => {
  const state = createGame();
  const c = choiceAt(state);
  const miss = choose(state, c.id, specialist('hack').id, () => 0);
  assert.deepEqual([miss.lastRoll.success, miss.lastRoll.critical, miss.integrity, miss.heat, miss.score], [false, 'failure', 5, 2, 0]);
  const hit = choose(state, c.id, CREW[0].id, rng(20));
  assert.deepEqual([hit.lastRoll.success, hit.lastRoll.critical, hit.integrity, hit.heat, hit.score], [true, 'success', 6, 0, 1]);
  const later = choose(miss, choiceAt(miss).id, specialist('hack').id, rng(20));
  assert.equal(later.heat, 2);
});

test('choices preserve frozen input, record narrative provenance and consume RNG once', () => {
  const state = freeze(play([10]));
  const before = JSON.stringify(state);
  const c = choiceAt(state);
  const crew = specialist(c.stat);
  let calls = 0;
  const next = choose(state, c.id, crew.id, () => { calls++; return 0.9; });
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(next, state);
  assert.notEqual(next.history, state.history);
  assert.equal(next.sceneIndex, state.sceneIndex + 1);
  assert.deepEqual(next.history.at(-1), {...next.lastRoll, sceneId:SCENES[1].id, floor:SCENES[1].floor, choiceLabel:c.label, crewName:crew.name});
  assert.equal(next.lastRoll.text, c.success);
  assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
  assert.deepEqual(choose(state, c.id, crew.id, () => 0.9), next);
});

test('invalid choices, crew, state and RNG fail without changing the input', () => {
  const state = freeze(createGame());
  const c = choiceAt(state);
  const crew = specialist('hack').id;
  assert.throws(() => choose(state, 'missing', crew));
  assert.throws(() => choose(state, SCENES[1].choices[0].id, crew));
  assert.throws(() => choose(state, c.id, 'missing'));
  assert.throws(() => choose(state, c.id, crew, null));
  for (const sample of [-1, 1, 2, NaN, Infinity, -Infinity, '0.5', null, undefined]) {
    assert.throws(() => choose(state, c.id, crew, () => sample));
  }
  for (const bad of [null, {}, {...state, sceneIndex:-1}, {...state, heat:NaN}, {...state, integrity:7}]) {
    assert.throws(() => choose(bad, c.id, crew));
  }
  assert.deepEqual(state, createGame());
});

test('complete runs produce clean, costly and captured grades at the proper thresholds', () => {
  for (const [rolls, grade, score, integrity, heat] of [
    [[20,20,20,20,1,1], 'clean', 4, 4, 4],
    [[20,20,20,1,1,1], 'costly', 3, 3, 6],
    [[1,1,1,1,1,1], 'captured', 0, 0, 12],
  ]) {
    const state = play(rolls);
    assert.deepEqual([state.phase,state.sceneIndex,state.score,state.integrity,state.heat], ['done',6,score,integrity,heat]);
    assert.equal(state.history.length, 6);
    assert.equal(getEnding(state).grade, grade);
    assert.equal(getEnding(state).title, ENDINGS[grade].title);
    assert.throws(() => choose(state, SCENES[5].choices[0].id, CREW[0].id));
  }
  const lowIntegrity = {...createGame(), integrity:1};
  const captured = choose(lowIntegrity, choiceAt(lowIntegrity).id, CREW[0].id, rng(1));
  assert.equal(captured.phase, 'done');
  assert.equal(getEnding(captured).text, ENDINGS.captured.text);
});

test('each final choice preserves its distinct successful or failed consequence in the ending', () => {
  for (const c of SCENES.at(-1).choices) {
    for (const roll of [1,20]) {
      const state = freeze(play([20,20,20,20,20,roll], c.stat));
      const ending = getEnding(state);
      assert.equal(ending.grade, 'clean');
      assert.ok(ending.text.endsWith(roll === 20 ? c.success : c.failure));
      assert.deepEqual(getEnding(JSON.parse(JSON.stringify(state))), ending);
    }
  }
});
