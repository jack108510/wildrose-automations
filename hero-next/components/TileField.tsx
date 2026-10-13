"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const COLUMNS = 64;
const ROWS = 54;
const COUNT = COLUMNS * ROWS;
const STEP = 0.23;
const cube = new THREE.Object3D();

function Tiles({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cursor = useRef({ x: 99, z: 99 });
  const { camera } = useThree();
  const imageColors = useRef<THREE.Color[]>([]);
  const positions = useMemo(() => Array.from({ length: COUNT }, (_, index) => {
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    return { x: (col - (COLUMNS - 1) / 2) * STEP, z: (row - (ROWS - 1) / 2) * STEP };
  }), []);

  useEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    const fallback = new THREE.Color("#ebe3d8");
    positions.forEach((position, i) => {
      cube.position.set(position.x, -0.06, position.z);
      cube.scale.set(0.215, 0.11, 0.215);
      cube.updateMatrix();
      instance.setMatrixAt(i, cube.matrix);
      instance.setColorAt(i, fallback);
    });
    instance.instanceMatrix.needsUpdate = true;
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true;

    const image = new Image();
    image.src = "/rose-meadow.jpg";
    image.onload = () => {
      const sampler = document.createElement("canvas");
      sampler.width = COLUMNS;
      sampler.height = ROWS;
      const context = sampler.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, COLUMNS, ROWS);
      const pixels = context.getImageData(0, 0, COLUMNS, ROWS).data;
      const paper = new THREE.Color("#f2e9df");
      const petal = new THREE.Color("#e56a38");
      const rust = new THREE.Color("#994824");
      const olive = new THREE.Color("#817052");
      const earth = new THREE.Color("#33251e");
      imageColors.current = positions.map((_, i) => {
        const row = Math.floor(i / COLUMNS);
        const col = i % COLUMNS;
        const pixel = (row * COLUMNS + col) * 4;
        const r = pixels[pixel] / 255;
        const g = pixels[pixel + 1] / 255;
        const b = pixels[pixel + 2] / 255;
        const light = (r + g + b) / 3;
        const flower = Math.min(1, Math.max(0, (r - g) * 3.5 + (r - b) * 1.2));
        const leaf = Math.min(1, Math.max(0, (g - r) * 3.1 + (g - b) * 0.5));
        const color = paper.clone().lerp(earth, Math.pow(1 - light, 1.6) * 0.88);
        color.lerp(olive, leaf * 0.72);
        color.lerp(light > 0.53 ? petal : rust, flower * 0.92);
        return color;
      });
      imageColors.current.forEach((color, i) => instance.setColorAt(i, color));
      if (instance.instanceColor) instance.instanceColor.needsUpdate = true;
    };

    const pointerMove = (event: PointerEvent) => {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = 1 - (event.clientY / window.innerHeight) * 2;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (hit) cursor.current = { x: hit.x, z: hit.z };
    };
    window.addEventListener("pointermove", pointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", pointerMove);
  }, [camera, positions]);

  useFrame(({ clock }) => {
    const instance = mesh.current;
    if (!instance || reducedMotion) return;
    const time = clock.elapsedTime;
    positions.forEach((position, i) => {
      const distance = Math.hypot(position.x - cursor.current.x, position.z - cursor.current.z);
      const hover = Math.max(0, 1 - distance / 1.45);
      const wave = Math.sin(position.x * 1.15 + position.z * 1.35 - time * 0.85) * 0.045;
      cube.position.set(position.x, wave + hover * hover * 0.26 - 0.06, position.z);
      cube.scale.set(0.215, 0.11 + hover * 0.09, 0.215);
      cube.updateMatrix();
      instance.setMatrixAt(i, cube.matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} receiveShadow castShadow frustumCulled={false}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial roughness={0.78} metalness={0.04} />
  </instancedMesh>;
}

function WidgetShadow({ open }: { open: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, open ? 0 : -0.43, 0.08);
    group.current.position.y = 0.32 + (open ? 0 : Math.sin(clock.elapsedTime * 0.7) * 0.04);
  });
  return <group ref={group} position={[0, 0.32, 1.1]} rotation={[-0.17, 0.15, -0.43]}>
    <mesh castShadow>
      <boxGeometry args={[2.75, 3.85, 0.09]} />
      <meshPhysicalMaterial color="#f9e9e1" metalness={0.26} roughness={0.21} transparent opacity={0.5} clearcoat={1} />
    </mesh>
  </group>;
}

export default function TileField({ open, reducedMotion }: { open: boolean; reducedMotion: boolean }) {
  return <Canvas className="tile-canvas" shadows dpr={[1, 1.5]} camera={{ position: [0, 7.4, 9.7], fov: 56, near: 0.1, far: 80 }} gl={{ alpha: true, antialias: true }}>
    <color attach="background" args={["#f3eee8"]} />
    <fog attach="fog" args={["#f3eee8", 11, 23]} />
    <ambientLight intensity={2.15} />
    <directionalLight position={[-4, 9, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
    <Tiles reducedMotion={reducedMotion} />
    <WidgetShadow open={open} />
  </Canvas>;
}
