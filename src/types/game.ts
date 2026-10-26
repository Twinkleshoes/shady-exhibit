import type {ModeId} from '../game/modes.js';
import type {RoundResults,PlayerRoundRecord} from '../game/results.js';
import type {preparationState} from '../game/preparation.js';
import type {TourState} from '../game/tour.js';
import type {TourPublic} from '../game/tour-shared.js';
import type {VisitorAction} from '../game/appearances.js';
import type {Movable,Switch} from '../game/world.js';
export type Role = 'guard' | 'thief';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: 'solid' | 'railing';
  elevation?: number;
}

export interface Lamp {
  id: string;
  x: number;
  y: number;
  radius: number;
  holderId?: string|null;
}

export interface Treasure {
  active?:boolean;
  id: string;
  x: number;
  y: number;
  radius: number;
  room?: string;
  stolen: boolean;
  name: string;
}

export interface ShadowData {
  active: boolean;
  dirX: number;
  dirY: number;
  length: number;
  handX: number;
  handY: number;
  angle: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  badgeNumber: number;
  x: number;
  y: number;
  isCaptured: boolean;
  isInspected: boolean;
  shadow: ShadowData;
  isTeammate?: boolean; // Only visible to thieves
  activeLampId?: string|null;
  interactionTargetId?: string|null;
  interactionProgress?: number;
  carryingId?: string|null;
  carryBlocked?: boolean;
  isReaching?: boolean;
  visibleOnFeed?: boolean;
  appearanceId?: number;
  action?: VisitorAction;
  walkSpeed?: number;
  heading?: number;
  isSelf?: boolean;
}

export interface ClientGameState {
  mode:ModeId;
  canChangeMode:boolean;
  duel:{captures:number;detentionRemaining:number;releaseUsed:boolean}|null;
  results:RoundResults|null;
  viewingResults:boolean;
  connectedPlayerCount:number;
  preparation:ReturnType<typeof preparationState>;
  tour: TourPublic;
  roomCode: string;
  roundId: string;
  readyCount: number;
  status: 'lobby' | 'loading' | 'briefing' | 'countdown' | 'playing' | 'gameover';
  myId: string;
  myRole: Role | null;
  isHost: boolean;
  players: PlayerPublic[];
  walls: Wall[];
  lamp: Lamp;
  treasure: Treasure;
  lamps: Lamp[];
  treasures: Treasure[];
  switches: Switch[];
  movables: Movable[];
  roundTimeLeft: number;
  visibleShadows: {id:string;x:number;y:number;shadow:ShadowData}[];
  theft: {
    inProgress: boolean;
    progress: number; // 0 to 1
    thiefBadge: number | null; // null for guard unless noticed
  };
  guard: {
    activeCameraId: string;
    cameraPans: Record<string,number>;
    disabledCameras: Record<string,number>;
    charges: number;
    maxCharges: number;
    rechargingTimeLeft: number[];
    inspecting: {
      targetBadge: number | null;
      progress: number; // 0 to 1
    } | null;
    recentAlerts: string[];
    isCameraLive: boolean;
  };
  winner: 'thieves' | 'guard' | null;
  winReason: string | null;
  lobbyPlayers: { id: string; name: string; isHost: boolean }[];
}

export interface ServerPlayer {
  id: string;
  socketId: string;
  name: string;
  badgeNumber: number;
  role: Role | null;
  x: number;
  y: number;
  isCaptured: boolean;
  isInspected: boolean;
  inspectTimer: number;
  isStealing: boolean;
  theftProgress: number;
  shadow: ShadowData;
  shadowKey: string;
  activeLampId: string|null;
  interactionTargetId: string|null;
  carryingId: string|null;
  carryBlocked: boolean;
  appearanceId: number;
  action: VisitorAction;
  admireUntil: number;
  walkSpeed: number;
  heading: number;
  visitorPlan?: {mode:'walk'|'pause'|'turn';goal:Vector2D;remaining:number;stuck:number};
  input: {dx:number;dy:number;at:number};
}

export interface GameRoom {
  mode:ModeId;
  captureCounts:Record<string,number>;
  pendingReleases:Record<string,number>;
  automaticReleaseUsed:string[];
  resultViewers:string[];
  roundRecords:Record<string,PlayerRoundRecord>;
  results:RoundResults|null;
  returnedToLobby:string[];
  tour: TourState;
  code: string;
  roundId: string;
  readyPlayerIds: string[];
  briefingReadyIds:string[];
  loadingDeadline:number|null;
  countdownEndsAt:number|null;
  gameStartedAt:number|null;
  preparationError:string|null;
  usedBadges: number[];
  hostId: string;
  playerOrder: string[]; // Fixed order for deliberate guard rotation
  guardIndex: number;
  status: 'lobby' | 'loading' | 'briefing' | 'countdown' | 'playing' | 'gameover';
  players: Record<string, ServerPlayer>;
  walls: Wall[];
  lamp: Lamp;
  treasure: Treasure;
  lamps: Lamp[];
  treasures: Treasure[];
  switches: Switch[];
  movables: Movable[];
  roundTimeLeft: number;
  theftProgress: number; // 0 to 3 seconds
  theftThiefId: string | null;
  visitors: ServerPlayer[];
  staticWalls: Wall[];
  cameraId: string;
  cameraAspect: number;
  cameraPans: Record<string,number>;
  cameraPanInput: {cameraId:string;direction:number;at:number};
  disabledCameras: Record<string,number>;
  elapsed: number;
  guardCharges: number;
  guardRechargeTimers: number[];
  activeInspection: {
    targetId: string;
    elapsed: number; // seconds
  } | null;
  alerts: string[];
  winner: 'thieves' | 'guard' | null;
  winReason: string | null;
}
