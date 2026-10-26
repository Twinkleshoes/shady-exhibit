import {reportSceneStage,registerSceneResource,clearSceneResources} from '../game/scene-preparation.js';
import {recordVisitorFrame} from '../game/visitor-diagnostics.js';
import {visitorLabelVisible} from '../game/visitor-labels.js';
import {cameraTarget} from '../game/cameras.js';
import {CAMERA_PAN_LIMIT} from '../game/settings.js';
import {MissionStatus,MuseumMap} from './MissionHUD.js';
import * as THREE from 'three';
import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Shield, Battery, BatteryCharging, AlertOctagon, HelpCircle, Volume2, VolumeX, Eye, CheckCircle2, Menu, Video, Target, Camera } from 'lucide-react';
import { ClientGameState } from '../types/game.js';
import { soundManager } from '../utils/audio.js';
import { buildMuseumScene, CameraPreset, MuseumSceneContext } from '../game/scene3d.js';
import { createCharacter3D, CharacterController } from '../game/character3d.js';
import { createShadow3D, Shadow3DController } from '../game/shadow3d.js';

interface Guard3DViewProps {
  socket: Socket | null;
  gameState: ClientGameState;
  onOpenHowToPlay: () => void;
  onOpenEscMenu: () => void;
  isInputEnabled: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Guard3DView: React.FC<Guard3DViewProps> = ({
  socket,
  gameState,
  onOpenHowToPlay,
  onOpenEscMenu,
  isMuted,
  isInputEnabled,
  onToggleMute,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoverBadge,setHoverBadge]=useState<number|null>(null);
  const hoverRef=useRef<number|null>(null);hoverRef.current=hoverBadge;
  const hoverTime=useRef(0);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [activeCamId, setActiveCamId] = useState<string>('cam_01');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [occlusionWarning, setOcclusionWarning] = useState<string | null>(null);

  const activeCamIdRef = useRef<string>('cam_01');
  activeCamIdRef.current = activeCamId;

  const cameraPresetsRef = useRef<CameraPreset[]>([]);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const occluderMeshesRef = useRef<THREE.Mesh[]>([]);
  const characterGroupsRef = useRef<Map<number, THREE.Group>>(new Map());

  const panKeys=useRef(new Set<string>());
  const buttonPan=useRef(0);
  const panAngle=gameState.guard.cameraPans[activeCamId]||0;
  const panDisabled=!isInputEnabled||gameState.status!=='playing'||!!gameState.guard.disabledCameras[activeCamId];
  useEffect(()=>{
    const stop=()=>{panKeys.current.clear();buttonPan.current=0;socket?.emit('pan_camera',{cameraId:activeCamId,direction:0});};
    stop();if(panDisabled)return;
    const codes=['KeyA','KeyD','ArrowLeft','ArrowRight'];
    const down=(e:KeyboardEvent)=>{if(e.repeat&&!panKeys.current.has(e.code))return;if((e.target as HTMLElement)?.matches('input,textarea,select'))return;if(codes.includes(e.code)){e.preventDefault();panKeys.current.add(e.code);}};
    const up=(e:KeyboardEvent)=>{if(codes.includes(e.code)){e.preventDefault();panKeys.current.delete(e.code);}};
    let last=0;
    const timer=setInterval(()=>{
      const left=panKeys.current.has('KeyA')||panKeys.current.has('ArrowLeft'),right=panKeys.current.has('KeyD')||panKeys.current.has('ArrowRight');
      const direction=buttonPan.current||Number(right)-Number(left);
      if(direction!==0||direction!==last)socket?.emit('pan_camera',{cameraId:activeCamId,direction});last=direction;
    },50);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',stop);
    return()=>{clearInterval(timer);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',stop);stop();};
  },[socket,activeCamId,panDisabled]);
  const holdPan=(e:React.PointerEvent<HTMLButtonElement>,direction:number)=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);buttonPan.current=direction;socket?.emit('pan_camera',{cameraId:activeCamId,direction});};
  const stopPan=()=>{buttonPan.current=0;socket?.emit('pan_camera',{cameraId:activeCamId,direction:0});};

  // Escape key handler for game menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState.status==='playing') {
        onOpenEscMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenEscMenu,gameState.status]);

  // Surveillance Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour12: false }) +
          '.' +
          String(Math.floor(now.getMilliseconds() / 100))
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, []);

  const selectedSuspect = gameState.players.find((p) => p.badgeNumber === selectedBadge);
  useEffect(()=>{if(selectedBadge!==null&&!gameState.players.some(p=>p.badgeNumber===selectedBadge&&!p.isCaptured)){setSelectedBadge(null);setHoverBadge(null);hoverRef.current=null;}},[gameState.players,selectedBadge]);
  const isSelectedCaptured = !!selectedSuspect?.isCaptured;
  const isSelectedVisible = !!selectedSuspect?.visibleOnFeed;
  const selectedRef = useRef(selectedBadge); selectedRef.current=selectedBadge;
  useEffect(() => {
    const el=mountRef.current;
    socket?.emit('select_camera',{cameraId:activeCamId,aspect:el ? el.clientWidth/el.clientHeight : 1.5});
    setSelectedBadge(null);
  },[activeCamId,socket,gameState.status]);

  // Inspect Suspect handler
  const handleInspect = () => {
    if (!selectedBadge || isSelectedCaptured || !isSelectedVisible) return;
    if (gameState.guard.charges <= 0) {
      soundManager.playAlert();
      return;
    }
    soundManager.playClick();
    socket?.emit('guard_inspect', { targetBadgeNumber: selectedBadge });
  };

  // 3D Canvas Click Handler with Line-of-Sight Occlusion Validation
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>,hover=false) => {
    if(hover&&performance.now()-hoverTime.current<60)return;if(hover)hoverTime.current=performance.now();
    const mount = mountRef.current;
    const camera = cameraRef.current;
    if (!mount || !camera) return;

    const rect = mount.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Collect all candidate target meshes
    const visitorMeshes: { badge: number; object: THREE.Object3D }[] = [];
    characterGroupsRef.current.forEach((grp, badge) => {
      grp.traverse((child) => {
        if ((child instanceof THREE.Mesh || child instanceof THREE.Sprite) && child.visible&&!child.userData.notVisitorHit) {
          visitorMeshes.push({ badge, object: child });
        }
      });
    });

    // Check intersections with occluders first
    const occluderHits = raycaster.intersectObjects(occluderMeshesRef.current, false);
    const closestOccluderDist = occluderHits.length > 0 ? occluderHits[0].distance : Infinity;

    // Check intersections with visitors
    const candidateObjects = visitorMeshes.map((vm) => vm.object);
    const visitorHits = raycaster.intersectObjects(candidateObjects, false);

    if (visitorHits.length > 0) {
      const hit = visitorHits[0];
      const match = visitorMeshes.find((vm) => vm.object === hit.object);

      if (match) {
        // If an occluder (wall/pillar/display case) is between camera and visitor, block selection!
        if (closestOccluderDist < hit.distance - 0.2) {
          if(hover){setHoverBadge(null);return;}
          setOcclusionWarning(
            `TARGET OCCLUDED: Suspect #${match.badge} is hidden behind an exhibit obstacle!`
          );
          soundManager.playAlert();
          setTimeout(() => setOcclusionWarning(null), 3000);
          return;
        }

        if(!gameState.players.find(p=>p.badgeNumber===match.badge)?.visibleOnFeed) return;
        if(hover){setHoverBadge(match.badge);return;}
        setSelectedBadge(match.badge);
        soundManager.playClick();
      }
    }
    if(hover)setHoverBadge(null);
  };

  // Three.js 3D Guard CCTV Scene
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const preparingRound=gameStateRef.current.roundId;let sceneFailed=false,animFrameId=0;reportSceneStage(preparingRound,'graphics');

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
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    const failScene=(event?:Event)=>{event?.preventDefault();reportSceneStage(preparingRound,'error');clearSceneResources(preparingRound);};
    renderer.domElement.addEventListener('webglcontextlost',failScene);
    const unregister=registerSceneResource(preparingRound,()=>{sceneFailed=true;cancelAnimationFrame(animFrameId);renderer.domElement.removeEventListener('webglcontextlost',failScene);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();});

    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 220);
    cameraRef.current = camera;

    // Build Museum 3D Environment
    reportSceneStage(preparingRound,'geometry');
    const museumContext: MuseumSceneContext = buildMuseumScene();
    reportSceneStage(preparingRound,'visitors');
    const { scene, occluderMeshes, cameraPresets, update: updateMuseum, dispose: disposeMuseum } = museumContext;

    cameraPresetsRef.current = cameraPresets;
    occluderMeshesRef.current = occluderMeshes;

    // Fixed camera preset positions
    const initialPreset = cameraPresets[0];
    camera.position.copy(initialPreset.position);
    camera.lookAt(initialPreset.target);

    // Characters map
    const characters = new Map<string, CharacterController>();
    const shadows = new Map<string, Shadow3DController>();
    const reachingShadows = new Map<string, Shadow3DController>();

    let readyRound='';

    let lastTime = performance.now();

    // Guard Target Selection Reticle in 3D
    const targetReticleGeo = new THREE.RingGeometry(0.7, 0.8, 32);
    targetReticleGeo.rotateX(-Math.PI / 2);
    const targetReticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const targetReticle = new THREE.Mesh(targetReticleGeo, targetReticleMat);
    targetReticle.position.y = 0.05;
    targetReticle.visible = false;
    scene.add(targetReticle);

    const currentCamTarget = new THREE.Vector3().copy(initialPreset.target);

    // Render loop
    const renderLoop = (now: number) => {
      if(sceneFailed)return;
      try{
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const currentState = gameStateRef.current;

      // Update Museum props
      updateMuseum(dt, currentState);

      // Camera preset transition
      const activePreset =
        cameraPresets.find((p) => p.id === currentState.guard.activeCameraId) || cameraPresets[0];

      camera.position.copy(activePreset.position);
      currentCamTarget.copy(cameraTarget(activePreset.id,currentState.guard.cameraPans[activePreset.id]||0));
      camera.lookAt(currentCamTarget);

      // Synchronize 3D characters
      // NOTE: Guard NEVER sees thief role markers or teammate glows (isSelf=false, isTeammate=false)
      const activeIds = new Set<string>();
      characterGroupsRef.current.clear();

      currentState.players.forEach((p) => {
        const renderId=p.id+':'+p.badgeNumber+':'+p.appearanceId;
        activeIds.add(renderId);
        const x3D = (p.x - 400) * 0.05;
        const z3D = (p.y - 300) * 0.05;

        let charCtrl = characters.get(renderId);
        if (!charCtrl) {
          charCtrl = createCharacter3D(p.badgeNumber,false,false,p.appearanceId||0);
          characters.set(renderId, charCtrl);
          scene.add(charCtrl.group);
          charCtrl.group.position.set(x3D, 0, z3D);
        }

        characterGroupsRef.current.set(p.badgeNumber, charCtrl.group);

        charCtrl.setCaptured(p.isCaptured);
        charCtrl.setInspected(p.isInspected);

        const prevX = charCtrl.group.position.x;
        const prevZ = charCtrl.group.position.z;
        const movedDist = Math.hypot(x3D - prevX, z3D - prevZ);
        const isMoving = (p.walkSpeed||0)>1;
        const facingAngle = isMoving ? Math.atan2(x3D - prevX, z3D - prevZ) : charCtrl.group.rotation.y;

        charCtrl.update(dt, x3D, z3D, isMoving, p.heading??facingAngle, p.walkSpeed||0,p.action);
        charCtrl.setLabel(!!p.visibleOnFeed&&(p.badgeNumber===selectedRef.current||p.badgeNumber===hoverRef.current)&&visitorLabelVisible(camera,x3D,z3D,occluderMeshes));

        // Synchronize floor shadows
        let shadowCtrl = shadows.get(renderId);
        if (!shadowCtrl) {
          shadowCtrl = createShadow3D();
          shadows.set(renderId, shadowCtrl);
          scene.add(shadowCtrl.meshGroup);
        }
        shadowCtrl.update({ x: charCtrl.group.position.x, z: charCtrl.group.position.z }, p.isReaching ? {...p.shadow,active:false} : {active:true,dirX:.6,dirY:.8,length:30,handX:p.x+18,handY:p.y+24,angle:.93}, false, dt,p.appearanceId||0,true);
      });

      const reachingIds=new Set<string>();
      for(const sh of currentState.visibleShadows) {
        reachingIds.add(sh.id);let ctrl=reachingShadows.get(sh.id);
        if(!ctrl){ctrl=createShadow3D();reachingShadows.set(sh.id,ctrl);scene.add(ctrl.meshGroup);}
        const visitor=currentState.players.find(p=>p.x===sh.x&&p.y===sh.y);
        const rendered=visitor&&characters.get(visitor.id+':'+visitor.badgeNumber+':'+visitor.appearanceId)?.group.position;
        ctrl.update({x:rendered?.x??(sh.x-400)*.05,z:rendered?.z??(sh.y-300)*.05},sh.shadow,false,dt);
      }
      for(const [id,ctrl] of reachingShadows)if(!reachingIds.has(id)){scene.remove(ctrl.meshGroup);ctrl.dispose();reachingShadows.delete(id);}
      // Cleanup
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

      // Update Reticle position
      const selected = currentState.players.find((p) => p.badgeNumber === selectedRef.current && p.visibleOnFeed);
      if (selected) {
        targetReticle.visible = true;
        targetReticle.position.x = (selected.x - 400) * 0.05;
        targetReticle.position.z = (selected.y - 300) * 0.05;
        targetReticle.rotation.y += dt * 2.0;
      } else {
        targetReticle.visible = false;
      }

      renderer.render(scene, camera);recordVisitorFrame(renderer,characters,now,shadows);
      // Read-only public lens state for actual-view occlusion regression checks.
      (window as any).__guardCameraView={cameraId:currentState.guard.activeCameraId,pan:currentState.guard.cameraPans[currentState.guard.activeCameraId]||0,aspect:camera.aspect};
      if(currentState.status==='loading'&&readyRound!==currentState.roundId&&characters.size===currentState.players.length){readyRound=currentState.roundId;reportSceneStage(readyRound,'ready');socket?.emit('scene_ready',{roundId:readyRound,aspect:camera.aspect});}
      animFrameId = requestAnimationFrame(renderLoop);
      }catch{failScene();}
    };

    animFrameId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!container||sceneFailed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      socket?.emit('select_camera',{cameraId:activeCamIdRef.current,aspect:w/h});
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
      reachingShadows.forEach(s=>s.dispose());
      renderer.dispose();renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-neutral-950 select-none flex flex-col font-mono text-neutral-200">
      {/* Top Header: CCTV Control Panel */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/90 px-4 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
                Museum Security Command
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                {gameState.guard.isCameraLive?'LIVE 3D FEED':'FEED DISRUPTED'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">
              Terminal: C-300 // Auth Level: Chief Inspector
            </p>
          </div>
        </div>

        {/* Battery Charges Indicator */}
        <div className="flex items-center gap-3 bg-neutral-950 px-3.5 py-1.5 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-1.5">
            {gameState.guard.charges > 0 ? (
              <Battery className="w-4 h-4 text-emerald-400" />
            ) : (
              <BatteryCharging className="w-4 h-4 text-amber-400 animate-pulse" />
            )}
            <span className="text-xs font-bold text-neutral-300">Scanner Batteries:</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(gameState.guard.maxCharges)].map((_, i) => (
              <div
                key={i}
                className={`w-6 h-3 rounded-sm transition-all border ${
                  i < gameState.guard.charges
                    ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-neutral-800 border-neutral-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-neutral-400">
            {gameState.guard.charges}/{gameState.guard.maxCharges}
          </span>
        </div>

        {/* Action Controls & Esc Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-all"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenHowToPlay}
            className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-all"
            title="Help / Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenEscMenu}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
          >
            <Menu className="w-4 h-4" />
            <span>ESC</span>
          </button>
        </div>
      </header>

      <div className="flex justify-center items-center gap-4 bg-neutral-950 py-1"><MissionStatus state={gameState}/><button className="rounded-lg border border-cyan-700 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50" disabled={!isInputEnabled||gameState.tour.used} onClick={()=>{if(window.confirm('Spend your single Guided Tour Announcement to invite visitors to the north side of the central atrium?'))socket?.emit('announce_tour');}}>{gameState.tour.used?'Guided Tour — spent':'Announce Guided Tour — 1 use'}</button></div>
      {/* Main Split Layout: 3D CCTV Viewport + Suspect & Scanner Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 3D Camera Feed Viewport */}
        <div
          ref={mountRef}
          onClick={e=>handleCanvasClick(e)}
          onMouseMove={e=>handleCanvasClick(e,true)} onMouseLeave={()=>setHoverBadge(null)}
          className="flex-1 relative cursor-crosshair overflow-hidden bg-black"
        >
          {!gameState.guard.isCameraLive && <div className="absolute inset-0 bg-neutral-950 z-10 flex flex-col items-center justify-center text-amber-300 pointer-events-none"><strong className="text-2xl">CAMERA DISRUPTED</strong><span>Feed returns in {Math.ceil(gameState.guard.disabledCameras[activeCamId]||0)} seconds · switch cameras to continue</span></div>}
          <div className="absolute top-14 left-4 z-20" onClick={e=>e.stopPropagation()}><MuseumMap state={gameState} onCamera={setActiveCamId}/></div>
          {/* CCTV Info Overlay Banner */}
          <div className="absolute top-3 left-4 right-4 flex justify-between items-center pointer-events-none z-20 text-xs">
            <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-lg border border-neutral-800 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold tracking-widest">{gameState.guard.isCameraLive?'● REC':'● OFFLINE'}</span>
              <span className="text-neutral-400">|</span>
              <span className="text-neutral-200">
                {cameraPresetsRef.current.find((p) => p.id === activeCamId)?.name || 'CAM 01'}
              </span>
            </div>

            <div className="bg-black/70 px-3 py-1.5 rounded-lg border border-neutral-800 text-neutral-300 font-mono text-[11px]">
              {currentTime}
            </div>
          </div>

          {/* Occlusion Warning Toast */}
          {occlusionWarning && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-600 border border-amber-400 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
              <AlertOctagon className="w-4 h-4" />
              <span>{occlusionWarning}</span>
            </div>
          )}

          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/95 border border-neutral-600 rounded-xl p-2 w-80 text-center" onClick={e=>e.stopPropagation()}>
            <div className="text-[11px] text-neutral-300 mb-2">Pan: A/D or ←/→ · <output aria-label="Selected camera pan" className="text-amber-200 font-bold">{(panAngle*180/Math.PI).toFixed(1)}°</output> · ±{Math.round(CAMERA_PAN_LIMIT*180/Math.PI)}°</div>
            <div className="flex justify-center gap-2">
              <button aria-label="Pan camera left" disabled={panDisabled} onPointerDown={e=>holdPan(e,-1)} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan} className="px-4 py-1 rounded bg-neutral-700 disabled:opacity-40">◀ Left</button>
              <button aria-label="Center camera" disabled={panDisabled} onClick={()=>socket?.emit('center_camera',{cameraId:activeCamId})} className="px-3 py-1 rounded bg-neutral-700 disabled:opacity-40">Center</button>
              <button aria-label="Pan camera right" disabled={panDisabled} onPointerDown={e=>holdPan(e,1)} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan} className="px-4 py-1 rounded bg-neutral-700 disabled:opacity-40">Right ▶</button>
            </div>
          </div>
          {/* Camera Feed Switcher Buttons (Bottom Center of Viewport) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 grid grid-cols-3 gap-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-1.5 shadow-2xl">
            {cameraPresetsRef.current.map((cam) => (
              <button
                key={cam.id}
                aria-pressed={activeCamId===cam.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCamId(cam.id);
                  soundManager.playClick();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeCamId === cam.id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cam.name.split(':')[0]}{gameState.guard.disabledCameras[cam.id]>0?' · OFF':''}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Suspect Roster & Biometric Inspection Station */}
        <div className="w-80 border-l border-neutral-800 bg-neutral-900/95 flex flex-col z-20">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Suspect Roster</span>
            </h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Click visitors on 3D CCTV or from list below
            </p>
          </div>

          {/* Suspects List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {gameState.players.filter(p=>p.visibleOnFeed).map((suspect) => {
              const isSelected = suspect.badgeNumber === selectedBadge;
              const isBeingScanned =
                gameState.guard.inspecting?.targetBadge === suspect.badgeNumber;

              return (
                <div
                  key={suspect.id}
                  onClick={() => {
                    setSelectedBadge(suspect.badgeNumber);
                    soundManager.playClick();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          suspect.isCaptured
                            ? 'bg-red-950 text-red-400 border border-red-500/40'
                            : isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        #{suspect.badgeNumber}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-neutral-200">
                          {suspect.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Visible on this feed
                        </div>
                      </div>
                    </div>

                    {suspect.isCaptured ? (
                      <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/40 text-[10px] font-bold text-red-400">
                        APPREHENDED
                      </span>
                    ) : isBeingScanned ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-[10px] font-bold text-amber-400 animate-pulse">
                        SCANNING
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                        VISIBLE
                      </span>
                    )}
                  </div>

                  {/* Active Scan Progress Bar */}
                  {isBeingScanned && gameState.guard.inspecting && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] text-amber-300 font-bold mb-1">
                        <span>BIOMETRIC SCANNING...</span>
                        <span>{Math.round(gameState.guard.inspecting.progress * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-100"
                          style={{
                            width: `${Math.round(gameState.guard.inspecting.progress * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <section className="h-44 shrink-0 overflow-y-auto p-3 border-t border-neutral-700 bg-neutral-950/70 text-[10px]" aria-label="Security alerts">
            <strong className="text-amber-200 uppercase tracking-wide">Security alerts</strong>
            {gameState.guard.rechargingTimeLeft.length>0&&<div className="text-cyan-300 mt-1">Charge returns: {gameState.guard.rechargingTimeLeft.map((t,i)=><span key={i}>{i?', ':''}{Math.ceil(t)}s</span>)}</div>}
            <ol className="mt-2 space-y-2" aria-live="polite">{gameState.guard.recentAlerts.slice(-4).reverse().map((alert,i)=><li key={alert+i} className={i===0?'text-amber-100':'text-neutral-400'}>{alert}</li>)}</ol>
          </section>
          {/* Biometric Scan Trigger Button */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/80">
            <button
              onClick={handleInspect}
              disabled={
                !selectedBadge ||
                isSelectedCaptured || !isSelectedVisible ||
                gameState.guard.charges <= 0 ||
                !!gameState.guard.inspecting
              }
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all ${
                !selectedBadge || isSelectedCaptured || !isSelectedVisible || gameState.guard.charges <= 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>
                {gameState.guard.inspecting ? 'Inspection in progress...' : !selectedBadge ? 'Select Suspect on CCTV' : !isSelectedVisible ? 'Suspect left this feed' : isSelectedCaptured
                  ? 'Target Apprehended'
                  : gameState.guard.charges <= 0
                  ? 'Recharging Scanner...'
                  : selectedBadge
                  ? `Inspect Suspect #${selectedBadge}`
                  : 'Select Suspect on CCTV'}
              </span>
            </button>
            <p className="text-[10px] text-neutral-500 text-center mt-2">
              Consumes 1 battery charge • Target must remain in CCTV view
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
