import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {
  WaterCycleController,
  type WaterCyclePhase,
  type PhaseConfig,
} from "../features/water-cycle/WaterCycleController";

type CycleTargets = {
  evaporation: THREE.Object3D;
  condensation: THREE.Object3D;
  precipitation: THREE.Object3D;
};

type Status = "loading" | "ready" | "error";

const loaderFactory = () => {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(draco);
  return loader;
};

function setMeshOpacity(target: THREE.Object3D, opacity: number) {
  const safeOpacity = THREE.MathUtils.clamp(opacity, 0.05, 1);
  target.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      if (!("opacity" in material)) return;
      if (!material.transparent) {
        material.transparent = true;
      }
      (material as THREE.Material & { opacity: number }).opacity = safeOpacity;
    });
  });
}

function createFallbackCycle(): { group: THREE.Group } & CycleTargets {
  const group = new THREE.Group();
  group.name = "FallbackCycle";

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.25, 32),
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.65,
      roughness: 0.4,
    }),
  );
  water.receiveShadow = true;
  water.position.y = 0.12;

  const evaporation = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.3,
      emissive: 0xfcd34d,
      emissiveIntensity: 0.3,
    }),
  );
  evaporation.name = "EvaporationHelper";
  evaporation.position.set(0, 0.4, 0);

  const condensation = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 32, 16),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.5,
    }),
  );
  condensation.name = "CondensationHelper";
  condensation.position.set(0, 1.6, 0);

  const precipitation = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 1.2, 12),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
    }),
  );
  precipitation.name = "PrecipitationHelper";
  precipitation.position.set(0.4, 1.1, 0);

  group.add(water, evaporation, condensation, precipitation);

  return {
    group,
    evaporation,
    condensation,
    precipitation,
  };
}

function createPhaseConfigs(targets: CycleTargets): PhaseConfig[] {
  return [
    {
      name: "evaporation",
      duration: 4,
      onUpdate: (progress) => {
        targets.evaporation.position.y = THREE.MathUtils.lerp(0.4, 2, progress);
        targets.evaporation.scale.setScalar(THREE.MathUtils.lerp(1, 1.3, progress));
        setMeshOpacity(targets.evaporation, 0.3 + progress * 0.5);
      },
    },
    {
      name: "condensation",
      duration: 4,
      onUpdate: (progress) => {
        targets.condensation.position.y = THREE.MathUtils.lerp(1.6, 2.1, progress);
        targets.condensation.rotation.y += 0.01 + progress * 0.02;
        const radius = 0.6;
        targets.condensation.position.x = Math.cos(progress * Math.PI * 2) * radius;
        targets.condensation.position.z = Math.sin(progress * Math.PI * 2) * radius;
        setMeshOpacity(targets.condensation, 0.4 + Math.sin(progress * Math.PI) * 0.3);
      },
    },
    {
      name: "precipitation",
      duration: 3.5,
      onUpdate: (progress) => {
        targets.precipitation.position.y = THREE.MathUtils.lerp(2, 0.3, progress);
        targets.precipitation.rotation.x = progress * Math.PI * 2;
        const scatter = 0.5 * progress;
        targets.precipitation.position.x = (Math.random() - 0.5) * scatter;
        targets.precipitation.position.z = (Math.random() - 0.5) * scatter;
        setMeshOpacity(targets.precipitation, 0.5 + (1 - progress) * 0.3);
      },
    },
  ];
}

export default function ThreeDemoView() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<WaterCycleController | null>(null);
  const [phase, setPhase] = useState<WaterCyclePhase>("evaporation");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!stageRef.current) return;

    const container = stageRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dceefb");

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 3.5, 4.2);
    camera.lookAt(0, 1, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8d99ae, 0.9);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 6, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 64),
      new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.9 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const fallback = createFallbackCycle();
    scene.add(fallback.group);

    let targets: CycleTargets = fallback;

    const loader = loaderFactory();
    loader.load(
      "/assets/models/ciclo-agua.glb",
      (gltf) => {
        targets = {
          evaporation: gltf.scene.getObjectByName("Evaporation") ?? fallback.evaporation,
          condensation: gltf.scene.getObjectByName("Condensation") ?? fallback.condensation,
          precipitation: gltf.scene.getObjectByName("Precipitation") ?? fallback.precipitation,
        };
        scene.remove(fallback.group);
        gltf.scene.name = "WaterCycleScene";
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(gltf.scene);
        controllerRef.current = new WaterCycleController(createPhaseConfigs(targets));
        controllerRef.current.onPhaseChange((newPhase) => setPhase(newPhase));
        setStatus("ready");
      },
      undefined,
      (error) => {
        console.warn("No se pudo cargar el modelo GLB, usando fallback", error);
        controllerRef.current = new WaterCycleController(createPhaseConfigs(targets));
        controllerRef.current.onPhaseChange((newPhase) => setPhase(newPhase));
        setStatus("error");
      },
    );

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controllerRef.current?.update(clock.getDelta());
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      controllerRef.current = null;
    };
  }, []);

  const jumpToPhase = (target: WaterCyclePhase) => {
    controllerRef.current?.setPhase(target);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Ciclo del Agua en 3D</h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm">
          Animación interactiva optimizada con Three.js. Observa cómo el agua pasa por evaporación, condensación y
          precipitación. Funciona en dispositivos móviles gracias al canvas responsive.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => jumpToPhase("evaporation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${phase === "evaporation" ? "bg-sky-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
        >
          Evaporación
        </button>
        <button
          onClick={() => jumpToPhase("condensation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${phase === "condensation" ? "bg-slate-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
        >
          Condensación
        </button>
        <button
          onClick={() => jumpToPhase("precipitation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${phase === "precipitation" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"}`}
        >
          Precipitación
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div
          ref={stageRef}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg relative min-h-[320px]"
        >
          {status !== "ready" && (
            <p className="absolute top-3 left-3 text-xs text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded-full">
              {status === "loading" ? "Cargando modelo 3D..." : "Modelo no encontrado, usando versión simplificada"}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Fase activa</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {phase === "evaporation" && "El agua se calienta y asciende como vapor ligero y brillante."}
            {phase === "condensation" && "Las partículas se enfrían en altura formando nubes voluminosas."}
            {phase === "precipitation" && "Las gotas se unen y caen nuevamente a la superficie como lluvia."}
          </p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <li>• Optimizado con DRACO + GLTFLoader.</li>
            <li>• Animación controlada por WaterCycleController.</li>
            <li>• Escena responsiva y lista para móviles.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
