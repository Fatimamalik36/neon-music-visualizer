/* ==========================================================================
   HOME-ORB.JS — small ambient audio-styled orb for the hero (signature visual)
   Pulses on its own using layered sine noise so the hero feels "alive"
   before any audio is even loaded.
   ========================================================================== */
(function () {
  const canvas = document.getElementById('hero-orb-canvas');
  if (!canvas || !window.THREE) return;
  const stage = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
  camera.position.z = 6;

  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      accent: new THREE.Color(cs.getPropertyValue('--accent').trim() || '#2de2ff'),
      accent2: new THREE.Color(cs.getPropertyValue('--accent-2').trim() || '#a855f7'),
      accent3: new THREE.Color(cs.getPropertyValue('--accent-3').trim() || '#ff4fa3'),
    };
  }

  const light1 = new THREE.PointLight(0x2de2ff, 4, 20); light1.position.set(3, 3, 4); scene.add(light1);
  const light2 = new THREE.PointLight(0xa855f7, 3, 20); light2.position.set(-3, -2, 3); scene.add(light2);
  scene.add(new THREE.AmbientLight(0x223, 0.6));

  const geo = new THREE.IcosahedronGeometry(1.7, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x2de2ff, emissive: 0x2de2ff, emissiveIntensity: 1, roughness: 0.3, metalness: 0.4 });
  const orb = new THREE.Mesh(geo, mat);
  scene.add(orb);

  const wireGeo = new THREE.IcosahedronGeometry(2.05, 1);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.5 });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  scene.add(wire);

  const ringGeo = new THREE.TorusGeometry(2.6, 0.015, 8, 100);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4fa3, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);

  function resize() {
    const size = stage.clientWidth || 320;
    renderer.setSize(size, size);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const c = themeColors();
    mat.color.copy(c.accent); mat.emissive.copy(c.accent);
    wireMat.color.copy(c.accent2);
    ringMat.color.copy(c.accent3);
    light1.color.copy(c.accent); light2.color.copy(c.accent2);

    const pulse = 1 + Math.sin(t * 1.4) * 0.06 + Math.sin(t * 3.1) * 0.02;
    orb.scale.setScalar(pulse);
    orb.rotation.y += 0.004;
    orb.rotation.x = Math.sin(t * 0.3) * 0.2;
    wire.rotation.y -= 0.003;
    wire.rotation.x += 0.002;
    ring.rotation.z += 0.006;
    mat.emissiveIntensity = 0.9 + Math.sin(t * 1.4) * 0.3;

    renderer.render(scene, camera);
  }
  animate();
})();
