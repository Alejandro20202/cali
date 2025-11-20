import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { WaterCycleController, type WaterCyclePhase, type PhaseConfig } from "../features/water-cycle/WaterCycleController";

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

function createPhaseConfigs(targets: CycleTargets, reportProgress: (progressValue: number) => void): PhaseConfig[] {
  return [
    {
      name: "evaporation",
      duration: 4,
      onUpdate: (progress) => {
        reportProgress(Math.round(progress * 100));
        targets.evaporation.position.y = THREE.MathUtils.lerp(0.4, 2, progress);
        targets.evaporation.scale.setScalar(THREE.MathUtils.lerp(1, 1.3, progress));
        setMeshOpacity(targets.evaporation, 0.3 + progress * 0.5);
      },
    },
    {
      name: "condensation",
      duration: 4,
      onUpdate: (progress) => {
        reportProgress(Math.round(progress * 100));
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
        reportProgress(Math.round(progress * 100));
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [progress, setProgress] = useState(0);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speakPhase = useCallback(
    (next: WaterCyclePhase) => {
      if (!voiceEnabled || !speechSupported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const messages: Record<WaterCyclePhase, string> = {
        evaporation: "Evaporación: el sol calienta el agua y sube como vapor.",
        condensation: "Condensación: el vapor se enfría y forma nubes esponjosas.",
        precipitation: "Precipitación: las gotas se unen y caen como lluvia.",
      };
      const utterance = new SpeechSynthesisUtterance(messages[next]);
      utterance.lang = "es-CO";
      const voices = synth.getVoices();
      const spanish = voices.find((v) => v.lang.startsWith("es"));
      if (spanish) utterance.voice = spanish;
      synth.speak(utterance);
    },
    [voiceEnabled, speechSupported],
  );

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
        controllerRef.current = new WaterCycleController(createPhaseConfigs(targets, setProgress));
        controllerRef.current.onPhaseChange((newPhase) => {
          setPhase(newPhase);
          speakPhase(newPhase);
        });
        setStatus("ready");
      },
      undefined,
      (error) => {
        console.warn("No se pudo cargar el modelo GLB, usando fallback", error);
        controllerRef.current = new WaterCycleController(createPhaseConfigs(targets, setProgress));
        controllerRef.current.onPhaseChange((newPhase) => {
          setPhase(newPhase);
          speakPhase(newPhase);
        });
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
      if (speechSupported) {
        window.speechSynthesis.cancel();
      }
      controllerRef.current = null;
    };
  }, [speakPhase, speechSupported]);

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

      <div className="flex flex-wrap gap-3 items-center">
        <div className="rounded-full bg-white shadow px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span>Elige una fase y escucha la explicación</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => jumpToPhase("evaporation")}
            className={`px-4 py-2 rounded-full text-sm font-semibold shadow border-2 border-white transition ${
              phase === "evaporation" ? "bg-gradient-to-r from-yellow-300 to-orange-300 text-slate-800" : "bg-white text-slate-700"
            }`}
          >
            ☀️ Evaporación
          </button>
          <button
            onClick={() => jumpToPhase("condensation")}
            className={`px-4 py-2 rounded-full text-sm font-semibold shadow border-2 border-white transition ${
              phase === "condensation" ? "bg-gradient-to-r from-blue-200 to-cyan-300 text-slate-800" : "bg-white text-slate-700"
            }`}
          >
            ⛅ Condensación
          </button>
          <button
            onClick={() => jumpToPhase("precipitation")}
            className={`px-4 py-2 rounded-full text-sm font-semibold shadow border-2 border-white transition ${
              phase === "precipitation" ? "bg-gradient-to-r from-blue-400 to-blue-600 text-white" : "bg-white text-slate-700"
            }`}
          >
            🌧️ Precipitación
          </button>
          <button
            onClick={() => setVoiceEnabled((prev) => !prev)}
            disabled={!speechSupported}
            className={`px-4 py-2 rounded-full text-sm font-bold shadow border-2 border-white transition flex items-center gap-2 ${
              voiceEnabled ? "bg-emerald-400 text-white" : "bg-white text-slate-700"
            } ${speechSupported ? "" : "opacity-50 cursor-not-allowed"}`}
          >
            {speechSupported ? (voiceEnabled ? "🔊 Voz ON" : "🔇 Voz OFF") : "Voz no disponible"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr,0.9fr]">
        <div
          ref={stageRef}
          className="rounded-3xl border-8 border-white shadow-2xl bg-gradient-to-b from-sky-200 to-white dark:from-slate-800 dark:to-slate-900 relative min-h-[360px] overflow-hidden"
        >
          {status !== "ready" && (
            <div className="absolute top-3 left-3 text-xs text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
              <span className="text-sm">⏳</span>
              <span>{status === "loading" ? "Cargando modelo 3D..." : "Modelo no encontrado, usando versión simplificada"}</span>
            </div>
          )}
        </div>

        <div className="rounded-3xl border-8 border-white shadow-2xl bg-gradient-to-br from-white via-emerald-50 to-cyan-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow flex items-center justify-center text-2xl">✨</div>
            <div>
              <h2 className="font-black text-slate-800 dark:text-slate-50 text-xl">Fase activa</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">Aprende qué hace el agua en cada etapa.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 border-4 border-white shadow-lg">
            <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
              {phase === "evaporation" && "☀️ El agua se calienta y sube como vapor brillante."}
              {phase === "condensation" && "⛅ El vapor se enfría y forma nubes esponjosas en el cielo."}
              {phase === "precipitation" && "🌧️ Las gotas se unen y vuelven a la tierra como lluvia."}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="bg-white rounded-2xl p-4 border-4 border-white shadow space-y-2">
              <p className="text-xs font-bold text-slate-600 text-center">Progreso</p>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden border border-slate-300">
                <div
                  className="bg-gradient-to-r from-yellow-400 via-cyan-400 to-blue-500 h-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 text-center font-bold">{progress}%</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                disabled={!speechSupported}
                className={`w-full px-3 py-3 rounded-2xl font-bold border-3 border-white shadow flex items-center justify-center gap-2 text-sm ${
                  voiceEnabled ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white" : "bg-white text-slate-700"
                } ${!speechSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {voiceEnabled ? "🔊 Voz ON" : "🔇 Voz OFF"}
              </button>
              <button
                onClick={() => controllerRef.current?.togglePlay()}
                className={`w-full px-3 py-3 rounded-2xl font-bold border-3 border-white shadow flex items-center justify-center gap-2 text-sm ${
                  controllerRef.current?.isPlaying ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                }`}
              >
                {controllerRef.current?.isPlaying ? "⏸️ Pausar" : "▶️ Continuar"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="rounded-xl bg-white/90 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center font-semibold">
                🌐 Optimizado con DRACO
              </div>
              <div className="rounded-xl bg-white/90 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center font-semibold">
                🎛️ Controlador propio
              </div>
              <div className="rounded-xl bg-white/90 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center font-semibold">
                📱 Listo para móviles
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-200 to-pink-200 rounded-2xl p-4 border-4 border-white shadow">
              <p className="text-xs font-bold text-slate-800 text-center mb-2">💡 ¿Sabías qué?</p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {phase === "evaporation" && "¡El agua sube como vapor invisible! Esto sucede todos los días en lagos y océanos."}
                {phase === "condensation" && "¡Las nubes están hechas de millones de gotitas! Por eso son blancas y esponjosas."}
                {phase === "precipitation" && "¡Cada gota de lluvia es parte del ciclo infinito! El agua se recicla eternamente."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
