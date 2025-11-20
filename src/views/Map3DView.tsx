import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Volume2, RotateCw } from "lucide-react";

type RegionInfo = {
  id: string;
  label: string;
  description: string;
  color: number;
  position: [number, number];
  emoji: string;
  funFact: string;
};

const REGION_INFO: RegionInfo[] = [
  {
    id: "andina",
    label: "Región Andina",
    description: "Cordillera con nevados y clima variable",
    color: 0x7c3aed,
    position: [-1.5, 0.5],
    emoji: "🏔️",
    funFact: "Es hogar de páramos y volcanes nevados.",
  },
  {
    id: "caribe",
    label: "Región Caribe",
    description: "Playas cálidas y mares turquesa",
    color: 0x06b6d4,
    position: [0, 1.2],
    emoji: "🏖️",
    funFact: "Aquí está la muralla histórica de Cartagena.",
  },
  {
    id: "pacifico",
    label: "Región Pacífica",
    description: "Selva húmeda y manglares",
    color: 0x22c55e,
    position: [-2, -0.6],
    emoji: "🌴",
    funFact: "Un lugar perfecto para avistar ballenas jorobadas.",
  },
  {
    id: "orinoquia",
    label: "Orinoquía",
    description: "Llanuras extensas llenas de ganadería",
    color: 0xeab308,
    position: [1.8, -0.4],
    emoji: "🐄",
    funFact: "Sus atardeceres llaneros son famosos por sus colores.",
  },
  {
    id: "amazonas",
    label: "Amazonas",
    description: "Biodiversidad única y ríos gigantes",
    color: 0xf59e0b,
    position: [2.5, -1.2],
    emoji: "🐆",
    funFact: "Contiene la selva tropical más grande del planeta.",
  },
];

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const createLoader = () => {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(draco);
  return loader;
};

export default function Map3DView() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [hoverRegionId, setHoverRegionId] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const selectedRegion = REGION_INFO.find((r) => r.id === selectedRegionId) ?? null;
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const interactiveRootRef = useRef<THREE.Group | null>(null);
  const fallbackGroupRef = useRef<THREE.Group | null>(null);

  const speakRegion = useCallback(
    (region: RegionInfo) => {
      if (!voiceEnabled || !speechSupported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${region.label}. ${region.description}. Dato curioso: ${region.funFact}`,
      );
      utterance.lang = "es-CO";
      const voices = synth.getVoices();
      const spanishVoice = voices.find((v) => v.lang.startsWith("es"));
      if (spanishVoice) utterance.voice = spanishVoice;
      utterance.rate = 1;
      utterance.pitch = 1;
      synth.speak(utterance);
    },
    [voiceEnabled, speechSupported],
  );

  useEffect(() => {
    if (selectedRegion) {
      speakRegion(selectedRegion);
    }
    return () => {
      if (speechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedRegion, speakRegion, speechSupported]);

  useEffect(() => {
    if (!mapRef.current) return;

    const container = mapRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dceefb");
    scene.fog = new THREE.Fog(0xdceefb, 18, 45);

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(5.2, 5.5, 6.4);
    camera.lookAt(0, 0.6, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0xfff4d6, 1.15);
    dir.position.set(7, 8, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(ambient, dir);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10, 96),
      new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.55, metalness: 0.1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x8ec5ff, side: THREE.BackSide }),
    );
    scene.add(skyDome);

    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25 });
    const createCloud = (x: number, y: number, z: number) => {
      const group = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), cloudMaterial);
        puff.position.x = i * 0.9;
        puff.scale.set(1 + i * 0.25, 0.65, 0.8);
        group.add(puff);
      }
      group.position.set(x, y, z);
      scene.add(group);
      return group;
    };
    createCloud(-7, 5.6, -5.5);
    createCloud(6, 6.2, -7);
    createCloud(-3, 4.4, 5.2);

    const fallbackGroup = new THREE.Group();
    REGION_INFO.forEach((region) => {
      const geometry = new THREE.BoxGeometry(1.5, 0.25, 1.2);
      const material = new THREE.MeshStandardMaterial({
        color: region.color,
        metalness: 0.25,
        roughness: 0.4,
        emissive: region.color,
        emissiveIntensity: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(region.position[0], 0.15, region.position[1]);
      mesh.name = region.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edges = new THREE.LineSegments(
        edgeGeometry,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 }),
      );
      mesh.add(edges);

      fallbackGroup.add(mesh);
    });
    scene.add(fallbackGroup);
    fallbackGroupRef.current = fallbackGroup;
    interactiveRootRef.current = fallbackGroup;

    const loader = createLoader();
    loader.load(
      "/assets/models/mapa-colombia.glb",
      (gltf) => {
        const realMap = gltf.scene;
        realMap.name = "MapaColombia";

        realMap.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const normalized = normalizeName(mesh.name);
          const matched = REGION_INFO.find((r) => normalizeName(r.id) === normalized || normalizeName(r.label) === normalized);
          if (matched) {
            mesh.name = matched.id;
            if (mesh.material && "color" in mesh.material) {
              (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(matched.color);
              (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(matched.color);
            }
          }

          if (mesh.geometry) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const lines = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
            );
            mesh.add(lines);
          }
        });

        const box = new THREE.Box3().setFromObject(realMap);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        realMap.position.sub(center);
        const targetSize = 7.5;
        const scale = targetSize / Math.max(size.x, size.z, 0.0001);
        realMap.scale.setScalar(scale);
        scene.add(realMap);

        if (fallbackGroupRef.current) {
          scene.remove(fallbackGroupRef.current);
          fallbackGroupRef.current = null;
        }
        interactiveRootRef.current = realMap;
        setMapLoaded(true);
      },
      undefined,
      () => {
        setMapLoaded(false);
      },
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: THREE.Object3D | null = null;

    const setHighlight = (mesh: THREE.Object3D | null, intensity: number) => {
      if (!mesh) return;
      const m = mesh as THREE.Mesh;
      if (m.material && "emissiveIntensity" in m.material) {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
        m.scale.lerp(new THREE.Vector3(1.12, 1.15, 1.12), 0.3);
      }
    };

    const resetHighlight = (mesh: THREE.Object3D | null) => {
      if (!mesh) return;
      const m = mesh as THREE.Mesh;
      if (m.material && "emissiveIntensity" in m.material) {
        (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
      m.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event);
      const objects = interactiveRootRef.current?.children ?? [];
      if (!objects.length) return;
      const intersections = raycaster.intersectObjects(objects, true);
      const mesh = intersections.length > 0 ? intersections[0].object : null;

      if (mesh !== hovered) {
        resetHighlight(hovered);
        if (mesh) {
          setHighlight(mesh, 0.75);
          setHoverRegionId(mesh.name);
        } else {
          setHoverRegionId(null);
        }
        hovered = mesh;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      updatePointer(event);
      const objects = interactiveRootRef.current?.children ?? [];
      if (!objects.length) return;
      const intersections = raycaster.intersectObjects(objects, true);
      if (!intersections.length) return;

      const clickedId = intersections[0].object.name;
      setSelectedRegionId(clickedId);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 600);
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    let rotationAngle = 0;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (autoRotate) {
        rotationAngle += 0.0004;
        camera.position.x = Math.cos(rotationAngle) * 5.5 + Math.sin(rotationAngle) * 1.5;
        camera.position.z = Math.sin(rotationAngle) * 5.5 + Math.cos(rotationAngle) * 2.5;
        camera.lookAt(0, 0.6, 0);
      }
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
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      cancelAnimationFrame(raf);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [autoRotate]);

  return (
    <section className="w-full p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800">Mapa 3D de Colombia</h1>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl">
              Explora un mapa en 3D con límites regionales resaltados. Pasa el puntero o toca cada zona para ver datos curiosos.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-700 border border-slate-200 px-3 py-2 shadow-sm hover:shadow"
            >
              <RotateCw className="w-5 h-5" />
              {autoRotate ? "Pausar giro" : "Reanudar giro"}
            </button>
            <button
              type="button"
              onClick={() => setVoiceEnabled((prev) => !prev)}
              disabled={!speechSupported}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 shadow ${
                voiceEnabled ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-white text-slate-700 border border-slate-200"
              } ${speechSupported ? "" : "opacity-50 cursor-not-allowed"}`}
            >
              <Volume2 className="w-5 h-5" />
              {speechSupported ? (voiceEnabled ? "Voz activada" : "Voz desactivada") : "Voz no disponible"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-b from-sky-200 to-sky-100 min-h-[420px] relative">
            <div ref={mapRef} className="w-full h-full" />
            {!mapLoaded && (
              <div className="absolute top-3 left-3 right-3 md:right-auto md:max-w-sm px-3 py-2 rounded-2xl bg-white/90 border border-slate-200 text-xs text-slate-700 shadow">
                Para ver el mapa real, coloca el archivo <code className="px-1 rounded bg-slate-200">public/assets/models/mapa-colombia.glb</code>.
                Mientras tanto ves un mapa simplificado.
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedRegion ? (
              <div
                className={`rounded-3xl p-6 text-white shadow-2xl border-4 border-white transform transition-transform ${
                  celebrating ? "scale-105" : "scale-100"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${new THREE.Color(selectedRegion.color).getStyle()}, ${new THREE.Color(
                    selectedRegion.color,
                  )
                    .offsetHSL(0, 0, 0.1)
                    .getStyle()})`,
                }}
              >
                <div className="text-6xl mb-3 text-center">{selectedRegion.emoji}</div>
                <h2 className="text-3xl font-black mb-1 text-center">{selectedRegion.label}</h2>
                <p className="text-lg font-semibold text-center mb-4">{selectedRegion.description}</p>
                <p className="bg-white/20 rounded-2xl p-4 text-sm font-bold text-center backdrop-blur">💡 {selectedRegion.funFact}</p>
              </div>
            ) : (
              <div className="rounded-3xl p-8 bg-white shadow-xl border-4 border-dashed border-slate-300 text-center">
                <div className="text-6xl mb-3">👆</div>
                <p className="text-xl font-bold text-slate-600">Toca una región para saber más</p>
              </div>
            )}

            <div className="rounded-3xl p-4 bg-white shadow-xl border-4 border-white space-y-2 max-h-96 overflow-y-auto">
              <h3 className="font-black text-lg text-slate-800 mb-3">🎯 Todas las regiones</h3>
              {REGION_INFO.map((region) => (
                <button
                  key={region.id}
                  onClick={() => {
                    setSelectedRegionId(region.id);
                    setCelebrating(true);
                    setTimeout(() => setCelebrating(false), 600);
                  }}
                  className={`w-full rounded-2xl px-4 py-3 text-left font-bold transition-all transform hover:scale-105 border-2 ${
                    selectedRegionId === region.id
                      ? "bg-gradient-to-r from-amber-300 to-yellow-200 text-slate-900 border-amber-400 shadow-lg scale-105"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <span className="text-2xl mr-2">{region.emoji}</span>
                  {region.label}
                </button>
              ))}
            </div>

            <div className="rounded-3xl p-4 bg-white shadow border border-slate-200 text-sm text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">Tips</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Mira los bordes blancos para entender los límites de cada zona.</li>
                <li>El giro automático se puede pausar con el botón “Pausar giro”.</li>
                <li>Si el modelo 3D real no carga, verás un mapa simplificado con colores vivos.</li>
                <li>Debajo del puntero: {hoverRegionId ?? "ninguna región"}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
