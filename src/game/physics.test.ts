import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveWallCollisions,
  calculateShadow,
  isShadowTouchingTreasure,
  lineIntersectsAABB,
  PLAYER_RADIUS,
} from './physics.js';
import { Wall, Lamp, Treasure } from '../types/game.js';

test('resolveWallCollisions clamps player inside room boundaries', () => {
  const walls: Wall[] = [];
  const outOfBoundsLeft = resolveWallCollisions({ x: -10, y: 300 }, PLAYER_RADIUS, walls);
  assert.equal(outOfBoundsLeft.x, PLAYER_RADIUS);

  const outOfBoundsBottom = resolveWallCollisions({ x: 400, y: 1700 }, PLAYER_RADIUS, walls);
  assert.equal(outOfBoundsBottom.y, 1400 - PLAYER_RADIUS);
});

test('resolveWallCollisions pushes player away from solid walls', () => {
  const walls: Wall[] = [
    { id: 'w1', x: 200, y: 200, width: 100, height: 100 },
  ];
  // Player attempting to step into wall left edge at x: 205, y: 250
  const pushed = resolveWallCollisions({ x: 205, y: 250 }, PLAYER_RADIUS, walls);
  // Circle center must be outside the wall (x <= 200 - PLAYER_RADIUS or y <= 200 - PLAYER_RADIUS etc)
  const isOutside =
    pushed.x <= 200 - PLAYER_RADIUS ||
    pushed.x >= 300 + PLAYER_RADIUS ||
    pushed.y <= 200 - PLAYER_RADIUS ||
    pushed.y >= 300 + PLAYER_RADIUS;
  assert.equal(isOutside, true);
});

test('calculateShadow extends longer when thief is closer to lamp', () => {
  const lamp: Lamp = { id: 'l1', x: 400, y: 300, radius: 25 };
  const walls: Wall[] = [];

  // Close to lamp: distance ~ 50
  const shadowClose = calculateShadow({ x: 450, y: 300 }, lamp, walls);
  // Far from lamp: distance ~ 250
  const shadowFar = calculateShadow({ x: 650, y: 300 }, lamp, walls);

  assert.equal(shadowClose.active, true);
  assert.equal(shadowFar.active, true);
  assert.ok(
    shadowClose.length > shadowFar.length,
    `Close shadow (${shadowClose.length}) should be longer than far shadow (${shadowFar.length})`
  );
});

test('calculateShadow is blocked if solid wall obstructs line of sight to lamp', () => {
  const lamp: Lamp = { id: 'l1', x: 400, y: 300, radius: 25 };
  const walls: Wall[] = [
    { id: 'w_block', x: 450, y: 250, width: 20, height: 100, type: 'solid' },
  ];

  // Player behind wall at x: 500, y: 300
  const shadowBlocked = calculateShadow({ x: 500, y: 300 }, lamp, walls);
  assert.equal(shadowBlocked.active, false);
});

test('isShadowTouchingTreasure returns true only when hand is within reach radius', () => {
  const treasure: Treasure = {
    id: 't1',
    x: 600,
    y: 200,
    radius: 20,
    stolen: false,
    name: 'Gem',
  };

  const shadowTouching = {
    active: true,
    dirX: 1,
    dirY: 0,
    length: 100,
    handX: 610,
    handY: 205,
    angle: 0,
  };

  const shadowMiss = {
    active: true,
    dirX: 1,
    dirY: 0,
    length: 100,
    handX: 400,
    handY: 205,
    angle: 0,
  };

  assert.equal(isShadowTouchingTreasure(shadowTouching, treasure, 36), true);
  assert.equal(isShadowTouchingTreasure(shadowMiss, treasure, 36), false);
});
