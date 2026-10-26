import * as THREE from 'three';

/**
 * Procedural texture generator for museum materials (Zero external asset dependencies).
 */

// Procedural Light Matte Oak / Limestone Parquet Floor Texture (Daylight Museum)
export function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base bright warm oak / honed museum stone
  ctx.fillStyle = '#dfd6c7';
  ctx.fillRect(0, 0, 1024, 1024);

  // Parquet plank pattern
  const tileSize = 64;
  for (let x = 0; x < 1024; x += tileSize) {
    for (let y = 0; y < 1024; y += tileSize) {
      const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      // Subtle natural wood tone variation for daytime
      const toneVariance = Math.floor(Math.sin(x * 12.3 + y * 45.6) * 10);
      const r = Math.min(255, Math.max(0, 226 + toneVariance));
      const g = Math.min(255, Math.max(0, 216 + Math.floor(toneVariance * 0.9)));
      const b = Math.min(255, Math.max(0, 201 + Math.floor(toneVariance * 0.8)));

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Fine wood grain lines (subtle matte daytime look)
      ctx.strokeStyle = `rgba(168, 150, 130, 0.35)`;
      ctx.lineWidth = 1;
      const grainCount = 3;
      for (let gIdx = 0; gIdx < grainCount; gIdx++) {
        const offset = (gIdx / grainCount) * tileSize;
        ctx.beginPath();
        if (isAlt) {
          ctx.moveTo(x + offset, y + 2);
          ctx.lineTo(x + offset, y + tileSize - 2);
        } else {
          ctx.moveTo(x + 2, y + offset);
          ctx.lineTo(x + tileSize - 2, y + offset);
        }
        ctx.stroke();
      }

      // Delicate bevel seams between planks
      ctx.strokeStyle = 'rgba(150, 135, 120, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // Soft museum gallery ambient illumination (no crushed dark edges)
  const grad = ctx.createRadialGradient(512, 512, 200, 512, 512, 800);
  grad.addColorStop(0, 'rgba(255, 255, 250, 0.12)');
  grad.addColorStop(1, 'rgba(180, 165, 145, 0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Bright Cream Wall Texture with classical museum moldings
export function createWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Light warm cream / alabaster gallery wall
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(0, 0, 512, 512);

  // Lower classical wainscoting panel (refined light taupe/sandstone)
  ctx.fillStyle = '#eae2d6';
  ctx.fillRect(0, 280, 512, 232);

  // Antique gilded molding separator band
  ctx.fillStyle = '#d4af37'; // Gold trim accent
  ctx.fillRect(0, 276, 512, 4);
  ctx.fillStyle = '#bfa588';
  ctx.fillRect(0, 280, 512, 3);

  // Vertical wall panel trims
  for (let x = 32; x < 512; x += 128) {
    // Upper cream picture panel border
    ctx.strokeStyle = 'rgba(180, 160, 135, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, 30, 116, 220);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 6, 32, 112, 216);

    // Lower wainscot recessed molding
    ctx.strokeStyle = 'rgba(170, 150, 125, 0.35)';
    ctx.strokeRect(x + 8, 300, 108, 180);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(8, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Classical Oil Painting Textures
export function createPaintingTexture(theme: 'nocturne' | 'portrait' | 'monolith' | 'sapphire'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  if (theme === 'nocturne') {
    // Starry moonlit museum nocturne
    const grad = ctx.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, '#040b1e');
    grad.addColorStop(0.6, '#0f2744');
    grad.addColorStop(1, '#091522');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 384);

    // Moon
    ctx.fillStyle = '#fceea7';
    ctx.beginPath();
    ctx.arc(380, 90, 34, 0, Math.PI * 2);
    ctx.fill();

    // Silhouetted pines and hills
    ctx.fillStyle = '#02050b';
    ctx.beginPath();
    ctx.moveTo(0, 384);
    ctx.lineTo(0, 260);
    ctx.quadraticCurveTo(160, 200, 320, 280);
    ctx.quadraticCurveTo(420, 320, 512, 240);
    ctx.lineTo(512, 384);
    ctx.closePath();
    ctx.fill();
  } else if (theme === 'portrait') {
    // Renaissance portrait
    const grad = ctx.createRadialGradient(256, 170, 40, 256, 170, 300);
    grad.addColorStop(0, '#5a3d28');
    grad.addColorStop(1, '#110c08');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 384);

    // Silhouette of noble figure with ruff
    ctx.fillStyle = '#26170d';
    ctx.beginPath();
    ctx.ellipse(256, 160, 55, 75, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gilded ruff collar
    ctx.fillStyle = '#eeddc4';
    ctx.beginPath();
    ctx.ellipse(256, 235, 70, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme === 'sapphire') {
    // Mystical deep blue gemstone study
    const grad = ctx.createRadialGradient(256, 192, 20, 256, 192, 260);
    grad.addColorStop(0, '#1e75ff');
    grad.addColorStop(0.4, '#0a2e72');
    grad.addColorStop(1, '#020716');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 384);

    // Geometric facets
    ctx.strokeStyle = '#8bc4ff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(180, 120, 152, 144);
    ctx.beginPath();
    ctx.moveTo(256, 70);
    ctx.lineTo(360, 192);
    ctx.lineTo(256, 314);
    ctx.lineTo(152, 192);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Abstract architectural monolith
    ctx.fillStyle = '#181a20';
    ctx.fillRect(0, 0, 512, 384);
    const grad = ctx.createLinearGradient(0, 0, 512, 384);
    grad.addColorStop(0, '#cda85c');
    grad.addColorStop(0.5, '#443522');
    grad.addColorStop(1, '#141416');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(100, 384);
    ctx.lineTo(256, 60);
    ctx.lineTo(412, 384);
    ctx.closePath();
    ctx.fill();
  }

  // Gilded ornate outer frame border
  ctx.strokeStyle = '#c59b27';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, 494, 366);
  ctx.strokeStyle = '#ffe885';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 472, 344);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Visitor Badge Texture (#101, #102, etc.)
export function createBadgeTexture(badgeNumber: number, isThiefSelf: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Badge background card
  ctx.fillStyle = isThiefSelf ? '#162238' : '#22252a';
  ctx.fillRect(0, 0, 256, 160);

  // Border
  ctx.strokeStyle = isThiefSelf ? '#38bdf8' : '#e2e8f0';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 152);

  // Top header bar
  ctx.fillStyle = isThiefSelf ? '#0284c7' : '#475569';
  ctx.fillRect(4, 4, 248, 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MUSEUM PASS', 128, 25);

  // Badge Number
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 56px monospace';
  ctx.fillText(`#${badgeNumber}`, 128, 100);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
