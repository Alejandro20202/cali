import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {
  startRegionDrag,
  updateRegionDrag,
  toggleRegionSelection,
  type DragSession,
} from "../features/map/interactions";

const REGION_INFO = [
  { id: "andina", label: "Región Andina", description: "Cordilleras y clima variado", color: 0x93c5fd, position: [-1.5, 0.5] },
  { id: "caribe", label: "Región Caribe", description: "Costas cálidas y desiertos", color: 0xf9a8d4, position: [0, 1.2] },
  { id: "pacifico", label: "Región Pacífica", description: "Selvas y lluvias abundantes", color: 0x86efac, position: [-2, -0.6] },
  { id: "orinoquia", label: "Orinoquía", description: "Llanuras infinitas", color: 0xfde047, position: [1.8, -0.4] },
  { id: "amazonas", label: "Amazonas", description: "Biodiversidad extrema", color: 0xfbbf24, position: [2.5, -1.2] },
];

const createLoader = () => {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  loader.setDRACOLoader(draco);
  return loader;
};

export default function Map3DView() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoverRegion, setHoverRegion] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.7));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    
    // Fondo con gradiente mejorado
    const gradientTexture = new THREE.CanvasTexture(createGradientCanvas());
    scene.background = gradientTexture;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(4, 5, 6);
    camera.lookAt(0, 0, 0);

    // Iluminación mejorada con más dinamismo
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 50;
    
    // Luz adicional para efectos dinámicos
    const pointLight1 = new THREE.PointLight(0x60a5fa, 0.8, 15);
    pointLight1.position.set(-3, 2, 3);
    const pointLight2 = new THREE.PointLight(0xf472b6, 0.6, 12);
    pointLight2.position.set(3, 2, -3);
    
    scene.add(ambient, dir, pointLight1, pointLight2);

    // Suelo mejorado con sombras
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 64),
      new THREE.MeshStandardMaterial({ 
        color: 0xe2e8f0, 
        roughness: 0.8,
        metalness: 0.2
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Partículas flotantes
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 100;
    const positions = new Float32Array(particlesCount * 3);
    const velocities: number[] = [];
    
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 15;
      positions[i + 1] = Math.random() * 8;
      positions[i + 2] = (Math.random() - 0.5) * 15;
      velocities.push(Math.random() * 0.02 - 0.01);
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const regionGroup = new THREE.Group();
    const regionAnimations = new Map<string, { startTime: number; mesh: THREE.Object3D }>();
    
    REGION_INFO.forEach((region, index) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.15, 0.9),
        new THREE.MeshStandardMaterial({ 
          color: region.color, 
          flatShading: true,
          roughness: 0.6,
          metalness: 0.3
        }),
      );
      mesh.position.set(region.position[0], -2, region.position[1]); // Empezar fuera de vista
      mesh.name = region.id;
      mesh.userData.baseColor = new THREE.Color(region.color);
      mesh.userData.targetY = 0.1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      regionGroup.add(mesh);
      
      // Animación de entrada escalonada
      regionAnimations.set(region.id, {
        startTime: Date.now() + index * 150,
        mesh: mesh
      });
    });
    scene.add(regionGroup);

    const loader = createLoader();
    let mapModel: THREE.Group | null = null;
    
    loader.load(
      "/assets/models/mapa-colombia.glb",
      (gltf) => {
        scene.remove(regionGroup);
        gltf.scene.name = "MapaColombia";
        gltf.scene.position.y = -2; // Empezar fuera de vista
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.7;
              mat.metalness = 0.2;
            }
          }
        });
        mapModel = gltf.scene;
        scene.add(gltf.scene);
      },
      undefined,
      () => {
        // Mantener fallback si falla
      },
    );

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let hovered: THREE.Object3D | null = null;
    let selectedMesh: THREE.Object3D | null = null;
    let dragSession: DragSession | null = null;
    let draggingMesh: THREE.Object3D | null = null;
    let currentSelectionId: string | null = null;
    let rotationAngle = 0;
    let isUserInteracting = false;

    const setHighlight = (mesh: THREE.Object3D | null, intensity: number) => {
      if (!mesh) return;
      mesh.traverse((child) => {
        const m = child as THREE.Mesh;
        if (!m.isMesh) return;
        const materials = Array.isArray(m.material) ? m.material : [m.material];
        materials.forEach((material) => {
          if ("emissiveIntensity" in material) {
            material.emissive = new THREE.Color(0xffffff);
            (material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
          }
        });
      });
    };

    const resetHighlight = (mesh: THREE.Object3D | null) => {
      if (!mesh) return;
      mesh.traverse((child) => {
        const m = child as THREE.Mesh;
        if (!m.isMesh) return;
        const materials = Array.isArray(m.material) ? m.material : [m.material];
        materials.forEach((material) => {
          if ("emissiveIntensity" in material) {
            (material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          }
        });
      });
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const intersectRegions = () => {
      const objects = scene.getObjectByName("MapaColombia")?.children ?? regionGroup.children;
      const intersections = raycaster.intersectObjects(objects, true);
      return intersections.length ? intersections[0].object : null;
    };

    const getPlanePoint = () => {
      const point = new THREE.Vector3();
      const hasIntersection = raycaster.ray.intersectPlane(plane, point);
      return hasIntersection ? point : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      updatePointer(event);
      const planePoint = getPlanePoint();

      if (dragSession && draggingMesh && planePoint) {
        const updated = updateRegionDrag(dragSession, { x: planePoint.x, y: planePoint.z });
        draggingMesh.position.x = updated.x;
        draggingMesh.position.z = updated.y;
        draggingMesh.position.y = 0.1;
        return;
      }

      const mesh = intersectRegions();
      if (mesh !== hovered) {
        resetHighlight(hovered);
        if (mesh) {
          setHighlight(mesh, 0.5);
          setHoverRegion(mesh.name);
          // Animación de bounce en hover
          if (!dragSession) {
            mesh.userData.bounceStart = Date.now();
          }
        } else {
          setHoverRegion(null);
        }
        hovered = mesh;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      isUserInteracting = true;
      updatePointer(event);
      const mesh = intersectRegions();
      const planePoint = getPlanePoint();
      if (!mesh || !planePoint) return;

      const nextSelection = toggleRegionSelection(currentSelectionId, mesh.name);
      if (selectedMesh && selectedMesh !== mesh) {
        selectedMesh.scale.setScalar(1);
      }
      if (nextSelection) {
        mesh.scale.setScalar(1.05);
        setSelectedRegion(nextSelection);
        selectedMesh = mesh;
      } else {
        setSelectedRegion(null);
        selectedMesh = null;
      }
      currentSelectionId = nextSelection;

      dragSession = startRegionDrag(
        { id: mesh.name, position: { x: mesh.position.x, y: mesh.position.z } },
        { x: planePoint.x, y: planePoint.z },
        0.25,
      );
      draggingMesh = mesh;
    };

    const handlePointerUp = () => {
      isUserInteracting = false;
      dragSession = null;
      draggingMesh = null;
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const currentTime = Date.now();

      // Animación de entrada de regiones
      regionAnimations.forEach((anim, id) => {
        const elapsed = currentTime - anim.startTime;
        if (elapsed > 0 && elapsed < 800) {
          const progress = elapsed / 800;
          const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          anim.mesh.position.y = THREE.MathUtils.lerp(-2, anim.mesh.userData.targetY, easeProgress);
        } else if (elapsed >= 800) {
          anim.mesh.position.y = anim.mesh.userData.targetY;
        }
      });

      // Animación de entrada del modelo
      if (mapModel && mapModel.position.y < 0) {
        mapModel.position.y = THREE.MathUtils.lerp(mapModel.position.y, 0, 0.05);
      }

      // Animación de partículas
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlesCount * 3; i += 3) {
        positions[i + 1] += velocities[i / 3];
        if (positions[i + 1] > 8) positions[i + 1] = 0;
        if (positions[i + 1] < 0) positions[i + 1] = 8;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      // Rotación automática suave
      if (autoRotate && !isUserInteracting && !dragSession) {
        rotationAngle += 0.002;
        const targetGroup = mapModel || regionGroup;
        targetGroup.rotation.y = rotationAngle;
      }

      // Animación de bounce en hover
      if (hovered && hovered.userData.bounceStart) {
        const bounceElapsed = currentTime - hovered.userData.bounceStart;
        if (bounceElapsed < 400) {
          const bounceProgress = bounceElapsed / 400;
          const bounce = Math.sin(bounceProgress * Math.PI) * 0.15;
          hovered.position.y = (hovered.userData.targetY || 0.1) + bounce;
        } else {
          delete hovered.userData.bounceStart;
        }
      }

      // Animación de luces
      pointLight1.intensity = 0.8 + Math.sin(currentTime * 0.001) * 0.3;
      pointLight2.intensity = 0.6 + Math.cos(currentTime * 0.0015) * 0.3;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      cancelAnimationFrame(raf);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [autoRotate]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Mapa 3D Interactivo</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Arrastra y suelta regiones para crear dinámicas de geografía. El hover resalta la región debajo del puntero y
          el evento onRegionSelect expone la selección actual.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="relative">
          <div ref={mapRef} className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white min-h-[320px] overflow-hidden shadow-xl" />
          
          {/* Control de rotación automática */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-lg"
          >
            {autoRotate ? "⏸ Pausar rotación" : "▶ Rotar automático"}
          </button>
        </div>

        <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Interacción actual</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {hoverRegion ? `hoverHighlight → ${hoverRegion}` : "Pasa el cursor para resaltar una región."}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedRegion ? `onRegionSelect("${selectedRegion}")` : "Haz clic para seleccionar una región."}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wide">Regiones</h3>
            <ul className="space-y-2">
              {REGION_INFO.map((region) => (
                <li
                  key={region.id}
                  className={`rounded-xl px-3 py-2 text-sm transition-all duration-300 ${
                    selectedRegion === region.id 
                      ? "bg-emerald-500 text-white shadow-lg scale-105" 
                      : hoverRegion === region.id
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 scale-102"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <span className="font-semibold">{region.label}</span>
                  <span className="block text-xs opacity-80">{region.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <li>• Drag & drop: mantén presionado y mueve la región.</li>
            <li>• Optimizado con GLTFLoader + Draco Loader.</li>
            <li>• Compatible con pantallas táctiles y mouse.</li>
            <li>• Rotación automática pausable.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function createGradientCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#e0f2fe');
  gradient.addColorStop(0.5, '#f1f5f9');
  gradient.addColorStop(1, '#ddd6fe');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  return canvas;
}