// Three.js scene for the tray run.
//
// Geometry comes straight from the arranger, so a cable sits at the same (x, y) here as in the
// 2D section - the 3D view is the same calculation extruded along the route, not a second model.
// Scene units are metres; the arranger works in millimetres, hence the S factor.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, type Mesh } from 'three';
import type { TrayArrangement } from '../../core/arranger';
import type { TrayType } from '../../core/types';
import { heatColor, typeColor } from '../../core/colors';

const S = 0.001; // mm -> m
const RAIL = 6 * S; // rail thickness

export interface SceneProps {
  trays: TrayArrangement[];
  trayWidthMm: number;
  trayHeightMm: number;
  trayType: TrayType;
  lengthM: number;
  /** 0 = assembled, 1 = fully exploded. */
  explode: number;
  showCover: boolean;
  showHeatmap: boolean;
  heatByRun: Map<string, number>;
  selectedRunId: string | null;
}

const TRAY_GAP = 0.15; // clear space between parallel tray runs (m)

export function TrayScene(props: SceneProps) {
  const { trays, trayWidthMm, trayHeightMm, lengthM } = props;
  const w = trayWidthMm * S;
  const spacing = w + TRAY_GAP;
  const totalWidth = trays.length * spacing - TRAY_GAP;

  return (
    <group position={[0, 0, 0]}>
      <Lighting lengthM={lengthM} />
      {trays.map((tray, i) => (
        <group key={tray.trayIndex} position={[-totalWidth / 2 + i * spacing + w / 2, 0, 0]}>
          <TrayShell {...props} />
          <CableBundle tray={tray} {...props} />
        </group>
      ))}
      <Floor lengthM={lengthM} width={Math.max(totalWidth * 2, 4)} depth={trayHeightMm * S} />
      <Hangers trays={trays.length} spacing={spacing} widthM={w} lengthM={lengthM} heightM={trayHeightMm * S} />
    </group>
  );
}

function Lighting({ lengthM }: { lengthM: number }) {
  return (
    <>
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#ffffff', '#c8d0dc', 0.65]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-lengthM}
        shadow-camera-right={lengthM}
        shadow-camera-top={lengthM}
        shadow-camera-bottom={-lengthM}
      />
      {/* Fill dari sisi berlawanan supaya bagian bawah tray tidak jadi siluet hitam. */}
      <directionalLight position={[-3, 2.5, -4]} intensity={0.45} color="#ffffff" />
    </>
  );
}

/** Side rails, bottom, rungs and the lift-off cover. */
function TrayShell({ trayWidthMm, trayHeightMm, trayType, lengthM, explode, showCover }: SceneProps) {
  const w = trayWidthMm * S;
  const h = trayHeightMm * S;
  const railShift = explode * 0.18;
  const coverLift = explode * 0.5;

  const rungs = useMemo(() => {
    if (trayType !== 'ladder') return [];
    const pitch = 0.3;
    const n = Math.max(1, Math.floor(lengthM / pitch));
    return Array.from({ length: n }, (_, i) => -lengthM / 2 + (i + 0.5) * pitch);
  }, [trayType, lengthM]);

  return (
    <group>
      {/* Side rails */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow
          receiveShadow
          position={[side * (w / 2 + RAIL / 2 + railShift), h / 2 - RAIL / 2, 0]}
        >
          <boxGeometry args={[RAIL, h, lengthM]} />
          <meshStandardMaterial color="#b9c4d2" metalness={0.35} roughness={0.42} />
        </mesh>
      ))}

      {/* Bottom - solid sheet, perforated sheet, or ladder rungs */}
      {trayType === 'ladder' ? (
        rungs.map((z) => (
          <mesh key={z} castShadow receiveShadow position={[0, -RAIL / 2, z]}>
            <boxGeometry args={[w + 2 * RAIL, RAIL, 0.05]} />
            <meshStandardMaterial color="#a6b2c2" metalness={0.35} roughness={0.45} />
          </mesh>
        ))
      ) : (
        <mesh castShadow receiveShadow position={[0, -RAIL / 2, 0]}>
          <boxGeometry args={[w + 2 * RAIL, RAIL, lengthM]} />
          <meshStandardMaterial
            color="#a6b2c2"
            metalness={0.35}
            roughness={trayType === 'perforated' ? 0.5 : 0.33}
          />
        </mesh>
      )}

      {/* Longitudinal rails that tie the rungs together */}
      {trayType === 'ladder' &&
        [-1, 1].map((side) => (
          <mesh key={`ln${side}`} castShadow position={[side * (w / 2 + RAIL / 2 + railShift), -RAIL / 2, 0]}>
            <boxGeometry args={[RAIL, RAIL, lengthM]} />
            <meshStandardMaterial color="#a6b2c2" metalness={0.35} roughness={0.45} />
          </mesh>
        ))}

      {showCover && (
        <mesh castShadow position={[0, h + RAIL / 2 + coverLift, 0]}>
          <boxGeometry args={[w + 2 * RAIL + 0.004, RAIL, lengthM]} />
          <meshStandardMaterial
            color="#cdd6e2"
            metalness={0.4}
            roughness={0.3}
            transparent
            opacity={explode > 0.05 ? 0.75 : 1}
          />
        </mesh>
      )}
    </group>
  );
}

/** Every cable in one tray, drawn as a single instanced mesh so 100+ runs stay smooth. */
function CableBundle({
  tray,
  trayWidthMm,
  lengthM,
  explode,
  showHeatmap,
  heatByRun,
  selectedRunId,
}: SceneProps & { tray: TrayArrangement }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const w = trayWidthMm * S;
  const count = tray.cables.length;

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new Color();
    tray.cables.forEach((c, i) => {
      const layerLift = (c.layer - 1) * explode * 0.12;
      dummy.position.set(c.x * S - w / 2, c.y * S + layerLift, 0);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.scale.set(c.r * S, 1, c.r * S);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const key = `${c.runId}#${c.runIndex}`;
      const base = showHeatmap ? heatColor(heatByRun.get(key) ?? 0) : typeColor(c.typeCode);
      color.set(base);
      if (selectedRunId && c.runId !== selectedRunId) color.multiplyScalar(0.35);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [tray, explode, showHeatmap, heatByRun, selectedRunId, dummy, w]);

  if (count === 0) return null;

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
      {/* Unit-radius cylinder scaled per instance; height is the tray length. */}
      <cylinderGeometry args={[1, 1, lengthM, 18, 1]} />
      {/* Matte sheath - a glossy material turns a bundle of cables into one bright ribbon. */}
      <meshStandardMaterial roughness={0.62} metalness={0.04} />
    </instancedMesh>
  );
}

function Floor({ lengthM, width, depth }: { lengthM: number; width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -depth - 1.2, 0]} receiveShadow>
      <planeGeometry args={[Math.max(width, lengthM) * 8, lengthM * 8]} />
      <meshStandardMaterial color="#dfe4ec" roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** Trapeze hangers - threaded rod each side plus a cross channel under the trays. */
function Hangers({
  trays,
  spacing,
  widthM,
  lengthM,
  heightM,
}: {
  trays: number;
  spacing: number;
  widthM: number;
  lengthM: number;
  heightM: number;
}) {
  const total = trays * spacing - (spacing - widthM);
  const positions = useMemo(() => {
    const pitch = 1.5;
    const n = Math.max(2, Math.round(lengthM / pitch) + 1);
    return Array.from({ length: n }, (_, i) => -lengthM / 2 + (i * lengthM) / (n - 1));
  }, [lengthM]);

  return (
    <group>
      {positions.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, -heightM / 2 - 0.02, 0]} castShadow>
            <boxGeometry args={[total + 0.2, 0.03, 0.04]} />
            <meshStandardMaterial color="#aab5c4" metalness={0.85} roughness={0.4} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[(side * (total + 0.16)) / 2, 0.3, 0]} castShadow>
              <cylinderGeometry args={[0.006, 0.006, 0.72, 10]} />
              <meshStandardMaterial color="#b9c4d2" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Keeps a PNG of the current frame in the store so the PDF report can include the 3D view even
 * though the canvas unmounts when the user switches tab. Captures shortly after any change
 * settles, which also avoids grabbing a half-drawn first frame.
 */
export function SceneSnapshot({ deps, onCapture }: { deps: unknown[]; onCapture: (png: string) => void }) {
  const gl = useThree((s) => s.gl);
  const pending = useRef(0);

  useFrame(() => {
    if (pending.current === 0 || performance.now() < pending.current) return;
    pending.current = 0;
    try {
      onCapture(gl.domElement.toDataURL('image/png'));
    } catch {
      // A tainted or lost context simply means no snapshot this time.
    }
  });

  useEffect(() => {
    pending.current = performance.now() + 500;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return null;
}

/** Drives the camera along the tray axis for the fly-through. */
export function FlyThrough({ active, lengthM, onDone }: { active: boolean; lengthM: number; onDone: () => void }) {
  const { camera } = useThree();
  const t = useRef(0);

  useEffect(() => {
    if (active) t.current = 0;
  }, [active]);

  useFrame((_, delta) => {
    if (!active) return;
    t.current += delta / 9; // one pass takes about nine seconds
    if (t.current >= 1) {
      onDone();
      return;
    }
    const z = -lengthM / 2 - 1 + t.current * (lengthM + 2);
    camera.position.set(Math.sin(t.current * Math.PI * 2) * 0.25, 0.22, z);
    camera.lookAt(0, 0.03, z + 1.4);
  });

  return null;
}

export type { Mesh };
