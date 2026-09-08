"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Scene3DData, Shape } from "@/lib/scene3d";

function makeGeometry(shape: Shape): THREE.BufferGeometry | null {
  switch (shape) {
    case "box":
      return new THREE.BoxGeometry(1, 1, 1);
    case "sphere":
      return new THREE.SphereGeometry(0.6, 24, 24);
    case "cylinder":
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    case "cone":
      return new THREE.ConeGeometry(0.5, 1, 24);
    case "torus":
      return new THREE.TorusGeometry(0.5, 0.2, 16, 32);
    case "plane":
      return new THREE.PlaneGeometry(1, 1);
    default:
      return null;
  }
}

export function Scene3DViewer({ scene }: { scene: Scene3DData }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const height = 260;
    const width = container.clientWidth;

    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(scene.background);
    threeScene.fog = new THREE.Fog(new THREE.Color(scene.background).getHex(), 12, 28);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 3, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    threeScene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0x22d3ee, 1.1);
    key.position.set(5, 8, 5);
    threeScene.add(key);
    const rim = new THREE.DirectionalLight(0x6366f1, 0.6);
    rim.position.set(-5, 3, -5);
    threeScene.add(rim);

    const grid = new THREE.GridHelper(20, 20, 0x22d3ee, 0x11324a);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = -1.5;
    threeScene.add(grid);

    const group = new THREE.Group();
    for (const obj of scene.objects) {
      const geometry = makeGeometry(obj.shape);
      if (!geometry) continue;
      const material = new THREE.MeshStandardMaterial({
        color: obj.color,
        roughness: 0.45,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      group.add(mesh);
    }
    threeScene.add(group);

    let raf = 0;
    function animate() {
      controls.update();
      group.rotation.y += 0.0025;
      renderer.render(threeScene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      container.removeChild(renderer.domElement);
    };
  }, [scene]);

  return (
    <div className="relative">
      <div ref={mountRef} className="h-[260px] w-full overflow-hidden rounded" />
      <span className="hud-text pointer-events-none absolute bottom-1 right-2 text-[8px] text-white/40">
        sleep om te draaien
      </span>
    </div>
  );
}
