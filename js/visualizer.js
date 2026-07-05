/* ==========================================================================
   VISUALIZER.JS — the Three.js audio-reactive 3D scene
   ========================================================================== */
(function () {
  const engine = window.neonAudio;
  const holder = document.getElementById('viz-canvas-holder');
  const stage = document.getElementById('viz-stage');

  /* ---------------------------------------------------------------------- */
  /*  THEME COLOR HELPERS                                                    */
  /* ---------------------------------------------------------------------- */
  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      accent: new THREE.Color(cs.getPropertyValue('--accent').trim() || '#2de2ff'),
      accent2: new THREE.Color(cs.getPropertyValue('--accent-2').trim() || '#a855f7'),
      accent3: new THREE.Color(cs.getPropertyValue('--accent-3').trim() || '#ff4fa3'),
    };
  }

  /* ---------------------------------------------------------------------- */
  /*  RENDERER / SCENE / CAMERA                                              */
  /* ---------------------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060c, 0.045);

  const camera = new THREE.PerspectiveCamera(60, stage.clientWidth / stage.clientHeight, 0.1, 200);
  camera.position.set(0, 2.4, 11);
  camera.lookAt(0, 0, 0);

  window.addEventListener('resize', () => {
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth, stage.clientHeight);
  });

  /* -- Lights -------------------------------------------------------------- */
  const ambient = new THREE.AmbientLight(0x334, 0.6);
  scene.add(ambient);
  const light1 = new THREE.PointLight(0x2de2ff, 3, 40);
  light1.position.set(6, 6, 6);
  scene.add(light1);
  const light2 = new THREE.PointLight(0xa855f7, 3, 40);
  light2.position.set(-6, 3, -4);
  scene.add(light2);
  const light3 = new THREE.PointLight(0xff4fa3, 2, 30);
  light3.position.set(0, -3, 6);
  scene.add(light3);

  /* -- Stars ---------------------------------------------------------------- */
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 120;
    starPos[i * 3 + 1] = Math.random() * 60 - 10;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* -- Neon floor grid -------------------------------------------------------- */
  const floor = new THREE.GridHelper(80, 60, 0x2de2ff, 0x141a3a);
  floor.position.y = -4.2;
  floor.material.transparent = true;
  floor.material.opacity = 0.35;
  scene.add(floor);
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshBasicMaterial({ color: 0x0b1024, transparent: true, opacity: 0.5 })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -4.25;
  scene.add(floorGlow);

  /* -- Core glowing sphere ------------------------------------------------------ */
  const coreGroup = new THREE.Group();
  const coreGeo = new THREE.IcosahedronGeometry(1.6, 3);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2de2ff, emissive: 0x2de2ff, emissiveIntensity: 1.2,
    wireframe: false, roughness: 0.25, metalness: 0.3, transparent: true, opacity: 0.9,
  });
  const coreSphere = new THREE.Mesh(coreGeo, coreMat);
  coreGroup.add(coreSphere);

  const wireGeo = new THREE.IcosahedronGeometry(1.95, 1);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.5 });
  const wireSphere = new THREE.Mesh(wireGeo, wireMat);
  coreGroup.add(wireSphere);
  scene.add(coreGroup);

  /* -- Floating rings ------------------------------------------------------------ */
  const ringGroup = new THREE.Group();
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.TorusGeometry(3.2 + i * 0.9, 0.025, 8, 100);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4fa3, transparent: true, opacity: 0.45 - i * 0.06 });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2 + i * 0.3;
    ring.rotation.y = i * 0.4;
    ringGroup.add(ring);
    rings.push(ring);
  }
  scene.add(ringGroup);

  /* -- Frequency bars (circular array) --------------------------------------------- */
  const BAR_COUNT = 64;
  const barGroup = new THREE.Group();
  const bars = [];
  const barGeo = new THREE.BoxGeometry(0.14, 1, 0.14);
  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (i / BAR_COUNT) * Math.PI * 2;
    const mat = new THREE.MeshStandardMaterial({ color: 0x2de2ff, emissive: 0x2de2ff, emissiveIntensity: 0.7 });
    const bar = new THREE.Mesh(barGeo, mat);
    const radius = 4.6;
    bar.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    bar.lookAt(0, 0, 0);
    barGroup.add(bar);
    bars.push(bar);
  }
  scene.add(barGroup);

  /* -- Particle system (galaxy / ambient) -------------------------------------------- */
  const PARTICLE_COUNT = 2200;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PARTICLE_COUNT * 3);
  const pRadius = new Float32Array(PARTICLE_COUNT);
  const pAngle = new Float32Array(PARTICLE_COUNT);
  const pSpeed = new Float32Array(PARTICLE_COUNT);
  const pHeight = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 2 + Math.random() * 12;
    const a = Math.random() * Math.PI * 2;
    pRadius[i] = r; pAngle[i] = a; pSpeed[i] = 0.05 + Math.random() * 0.25;
    pHeight[i] = (Math.random() - 0.5) * 8;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = pHeight[i];
    pPos[i * 3 + 2] = Math.sin(a) * r;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xa855f7, size: 0.05, transparent: true, opacity: 0.75 });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---------------------------------------------------------------------- */
  /*  MODE STATE                                                             */
  /* ---------------------------------------------------------------------- */
  let currentMode = 'sphere';
  let randomModeOn = false;
  let randomTimer = 0;
  const MODES = ['sphere', 'bars', 'tunnel', 'galaxy'];

  function applyModeVisibility(mode) {
    coreGroup.visible = mode === 'sphere' || mode === 'tunnel';
    ringGroup.visible = mode === 'sphere' || mode === 'tunnel';
    barGroup.visible = mode === 'bars';
    particles.visible = mode === 'galaxy' || mode === 'sphere';
  }
  applyModeVisibility(currentMode);

  document.querySelectorAll('.mode-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const m = chip.dataset.mode;
      if (m === 'random') {
        randomModeOn = true;
        showToast('Random mode: cycling scenes');
      } else {
        randomModeOn = false;
        currentMode = m;
        applyModeVisibility(currentMode);
        showToast(`Mode: ${chip.textContent}`);
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  AUDIO SOURCE WIRING                                                    */
  /* ---------------------------------------------------------------------- */
  const badgeSourceText = document.getElementById('badge-source-text');
  const badgeSource = document.getElementById('badge-source');
  const vizMiniEq = document.getElementById('viz-mini-eq');
  const vizTitle = document.getElementById('viz-track-title');
  const vizArtist = document.getElementById('viz-track-artist');
  const noAudioMsg = document.getElementById('no-audio-msg');
  const demoSelect = document.getElementById('viz-demo-select');
  const fileInput = document.getElementById('viz-file-input');
  const uploadBtn = document.getElementById('viz-upload-btn');
  const micBtn = document.getElementById('viz-mic-btn');

  window.TRACKS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = `${t.title} — ${t.artist}`;
    demoSelect.appendChild(opt);
  });

  function setSourceUI(active, label, sub) {
    badgeSource.classList.toggle('live', active);
    badgeSourceText.textContent = label;
    vizMiniEq.classList.toggle('paused', !active);
    vizTitle.textContent = label;
    vizArtist.textContent = sub || '';
    noAudioMsg.classList.toggle('hidden', active);
  }

  demoSelect.addEventListener('change', async () => {
    const track = window.TRACKS.find(t => t.id === demoSelect.value);
    if (!track) return;
    engine.disableMic();
    showToast(`Loading "${track.title}"…`);
    const buffer = await engine.generateDemoBuffer(track);
    engine.playBuffer(buffer, 0);
    engine.onEnded = () => setSourceUI(false, 'Nothing playing', 'Pick a demo track, drop a file, or use your mic');
    setSourceUI(true, track.title, track.artist + ' · Demo track');
  });

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    engine.disableMic();
    showToast(`Decoding "${file.name}"…`);
    try {
      const buffer = await engine.decodeFile(await file.arrayBuffer());
      engine.playBuffer(buffer, 0);
      engine.onEnded = () => setSourceUI(false, 'Nothing playing', 'Pick a demo track, drop a file, or use your mic');
      setSourceUI(true, file.name.replace(/\.[^.]+$/, ''), 'Uploaded file');
    } catch { showToast('Could not decode that file'); }
  });

  micBtn.addEventListener('click', async () => {
    if (engine.mode === 'mic') {
      engine.disableMic();
      micBtn.classList.remove('toggled');
      setSourceUI(false, 'Nothing playing', 'Pick a demo track, drop a file, or use your mic');
      return;
    }
    try {
      await engine.enableMic();
      micBtn.classList.add('toggled');
      setSourceUI(true, 'Live Microphone', 'Reacting to your surroundings');
      showToast('Microphone enabled');
    } catch (err) {
      showToast('Microphone permission denied');
    }
  });

  // Allow drag & drop onto the whole stage
  ['dragover', 'dragenter'].forEach(evt => stage.addEventListener(evt, e => e.preventDefault()));
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('audio')) return;
    engine.disableMic();
    const buffer = await engine.decodeFile(await file.arrayBuffer());
    engine.playBuffer(buffer, 0);
    engine.onEnded = () => setSourceUI(false, 'Nothing playing', 'Pick a demo track, drop a file, or use your mic');
    setSourceUI(true, file.name.replace(/\.[^.]+$/, ''), 'Uploaded file (dropped)');
  });

  /* ---------------------------------------------------------------------- */
  /*  FULLSCREEN / SCREENSHOT / RECORD / FPS                                 */
  /* ---------------------------------------------------------------------- */
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      stage.requestFullscreen?.();
      document.body.classList.add('fullscreen-active');
    } else {
      document.exitFullscreen?.();
      document.body.classList.remove('fullscreen-active');
    }
  });

  document.getElementById('btn-screenshot').addEventListener('click', () => {
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `neon-visualizer-${Date.now()}.png`;
    a.click();
    showToast('Screenshot saved');
  });

  let recorder = null, recordedChunks = [];
  const recordBtn = document.getElementById('btn-record');
  recordBtn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      return;
    }
    const stream = renderer.domElement.captureStream(30);
    recordedChunks = [];
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (e) {
      showToast('Recording not supported in this browser');
      return;
    }
    recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
    recorder.onstop = () => {
      recordBtn.classList.remove('active');
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `neon-visualizer-clip-${Date.now()}.webm`;
      a.click();
      showToast('Clip downloaded');
    };
    recorder.start();
    recordBtn.classList.add('active');
    showToast('Recording… click again to stop');
    setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 15000);
  });

  const fpsBadge = document.getElementById('badge-fps');
  let fpsVisible = true;
  document.getElementById('btn-fps-toggle').addEventListener('click', (e) => {
    fpsVisible = !fpsVisible;
    fpsBadge.style.display = fpsVisible ? 'flex' : 'none';
    e.currentTarget.classList.toggle('active', fpsVisible);
  });
  document.getElementById('btn-fps-toggle').classList.add('active');

  /* ---------------------------------------------------------------------- */
  /*  RENDER LOOP                                                            */
  /* ---------------------------------------------------------------------- */
  const clock = new THREE.Clock();
  let lastFpsUpdate = 0, frameCount = 0, fps = 60;
  const fpsValueEl = document.getElementById('fps-value');
  const beatValueEl = document.getElementById('beat-value');
  const vizFlash = document.getElementById('viz-flash');
  let shakeTime = 0;

  function updateModeAuto(dt) {
    if (!randomModeOn) return;
    randomTimer += dt;
    if (randomTimer > 6) {
      randomTimer = 0;
      currentMode = MODES[Math.floor(Math.random() * MODES.length)];
      applyModeVisibility(currentMode);
    }
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // FPS counter
    frameCount++;
    if (elapsed - lastFpsUpdate > 0.5) {
      fps = Math.round(frameCount / (elapsed - lastFpsUpdate));
      if (fpsVisible) fpsValueEl.textContent = fps;
      frameCount = 0; lastFpsUpdate = elapsed;
    }

    updateModeAuto(dt);

    // colors follow theme
    const c = themeColors();
    coreMat.color.copy(c.accent); coreMat.emissive.copy(c.accent);
    wireMat.color.copy(c.accent2);
    rings.forEach(r => r.material.color.copy(c.accent3));
    bars.forEach(b => { b.material.color.copy(c.accent); b.material.emissive.copy(c.accent); });
    pMat.color.copy(c.accent2);
    light1.color.copy(c.accent); light2.color.copy(c.accent2); light3.color.copy(c.accent3);

    // audio analysis
    let bands = { bass: 0.05, mid: 0.05, treble: 0.05, overall: 0.05 };
    let freqData = null;
    const sourceActive = engine.playing || engine.mode === 'mic';
    if (sourceActive) {
      bands = engine.getBandEnergies();
      freqData = engine.getFrequencyData();
    }

    if (beatValueEl) {
      const isBeat = sourceActive && engine.detectBeat(bands.bass);
      if (isBeat) {
        beatValueEl.textContent = '●';
        vizFlash.style.opacity = 0.12;
        shakeTime = 0.15;
        gsap.to(vizFlash, { opacity: 0, duration: 0.4 });
      }
    }

    // core sphere: bass -> scale + emissive
    const bassScale = 1 + bands.bass * 1.1;
    coreGroup.scale.setScalar(THREE.MathUtils.lerp(coreGroup.scale.x, bassScale, 0.25));
    coreMat.emissiveIntensity = 0.8 + bands.bass * 2.2;
    coreSphere.rotation.y += dt * (0.15 + bands.mid * 0.6);
    wireSphere.rotation.y -= dt * (0.1 + bands.mid * 0.4);
    wireSphere.rotation.x += dt * 0.05;

    // rings: mid -> rotation speed, radius pulses with tunnel mode
    rings.forEach((r, i) => {
      r.rotation.z += dt * (0.2 + bands.mid * 1.2) * (i % 2 === 0 ? 1 : -1);
      if (currentMode === 'tunnel') {
        r.position.z += dt * (2 + bands.overall * 6);
        if (r.position.z > 8) r.position.z = -14;
      } else {
        r.position.z = THREE.MathUtils.lerp(r.position.z, 0, 0.08);
      }
    });

    // frequency bars
    if (freqData && barGroup.visible) {
      const step = Math.floor(freqData.length / BAR_COUNT);
      bars.forEach((bar, i) => {
        const v = freqData[i * step] / 255;
        bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, 0.2 + v * 5.5, 0.4);
        bar.material.emissiveIntensity = 0.4 + v * 1.8;
      });
      barGroup.rotation.y += dt * (0.1 + bands.mid * 0.5);
    }

    // particle galaxy: treble -> speed, spiral motion
    const posAttr = pGeo.attributes.position;
    const speedMul = 1 + bands.treble * 4;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pAngle[i] += dt * pSpeed[i] * speedMul * 0.4;
      posAttr.array[i * 3] = Math.cos(pAngle[i]) * pRadius[i];
      posAttr.array[i * 3 + 2] = Math.sin(pAngle[i]) * pRadius[i];
      posAttr.array[i * 3 + 1] = pHeight[i] + Math.sin(elapsed * 0.5 + i) * bands.mid * 0.6;
    }
    posAttr.needsUpdate = true;
    particles.rotation.y += dt * 0.02;

    // stars slow drift
    stars.rotation.y += dt * 0.005;

    // camera movement + beat shake
    const baseX = Math.sin(elapsed * 0.12) * 1.6;
    const baseY = 2.2 + Math.sin(elapsed * 0.2) * 0.4;
    let shakeX = 0, shakeY = 0;
    if (shakeTime > 0) {
      shakeTime -= dt;
      shakeX = (Math.random() - 0.5) * bands.bass * 0.6;
      shakeY = (Math.random() - 0.5) * bands.bass * 0.6;
    }
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, baseX + shakeX, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY + shakeY, 0.1);
    camera.position.z = currentMode === 'galaxy' ? 15 : 11;
    camera.lookAt(0, 0, 0);

    // floor pulses with overall energy
    floor.material.opacity = 0.25 + bands.overall * 0.35;

    renderer.render(scene, camera);
  }
  tick();

  window.addEventListener('neon-theme-change', () => {}); // colors re-read every frame already
})();
