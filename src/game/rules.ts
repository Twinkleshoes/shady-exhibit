import { Role } from '../types/game.js';

export const THEFT_REQUIRED_TIME = 3.0; // 3 uninterrupted seconds
export const INSPECTION_REQUIRED_TIME = 2.0; // 2 uninterrupted seconds
export const CHARGE_RECHARGE_TIME = 20.0; // 20s per spent charge
export const MAX_CHARGES = 3;

/**
 * Generates a readable 4-character room code.
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Camera coverage rectangle for CAM 01
 */
export const CAMERA_COVERAGE = {
  minX: 50,
  maxX: 750,
  minY: 50,
  maxY: 550,
};

export function isWithinCameraCoverage(pos: { x: number; y: number }): boolean {
  return (
    pos.x >= CAMERA_COVERAGE.minX &&
    pos.x <= CAMERA_COVERAGE.maxX &&
    pos.y >= CAMERA_COVERAGE.minY &&
    pos.y <= CAMERA_COVERAGE.maxY
  );
}

/**
 * Deliberately rotates the Guard role to the next player in cyclic order.
 * All other players become Thieves.
 */
export function rotateGuardRoles(
  playerOrder: string[],
  currentGuardIndex: number
): { roles: Record<string, Role>; nextGuardIndex: number } {
  if (playerOrder.length === 0) return { roles: {}, nextGuardIndex: 0 };

  const nextGuardIndex = (currentGuardIndex + 1) % playerOrder.length;
  const guardId = playerOrder[nextGuardIndex];

  const roles: Record<string, Role> = {};
  playerOrder.forEach((id) => {
    roles[id] = id === guardId ? 'guard' : 'thief';
  });

  return { roles, nextGuardIndex };
}

/**
 * Randomly assigns 1 Guard and (total - 1) Thieves for initial match.
 */
export function assignRoles(playerIds: string[]): Record<string, Role> {
  if (playerIds.length === 0) return {};

  const roles: Record<string, Role> = {};
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

  // First one is Guard, rest are Thieves
  roles[shuffled[0]] = 'guard';
  for (let i = 1; i < shuffled.length; i++) {
    roles[shuffled[i]] = 'thief';
  }

  return roles;
}

/**
 * Assigns unique readable badge numbers starting at 101.
 */
export function assignBadges(playerIds: string[]): Record<string, number> {
  const badges: Record<string, number> = {};
  playerIds.forEach((id, index) => {
    badges[id] = 101 + index;
  });
  return badges;
}

/**
 * Checks win conditions for Stage 1.
 */
export function evaluateWinCondition(params: {
  treasureStolen: boolean;
  thieves: { id: string; isCaptured: boolean }[];
}): { isOver: boolean; winner: 'thieves' | 'guard' | null; reason: string | null } {
  if (params.treasureStolen) {
    return {
      isOver: true,
      winner: 'thieves',
      reason: 'The Shadow Thieves successfully stole the Royal Sapphire!',
    };
  }

  const totalThieves = params.thieves.length;
  const capturedThieves = params.thieves.filter((t) => t.isCaptured).length;

  if (totalThieves > 0 && capturedThieves === totalThieves) {
    return {
      isOver: true,
      winner: 'guard',
      reason: 'The Guard apprehended all Shadow Thieves!',
    };
  }

  return { isOver: false, winner: null, reason: null };
}

/**
 * Updates inspection charges cooldowns.
 */
export function tickInspectionCharges(
  currentCharges: number,
  rechargeTimers: number[],
  dt: number,
  maxCharges=MAX_CHARGES
): { charges: number; timers: number[] } {
  let charges = currentCharges;
  const updatedTimers: number[] = [];

  for (const timer of rechargeTimers) {
    const nextTimer = timer - dt;
    if (nextTimer <= 0) {
      if (charges < maxCharges) {
        charges += 1;
      }
    } else {
      updatedTimers.push(nextTimer);
    }
  }

  return { charges, timers: updatedTimers };
}
