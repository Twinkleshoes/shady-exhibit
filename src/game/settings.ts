// Server movement and client gait use the same units and constants; there is no sprint input.
export const WALK_SPEED = 120; // server pixels per second (6 museum world units/s)
export const WALK_CYCLE_RATE = 9; // radians per second at normal walking speed
export const NPC_TURN_RATE = Math.PI * .8;
export const CAMERA_PAN_LIMIT = 50 * Math.PI / 180;
export const CAMERA_PAN_SPEED = 35 * Math.PI / 180;
export const INPUT_TIMEOUT_MS = 200;
export const gaitAdvance = (speed:number,dt:number) => Math.max(0,Math.min(WALK_SPEED,speed))/WALK_SPEED*WALK_CYCLE_RATE*dt;
