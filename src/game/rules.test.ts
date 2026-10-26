import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRoles,
  assignBadges,
  evaluateWinCondition,
  tickInspectionCharges,
  rotateGuardRoles,
  isWithinCameraCoverage,
  CHARGE_RECHARGE_TIME,
  MAX_CHARGES,
} from './rules.js';

test('assignRoles assigns exactly 1 guard and (total - 1) thieves', () => {
  const playerIds = ['p1', 'p2', 'p3', 'p4'];
  const roles = assignRoles(playerIds);

  const roleValues = Object.values(roles);
  assert.equal(roleValues.length, 4);
  assert.equal(roleValues.filter((r) => r === 'guard').length, 1);
  assert.equal(roleValues.filter((r) => r === 'thief').length, 3);
});

test('assignBadges gives unique badge numbers to all players', () => {
  const playerIds = ['p1', 'p2', 'p3', 'p4'];
  const badges = assignBadges(playerIds);

  const badgeNumbers = Object.values(badges);
  const uniqueBadges = new Set(badgeNumbers);
  assert.equal(uniqueBadges.size, 4);
  assert.equal(badgeNumbers.every((b) => b >= 100), true);
});

test('evaluateWinCondition triggers thieves victory on stolen treasure', () => {
  const result = evaluateWinCondition({
    treasureStolen: true,
    thieves: [
      { id: 't1', isCaptured: false },
      { id: 't2', isCaptured: false },
      { id: 't3', isCaptured: false },
    ],
  });

  assert.equal(result.isOver, true);
  assert.equal(result.winner, 'thieves');
});

test('evaluateWinCondition triggers guard victory when all thieves captured', () => {
  const result = evaluateWinCondition({
    treasureStolen: false,
    thieves: [
      { id: 't1', isCaptured: true },
      { id: 't2', isCaptured: true },
      { id: 't3', isCaptured: true },
    ],
  });

  assert.equal(result.isOver, true);
  assert.equal(result.winner, 'guard');
});

test('tickInspectionCharges restores charges after cooldown expires', () => {
  // Start with 2 charges and 1 timer of 5 seconds
  const initial = tickInspectionCharges(2, [5.0], 5.1);
  assert.equal(initial.charges, 3);
  assert.equal(initial.timers.length, 0);

  // If dt is less than remaining timer, charge is not restored yet
  const partial = tickInspectionCharges(1, [15.0], 5.0);
  assert.equal(partial.charges, 1);
  assert.equal(partial.timers.length, 1);
  assert.equal(Math.round(partial.timers[0]), 10);
});

test('rotateGuardRoles cyclically rotates guard to next player and assigns others thieves', () => {
  const playerOrder = ['p1', 'p2', 'p3', 'p4'];
  
  // First rotation from index 0 -> index 1
  const rot1 = rotateGuardRoles(playerOrder, 0);
  assert.equal(rot1.nextGuardIndex, 1);
  assert.equal(rot1.roles['p2'], 'guard');
  assert.equal(rot1.roles['p1'], 'thief');
  assert.equal(rot1.roles['p3'], 'thief');
  assert.equal(rot1.roles['p4'], 'thief');

  // Second rotation from index 1 -> index 2
  const rot2 = rotateGuardRoles(playerOrder, 1);
  assert.equal(rot2.nextGuardIndex, 2);
  assert.equal(rot2.roles['p3'], 'guard');
  assert.equal(rot2.roles['p2'], 'thief');

  // Fourth rotation wrapping around from index 3 -> index 0
  const rot3 = rotateGuardRoles(playerOrder, 3);
  assert.equal(rot3.nextGuardIndex, 0);
  assert.equal(rot3.roles['p1'], 'guard');
});

test('isWithinCameraCoverage correctly identifies points inside vs outside CAM 01 view', () => {
  // Inside center
  assert.equal(isWithinCameraCoverage({ x: 400, y: 300 }), true);
  // Edge inside
  assert.equal(isWithinCameraCoverage({ x: 50, y: 50 }), true);
  assert.equal(isWithinCameraCoverage({ x: 750, y: 550 }), true);

  // Outside bounds
  assert.equal(isWithinCameraCoverage({ x: 40, y: 300 }), false); // left of minX
  assert.equal(isWithinCameraCoverage({ x: 760, y: 300 }), false); // right of maxX
  assert.equal(isWithinCameraCoverage({ x: 400, y: 40 }), false); // above minY
  assert.equal(isWithinCameraCoverage({ x: 400, y: 560 }), false); // below maxY
});

