import {reportSceneStage,registerSceneResource,clearSceneResources} from '../game/scene-preparation.js';
import {recordVisitorFrame} from '../game/visitor-diagnostics.js';
import {MissionStatus,MuseumMap} from './MissionHUD.js';
import * as THREE from 'three';
import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Ghost, Sparkles, AlertTriangle, ShieldAlert, Volume2, VolumeX, HelpCircle, Menu, Eye, Compass, Move } from 'lucide-react';
import { ClientGameState } from '../types/game.js';
import { soundManager } from '../utils/audio.js';
import {availableObjects} from '../game/lamp-carry.js';
import {ROOMS,inside} from '../game/world.js';
import {targetFor} from '../game/engine-client.js';
import { isShadowTouchingTreasure } from '../game/physics.js';
import { buildMuseumScene, MuseumSceneContext } from '../game/scene3d.js';
import {visitorLabelVisible} from '../game/visitor-labels.js';
import { createCharacter3D, CharacterController } from '../game/character3d.js';
import { createShadow3D, Shadow3DController } from '../game/shadow3d.js';

interface Thief3DViewProps {
  socket: Socket | null;
  gameState: ClientGameState;
  onOpenHowToPlay: () => void;
  onOpenEscMenu: () => void;
  isInputEnabled: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Thief3DView: React.FC<Thief3DViewProps> = ({
  socket,
  gameState,
  onOpenHowToPlay,
  onOpenEscMenu,
  isMuted,
  isInputEnabled,
  onToggleMute,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const keysDown = useRef<{ [key: string]: boolean }>({});
  const isStealingRef = useRef<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  // Third-person Orbit Camera State
  const cameraYaw = useRef<number>(Math.PI * 0.25); // Horizontal orbit angle
  const cameraPitch = useRef<number>(0.4); // Vertical pitch angle (radians)
  const isDragging = useRef<boolean>(false);
  const prevMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const me = gameState.players.find((p) => p.isSelf);
  const myBadge = me?.badgeNumber || 101;
  const isCaptured = me?.isCaptured || false;
  const isInspected = me?.isInspected || false;

  const nearbyObject=me&&!isCaptured?availableObjects(me,gameState.lamps,gameState.movables,gameState.walls)[0]:null;
  const carryPrompt=me?.carryingId?`Space: Release ${me.carryingId.startsWith('lamp_')?'lamp':'display'}`:nearbyObject?`Space: Grab ${nearbyObject.id.startsWith('lamp_')?'lamp':'display'}`:null;
  const target=me?targetFor(gameState,me):null;
  const activeLamp=gameState.lamps.find(l=>l.id===me?.activeLampId);
  const isTouching = !!target;
  const nearbyJammer=gameState.switches.find(sw=>sw.kind==='camera'&&!!me&&ROOMS.find(r=>inside(me,r))?.id===ROOMS.find(r=>inside(sw,r))?.id&&(Math.hypot(me.x-sw.x,me.y-sw.y)<170||target?.id===sw.id));

  // Keyboard controls listener
  useEffect(() => {
    keysDown.current={}; isStealingRef.current=false;
    socket?.emit('player_move',{dx:0,dy:0}); socket?.emit('cancel_theft');
    if(!isInputEnabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if(e.repeat&&!keysDown.current[e.code])return;

      if (e.code === 'Escape' || e.key === 'Escape') {
        keysDown.current={}; isStealingRef.current=false; socket?.emit('cancel_theft'); socket?.emit('player_move',{dx:0,dy:0});
        onOpenEscMenu();
        return;
      }

      if(e.code==='KeyF'&&!e.repeat){e.preventDefault();socket?.emit('admire');}
      if(e.code==='Space') {e.preventDefault(); if(!e.repeat) socket?.emit('toggle_lamp');}
      keysDown.current[e.code] = true;

      if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E') && !isStealingRef.current) {
        if (!isCaptured) {
          isStealingRef.current = true;
          socket?.emit('start_theft');
          soundManager.playClick();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;

      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        isStealingRef.current = false;
        socket?.emit('cancel_theft');
      }
    };

    const clearInput = () => { keysDown.current={}; isStealingRef.current=false; socket?.emit('cancel_theft'); socket?.emit('player_move',{dx:0,dy:0}); };
    window.addEventListener('blur',clearInput);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Movement dispatch timer (Camera-relative WASD)
    const interval = setInterval(() => {
      if (isCaptured) return;

      let forward = 0;
      let strafe = 0;

      if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) forward += 1;
      if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) forward -= 1;
      if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) strafe -= 1;
      if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) strafe += 1;

      if (true) {
        // Calculate camera-relative forward and right vectors projected onto horizontal X-Z plane
        const yaw = cameraYaw.current;
        const sinYaw = Math.sin(yaw);
        const cosYaw = Math.cos(yaw);

        // Forward vector (looking forward into scene)
        const forwardX = -sinYaw;
        const forwardZ = -cosYaw;

        // Right vector (perpendicular to forward)
        const rightX = cosYaw;
        const rightZ = -sinYaw;

        const moveX = forwardX * forward + rightX * strafe;
        const moveZ = forwardZ * forward + rightZ * strafe;

        // Map 3D horizontal movement directly to server 2D coordinates (dx, dy)
        // 3D X corresponds to server X, 3D Z corresponds to server Y
        socket?.emit('player_move', { dx: moveX, dy: moveZ });
      }
    }, 1000 / 30);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
      window.removeEventListener('blur',clearInput);
      clearInput();
    };
  }, [socket, isCaptured, isInputEnabled]);

  // Pointer / Mouse Drag to Orbit Camera
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevMouse.current.x;
    const deltaY = e.clientY - prevMouse.current.y;
    prevMouse.current = { x: e.clientX, y: e.clientY };

    cameraYaw.current -= deltaX * 0.007;
    cameraPitch.current = Math.max(0.12, Math.min(1.25, cameraPitch.current + deltaY * 0.007));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Three.js 3D Third-Person Scene Setup
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const preparingRound=gameStateRef.current.roundId;let sceneFailed=false,animFrameId=0;reportSceneStage(preparingRound,'graphics');

    // Software WebGL Detection per Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? .65 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    const failScene=(event?:Event)=>{event?.preventDefault();reportSceneStage(preparingRound,'error');clearSceneResources(preparingRound);};
    renderer.domElement.addEventListener('webglcontextlost',failScene);
    const unregister=registerSceneResource(preparingRound,()=>{sceneFailed=true;cancelAnimationFrame(animFrameId);renderer.domElement.removeEventListener('webglcontextlost',failScene);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();});

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 220);

    // Build Museum 3D Environment
    reportSceneStage(preparingRound,'geometry');
    const museumContext: MuseumSceneContext = buildMuseumScene();
    reportSceneStage(preparingRound,'visitors');
    const { scene, occluderMeshes, update: updateMuseum, dispose: disposeMuseum } = museumContext;

    // Characters map
    const characters = new Map<string, CharacterController>();
    // Shadows map
    const shadows = new Map<string, Shadow3DController>();

    // Raycaster for camera wall collision prevention
    const camRaycaster = new THREE.Raycaster();

    let readyRound='';

    let lastTime = performance.now();

    const cameraSmoothTarget = new THREE.Vector3(0, 1.2, 0);

    // Render loop
    const renderLoop = (now: number) => {
      if(sceneFailed)return;
      try{
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const currentState = gameStateRef.current;
      const currentMe = currentState.players.find((p) => p.isSelf);
      (window as any).__thiefCameraView={yaw:cameraYaw.current,pitch:cameraPitch.current};

      // Update Museum animations (rotating Sapphire, flickering lamp)
      updateMuseum(dt, currentState);

      // Synchronize 3D characters for all visitors visible on floor
      const activeIds = new Set<string>();

      currentState.players.forEach((p) => {
        const renderId=p.id+':'+p.badgeNumber+':'+p.appearanceId;
        activeIds.add(renderId);
        const x3D = (p.x - 400) * 0.05;
        const z3D = (p.y - 300) * 0.05;

        // Check if character already exists
        let charCtrl = characters.get(renderId);
        if (!charCtrl) {
          charCtrl = createCharacter3D(p.badgeNumber, !!p.isSelf, !!p.isTeammate,p.appearanceId||0);
          characters.set(renderId, charCtrl);
          scene.add(charCtrl.group);
          charCtrl.group.position.set(x3D, 0, z3D);
        }

        charCtrl.setCaptured(p.isCaptured);
        charCtrl.setInspected(p.isInspected);

        // Detect movement
        const prevX = charCtrl.group.position.x;
        const prevZ = charCtrl.group.position.z;
        const movedDist = Math.hypot(x3D - prevX, z3D - prevZ);
        const isMoving = (p.walkSpeed||0)>1;
        const facingAngle = isMoving ? Math.atan2(x3D - prevX, z3D - prevZ) : charCtrl.group.rotation.y;

        charCtrl.update(dt, x3D, z3D, isMoving, p.heading??facingAngle, p.walkSpeed||0,p.action);

        const myVisitor=currentState.players.find(v=>v.isSelf),distance=myVisitor?Math.hypot(p.x-myVisitor.x,p.y-myVisitor.y):Infinity;
        const head=new THREE.Vector3(x3D,1.9,z3D).project(camera),targeted=Math.abs(head.x)<.1&&Math.abs(head.y)<.3&&distance<160;
        const labelVisible=!p.isSelf&&(distance<90||targeted)&&visitorLabelVisible(camera,x3D,z3D,occluderMeshes);
        charCtrl.setLabel(labelVisible,!!p.isTeammate&&distance<220&&visitorLabelVisible(camera,x3D,z3D,occluderMeshes));
        // Update interactive shadow
        let shadowCtrl = shadows.get(renderId);
        if (!shadowCtrl) {
          shadowCtrl = createShadow3D();
          shadows.set(renderId, shadowCtrl);
          scene.add(shadowCtrl.meshGroup);
        }

        const touching = !!p.isSelf && !!targetFor(currentState,p);
        shadowCtrl.update({ x: charCtrl.group.position.x, z: charCtrl.group.position.z }, p.isSelf || p.isTeammate || p.isReaching ? p.shadow : {active:true,dirX:.6,dirY:.8,length:30,handX:p.x+18,handY:p.y+24,angle:.93}, touching, dt,p.appearanceId||0,!(p.isSelf||p.isTeammate||p.isReaching));
      });

      // Cleanup departed characters
      for (const [id, ctrl] of characters.entries()) {
        if (!activeIds.has(id)) {
          scene.remove(ctrl.group);
          ctrl.dispose();
          characters.delete(id);

          const sCtrl = shadows.get(id);
          if (sCtrl) {
            scene.remove(sCtrl.meshGroup);
            sCtrl.dispose();
            shadows.delete(id);
          }
        }
      }

      // Third-person Camera Following & Anti-Clipping
      if (currentMe) {
        const myX3D = (currentMe.x - 400) * 0.05;
        const myZ3D = (currentMe.y - 300) * 0.05;
        const playerHeadPos = new THREE.Vector3(myX3D, 1.45, myZ3D);

        // Smooth glide toward player
        cameraSmoothTarget.lerp(playerHeadPos, Math.min(1.0, dt * 10));

        // Desired camera distance and offset based on pitch and yaw
        const desiredDist = 5.2;
        const yaw = cameraYaw.current;
        const pitch = cameraPitch.current;

        const offsetX = Math.sin(yaw) * Math.cos(pitch) * desiredDist;
        const offsetY = Math.sin(pitch) * desiredDist;
        const offsetZ = Math.cos(yaw) * Math.cos(pitch) * desiredDist;

        const desiredCamPos = new THREE.Vector3(
          cameraSmoothTarget.x + offsetX,
          cameraSmoothTarget.y + offsetY,
          cameraSmoothTarget.z + offsetZ
        );

        // Camera Wall Collision Prevention:
        // Cast ray from player's head to desired camera position
        const rayDir = desiredCamPos.clone().sub(playerHeadPos).normalize();
        camRaycaster.set(playerHeadPos, rayDir);
        camRaycaster.far = desiredDist;

        const hits = camRaycaster.intersectObjects(occluderMeshes, false);
        if (hits.length > 0 && hits[0].distance < desiredDist) {
          // Pull camera in front of wall obstacle
          const safeDist = Math.max(0.15, hits[0].distance - 0.35);
          camera.position.copy(playerHeadPos).addScaledVector(rayDir, safeDist);
        } else {
          camera.position.copy(desiredCamPos);
        }

        camera.lookAt(cameraSmoothTarget.x, cameraSmoothTarget.y + 0.25, cameraSmoothTarget.z);
        // Read-only actual camera result for collision/orbit regression checks.
        (window as any).__cameraDiagnostics={position:camera.position.toArray(),head:playerHeadPos.toArray(),distance:camera.position.distanceTo(playerHeadPos),nearestHit:hits[0]?.distance??null};
      }

      renderer.render(scene, camera);recordVisitorFrame(renderer,characters,now,shadows);
      if(currentState.status==='loading'&&readyRound!==currentState.roundId&&characters.size===currentState.players.length){readyRound=currentState.roundId;reportSceneStage(readyRound,'ready');socket?.emit('scene_ready',{roundId:readyRound,aspect:camera.aspect});}
      animFrameId = requestAnimationFrame(renderLoop);
      }catch{failScene();}
    };

    animFrameId = requestAnimationFrame(renderLoop);

    // Resize handler
    const handleResize = () => {
      if (!container||sceneFailed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      unregister();renderer.domElement.removeEventListener('webglcontextlost',failScene);
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      disposeMuseum();
      characters.forEach((c) => c.dispose());
      shadows.forEach((s) => s.dispose());
      renderer.dispose();renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-neutral-950 select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {carryPrompt && <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 bg-white text-stone-900 px-4 py-2 rounded-lg text-sm">{carryPrompt}{me?.carryBlocked && <span className="ml-3 text-amber-700 font-bold">Blocked · turn or back up</span>}</div>}
      <div className="absolute top-24 left-4 z-20 pointer-events-auto"><MuseumMap state={gameState}/></div>
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top HUD: Badge, Objective, Escape & Controls */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-start pointer-events-none z-20">
        {/* Left: Role & Badge Info */}
        <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-700/80 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-none pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-500/50 flex items-center justify-center text-sky-400">
            <Ghost className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-sky-400">
                Shadow Thief
              </span>
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-600 text-[11px] font-mono font-bold text-neutral-200">
                Badge #{myBadge}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              {activeLamp?'Active lamp: '+activeLamp.id.replace('lamp_',''):'Move into an unobstructed lamp’s light'}
            </p>
          </div>
        </div>

        {/* Center: Mission Status & Theft Hold Progress */}
        <div className="flex flex-col items-center pointer-events-none gap-2">
          <MissionStatus state={gameState}/>
          {gameState.theft.inProgress && (
            <div className="mb-2 px-4 py-1.5 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>SHADOW INTERACTION: {Math.round(gameState.theft.progress * 100)}%</span>
            </div>
          )}

          {nearbyJammer && !isCaptured && !isTouching && <div className="max-w-xs rounded-xl border border-amber-400/60 bg-neutral-950/90 px-4 py-2 text-center text-xs text-amber-100">{nearbyJammer.cooldown>0?`Camera jammer recharging · ${Math.ceil(nearbyJammer.cooldown)}s`:'Camera jammer · align your shadow hand with the amber switch, then hold E for 3 seconds'}</div>}
          {isTouching && !isCaptured && (
            <div className="px-5 py-2.5 rounded-2xl bg-sky-900/95 border-2 border-sky-400 text-white font-extrabold text-sm shadow-[0_0_30px_rgba(56,189,248,0.5)] flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-mono">
                E
              </div>
              <span>HOLD [E] · {target?.name}</span>
            </div>
          )}
        </div>

        {/* Right: Esc Menu & Mute Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="w-10 h-10 rounded-xl bg-neutral-900/90 border border-neutral-700/80 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-xl"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenHowToPlay}
            className="w-10 h-10 rounded-xl bg-neutral-900/90 border border-neutral-700/80 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-xl"
            title="Help / Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEscMenu}
            className="flex items-center gap-2 px-3.5 h-10 rounded-xl bg-neutral-900/90 border border-neutral-700/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition-all shadow-xl"
          >
            <Menu className="w-4 h-4" />
            <span>ESC</span>
          </button>
        </div>
      </div>

      <div className="absolute right-4 bottom-28 z-20 bg-neutral-900/90 border border-neutral-700 rounded-xl px-3 py-2 text-[10px] text-neutral-200 pointer-events-none max-w-[290px]">
        <strong className="text-amber-200">Museum systems</strong><div className="text-red-300 mb-1">Red LIVE camera light = guard viewing that feed</div>
        {gameState.switches.map(sw=><div key={sw.id}>{sw.kind==='rescue'?'Holding release':sw.cameraId?.toUpperCase()+' jammer'} · {sw.cooldown>0?`ready in ${Math.ceil(sw.cooldown)}s`:'ready'}</div>)}
        <div className="text-neutral-400 mt-1">Hold E for 3 seconds · F admires an exhibit · Space moves lamps/displays</div>
      </div>
      {/* Captured Alert Overlay */}
      {isCaptured && (
        <div className="absolute inset-0 z-30 bg-red-950/40 backdrop-blur-none flex items-center justify-center pointer-events-none">
          <div className="bg-neutral-900/95 border-2 border-red-500 rounded-2xl p-6 text-center max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-900/60 text-red-400 mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              Apprehended by Security!
            </h3>
            <p className="text-xs text-neutral-300 mt-1">
              {gameState.duel?`Detained · automatic release in ${Math.ceil(gameState.duel.detentionRemaining)} seconds. The round clock continues. A second capture ends the Duel.`:'You are in the holding room. A free teammate must hold their shadow on the lavender release switch for three seconds to rescue you.'}
            </p>
          </div>
        </div>
      )}

      {/* Biometric Scan Warning */}
      {isInspected && !isCaptured && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-xl bg-red-600/90 border border-red-400 text-white font-black text-xs shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
          <AlertTriangle className="w-4 h-4" />
          <span>WARNING: SECURITY BIOMETRIC SCAN IN PROGRESS ON YOU!</span>
        </div>
      )}

      {/* Bottom Control Dock (Zero Viewport Occlusion per Three.js skill) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto transition-transform duration-300 flex flex-col items-center">
        {/* Collapse / Expand Toggle */}
        <button
          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
          className="mb-1 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-700 text-[10px] font-bold text-neutral-400 hover:text-white transition-colors shadow-lg"
        >
          {isControlsCollapsed ? '▲ Show Controls' : '▼ Hide Controls'}
        </button>

        {!isControlsCollapsed && (
          <div className="bg-neutral-900/95 border border-neutral-700/80 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-6 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-sky-400" />
              <span>
                <strong className="text-white">WASD</strong> Move Relative to Camera
              </span>
            </div>
            <div className="w-px h-5 bg-neutral-700" />
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="text-white">Click & Drag Mouse</strong> Orbit Camera
              </span>
            </div>
            <div className="w-px h-5 bg-neutral-700" />
            <div className="flex items-center gap-2">
              <div className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-[11px] font-mono text-white">
                Hold E
              </div>
              <span>{gameState.duel?'Steal / Disable Camera':'Steal / Rescue / Disable Camera'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
