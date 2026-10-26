import { Lamp, ShadowData, Treasure, Vector2D, Wall } from '../types/game.js';

import {WORLD_WIDTH,WORLD_HEIGHT} from './world.js';
export const ROOM_WIDTH = WORLD_WIDTH;
export const ROOM_HEIGHT = WORLD_HEIGHT;
export const PLAYER_RADIUS = 18;
export const INTERACTION_RADIUS = 54; // Forgiving interaction radius per spec
export const MIN_LAMP_DIST = 35;
export const MAX_LAMP_DIST = 320;
export const MIN_SHADOW_LEN = 45;
export const MAX_SHADOW_LEN = 175;

/**
 * Resolves circle-AABB collisions against an array of rectangular walls.
 */
export function resolveWallCollisions(
  pos: Vector2D,
  radius: number,
  walls: Wall[]
): Vector2D {
  let { x, y } = pos;

  // Clamp within outer room boundaries
  x = Math.max(radius, Math.min(ROOM_WIDTH - radius, x));
  y = Math.max(radius, Math.min(ROOM_HEIGHT - radius, y));

  for (const wall of walls) {
    // If center is inside the box:
    if (x >= wall.x && x <= wall.x + wall.width && y >= wall.y && y <= wall.y + wall.height) {
      const distLeft = x - wall.x;
      const distRight = (wall.x + wall.width) - x;
      const distTop = y - wall.y;
      const distBottom = (wall.y + wall.height) - y;

      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      if (minDist === distLeft) {
        x = wall.x - radius;
      } else if (minDist === distRight) {
        x = wall.x + wall.width + radius;
      } else if (minDist === distTop) {
        y = wall.y - radius;
      } else {
        y = wall.y + wall.height + radius;
      }
    } else {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));

      const dx = x - closestX;
      const dy = y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          const overlap = radius - dist;
          x += (dx / dist) * overlap;
          y += (dy / dist) * overlap;
        }
      }
    }
  }

  return { x, y };
}

/**
 * Checks if a 2D line segment intersects an Axis-Aligned Bounding Box (AABB).
 */
export function lineIntersectsAABB(
  p1: Vector2D,
  p2: Vector2D,
  box: { x: number; y: number; width: number; height: number }
): { hit: boolean; distance: number } {
  const minX = box.x;
  const maxX = box.x + box.width;
  const minY = box.y;
  const maxY = box.y + box.height;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let tmin = 0;
  let tmax = 1;

  if (Math.abs(dx) > 1e-6) {
    const tx1 = (minX - p1.x) / dx;
    const tx2 = (maxX - p1.x) / dx;
    tmin = Math.max(tmin, Math.min(tx1, tx2));
    tmax = Math.min(tmax, Math.max(tx1, tx2));
  } else if (p1.x < minX || p1.x > maxX) {
    return { hit: false, distance: 0 };
  }

  if (Math.abs(dy) > 1e-6) {
    const ty1 = (minY - p1.y) / dy;
    const ty2 = (maxY - p1.y) / dy;
    tmin = Math.max(tmin, Math.min(ty1, ty2));
    tmax = Math.min(tmax, Math.max(ty1, ty2));
  } else if (p1.y < minY || p1.y > maxY) {
    return { hit: false, distance: 0 };
  }

  if (tmax >= tmin && tmin >= 0 && tmin <= 1) {
    const totalDist = Math.sqrt(dx * dx + dy * dy);
    return { hit: true, distance: tmin * totalDist };
  }

  return { hit: false, distance: 0 };
}

/**
 * Calculates shadow direction, length, obstruction, and hand tip position.
 */
export function calculateShadow(
  playerPos: Vector2D,
  lamp: Lamp,
  walls: Wall[]
): ShadowData {
  const dx = playerPos.x - lamp.x;
  const dy = playerPos.y - lamp.y;
  const distToLamp = Math.sqrt(dx * dx + dy * dy);

  // If player is directly inside or too far from lamp
  if (distToLamp <= 5 || distToLamp > MAX_LAMP_DIST + 40) {
    return {
      active: false,
      dirX: 0,
      dirY: 0,
      length: 0,
      handX: playerPos.x,
      handY: playerPos.y,
      angle: 0,
    };
  }

  // Check line of sight from Lamp to Player
  for (const wall of walls) {
    if (wall.type === 'railing') continue; // Light passes through railings
    const check = lineIntersectsAABB(lamp, playerPos, wall);
    if (check.hit) {
      return {
        active: false,
        dirX: 0,
        dirY: 0,
        length: 0,
        handX: playerPos.x,
        handY: playerPos.y,
        angle: 0,
      };
    }
  }

  const dirX = dx / distToLamp;
  const dirY = dy / distToLamp;
  const angle = Math.atan2(dirY, dirX);

  // Closer to lamp = longer shadow
  const clampedDist = Math.max(MIN_LAMP_DIST, Math.min(MAX_LAMP_DIST, distToLamp));
  const t = (clampedDist - MIN_LAMP_DIST) / (MAX_LAMP_DIST - MIN_LAMP_DIST);
  let length = MAX_SHADOW_LEN - t * (MAX_SHADOW_LEN - MIN_SHADOW_LEN);

  // Target hand position before obstacle clipping
  let handX = playerPos.x + dirX * length;
  let handY = playerPos.y + dirY * length;

  // Obstacle clipping for shadow arm
  for (const wall of walls) {
    if (wall.type === 'railing') continue;
    const hitCheck = lineIntersectsAABB(playerPos, { x: handX, y: handY }, wall);
    if (hitCheck.hit && hitCheck.distance < length) {
      length = Math.max(10, hitCheck.distance - 2);
      handX = playerPos.x + dirX * length;
      handY = playerPos.y + dirY * length;
    }
  }

  return {
    active: true,
    dirX,
    dirY,
    length,
    handX,
    handY,
    angle,
  };
}

/**
 * Checks if shadow's reaching hand is within interaction radius of the treasure.
 */
export function isShadowTouchingTreasure(
  shadow: ShadowData,
  treasure: Treasure,
  reachRadius = INTERACTION_RADIUS
): boolean {
  if (!shadow.active) return false;
  const dx = shadow.handX - treasure.x;
  const dy = shadow.handY - treasure.y;
  return dx * dx + dy * dy <= reachRadius * reachRadius;
}

/** Select nearest unblocked gameplay light, retaining the current light within a 30px buffer. */
export function selectLamp(pos: Vector2D,lamps: Lamp[],walls: Wall[],currentId?:string|null): Lamp|null {
 const available=lamps.filter(l=>Math.hypot(l.x-pos.x,l.y-pos.y)<=MAX_LAMP_DIST && !walls.some(w=>w.type!=='railing'&&lineIntersectsAABB(l,pos,w).hit));
 available.sort((a,b)=>Math.hypot(a.x-pos.x,a.y-pos.y)-Math.hypot(b.x-pos.x,b.y-pos.y));
 const nearest=available[0];if(!nearest) return null;
 const current=available.find(l=>l.id===currentId);
 return current&&Math.hypot(current.x-pos.x,current.y-pos.y)<=Math.hypot(nearest.x-pos.x,nearest.y-pos.y)+30 ? current : nearest;
}
