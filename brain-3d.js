/* MRI-derived anatomy rendered in WebGL, with a matching workflow projection. */
(() => {
  let THREE, metadata, binary;
  const base = new URL('.', document.currentScript.src);
  const ready = Promise.all([
    import(new URL('vendor/three.module.min.js', base).href),
    fetch(new URL('assets/anatomical-brain.json', base)).then(r => { if (!r.ok) throw Error('Brain metadata failed to load'); return r.json(); }),
    fetch(new URL('assets/anatomical-brain.bin', base)).then(r => { if (!r.ok) throw Error('Brain geometry failed to load'); return r.arrayBuffer(); }),
  ]).then(([library, info, bytes]) => { THREE = library; metadata = info; binary = bytes; });

  function createModel() {
    const scene = new THREE.Scene(), group = new THREE.Group();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
    camera.position.set(0, 0, 3.5);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = 'workflow-graph anatomy-surface';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    document.querySelector('#workflowGraph').before(renderer.domElement);
    scene.add(group);
    const bounds = new THREE.Box3(), geometries = [];
    for (const item of metadata.meshes) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(binary, item.positions.offset, item.positions.count * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(binary, item.normals.offset, item.normals.count * 3), 3));
      const IndexArray = item.indices.componentType === 5123 ? Uint16Array : Uint32Array;
      geometry.setIndex(new THREE.BufferAttribute(new IndexArray(binary, item.indices.offset, item.indices.count), 1));
      geometry.computeBoundingBox(); bounds.union(geometry.boundingBox);
      geometries.push({ item, geometry });
    }
    const center = bounds.getCenter(new THREE.Vector3()), extent = bounds.getSize(new THREE.Vector3());
    const normalization = 1.12 / Math.max(extent.x, extent.y, extent.z);
    let corticalPositions, corticalNormals;
    for (const { item, geometry } of geometries) {
      geometry.translate(-center.x, -center.y, -center.z); geometry.scale(normalization, normalization, normalization);
      const curvature = item.curvature
        ? new Float32Array(binary, item.curvature.offset, item.curvature.count)
        : new Float32Array(item.positions.count);
      geometry.setAttribute('curvature', new THREE.BufferAttribute(curvature, 1));
      // A faint translucent shell: grazing angles reveal the outline and folds.
      // No opaque skin or flesh lighting obscures the electrical network.
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float curvature;
          varying vec3 vNormal; varying vec3 vView; varying float vFold;
          void main() {
            vec4 view = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal); vView = -view.xyz;
            vFold = curvature;
            gl_Position = projectionMatrix * view;
          }`,
        fragmentShader: `
          varying vec3 vNormal; varying vec3 vView; varying float vFold;
          void main() {
            float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.2);
            float fold = clamp(abs(vFold) * .4, 0.0, 1.0);
            float alpha = .006 + rim * .36 + fold * .012;
            gl_FragColor = vec4(vec3(1.0, .52, .27), alpha);
          }`,
      });
      // A depth-only pass keeps rear folds from piling up into a bright tangle.
      // The visible pass remains transparent, and signals render through it.
      const depth = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
      group.add(depth);
      const mesh = new THREE.Mesh(geometry, material); mesh.renderOrder = 1;
      group.add(mesh);
      if (item.name === 'unified-cortex') { corticalPositions = geometry.attributes.position; corticalNormals = geometry.attributes.normal; }
    }
    // Sample the cortex, then inset nodes to form a network inside the shell.
    const candidates = [];
    for (let i = 0; i < corticalPositions.count; i += 11) {
      candidates.push(i);
    }
    const nodes = [];
    for (let i = 0; i < 420; i++) {
      const n = candidates[(i * 137) % candidates.length];
      const inset = .52 + .46 * ((i * 29) % 101) / 100;
      nodes.push({ x: corticalPositions.getX(n) * inset, y: corticalPositions.getY(n) * inset, z: corticalPositions.getZ(n) * inset });
    }
    const edges = [], keys = new Set();
    function connect(a, b) { const key = `${Math.min(a,b)}:${Math.max(a,b)}`; if (!keys.has(key)) { keys.add(key); edges.push([a,b]); } }
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i], nearest = nodes.map((q, j) => ({ j, d: Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z) })).filter(n => n.j !== i).sort((a,b) => a.d-b.d);
      for (const n of nearest.slice(0, 4)) connect(i, n.j);
      // One connection to an earlier node guarantees every tool is reachable.
      if (i) connect(i, nearest.find(n => n.j < i).j);
    }
    const model = { nodes, edges, renderer, scene, group, camera, width: 0, height: 0, vector: new THREE.Vector3(), yaw: 0, pitch: 0, dragging: false, revision: 0, dirty: true, projected: null };
    const canvas = document.querySelector('#workflowGraph');
    let pointer = null;
    canvas.removeAttribute('aria-hidden'); canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Translucent three-dimensional brain with electrical signals inside. Drag or use arrow keys to rotate. Workflow lights follow the conversation.');
    const changed = () => canvas.dispatchEvent(new Event('rose:brain-change'));
    canvas.addEventListener('pointerdown', event => { if (!event.isPrimary || event.button !== 0) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; model.dragging = true; canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging'); });
    canvas.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      model.yaw += (event.clientX - pointer.x) * .008;
      if (event.pointerType === 'mouse') model.pitch = Math.max(-.75, Math.min(.75, model.pitch + (event.clientY - pointer.y) * .006));
      pointer.x = event.clientX; pointer.y = event.clientY; changed();
    });
    const release = () => { pointer = null; model.dragging = false; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release); canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('dblclick', () => { model.yaw = 0; model.pitch = 0; changed(); });
    canvas.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { model.yaw = 0; model.pitch = 0; }
      else if (event.key === 'ArrowLeft') model.yaw -= .15;
      else if (event.key === 'ArrowRight') model.yaw += .15;
      else model.pitch = Math.max(-.75, Math.min(.75, model.pitch + (event.key === 'ArrowUp' ? -.12 : .12)));
      changed();
    });
    return model;
  }

  function project(model, width, height, clock) {
    const size = Math.min(width * .81, height * .67);
    if (model.width !== width || model.height !== height) {
      model.width = width; model.height = height; model.dirty = true; model.revision++;
      model.renderer.setSize(width, height, false);
      model.camera.aspect = width / height;
      model.camera.fov = 2 * Math.atan(height / (2 * size * 3.5)) * 180 / Math.PI;
      model.camera.updateProjectionMatrix();
      model.camera.updateMatrixWorld();
    }
    const pitch = .24 + model.pitch, yaw = -.72 + model.yaw;
    if (model.group.rotation.x !== pitch || model.group.rotation.y !== yaw) {
      model.group.rotation.set(pitch, yaw, -.06); model.dirty = true; model.revision++;
    }
    if (model.projected && model.projectedRevision === model.revision) return model.projected;
    model.group.position.y = 0;
    model.group.updateMatrixWorld(true);
    model.projected = model.nodes.map(n => {
      const v = model.vector.set(n.x, n.y, n.z).applyMatrix4(model.group.matrixWorld);
      const depth = v.z, perspective = 3.5 / (3.5 - depth);
      v.project(model.camera);
      return { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2, z: depth, perspective };
    });
    model.projectedRevision = model.revision; return model.projected;
  }

  function paint(ctx, model, points, width, height) {
    if (model.dirty) { model.renderer.render(model.scene, model.camera); model.dirty = false; }
    ctx.save(); ctx.translate(width * .5, height * .735); ctx.scale(1, .14);
    const floor = ctx.createRadialGradient(0, 0, 1, 0, 0, width * .38);
    floor.addColorStop(0, '#07030290'); floor.addColorStop(1, '#07030200');
    ctx.fillStyle = floor; ctx.beginPath(); ctx.arc(0, 0, width * .38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  window.RoseBrain3D = { ready, createModel, project, paint };
})();
