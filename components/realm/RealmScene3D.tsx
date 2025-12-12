// Realm Scene 3D - Main 3D scene for a realm
// components/realm/RealmScene3D.tsx

"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import { RealmState } from "@/lib/realms/realm-engine/types";
import { SemanticNode3D } from "@/components/nodes/SemanticNode3D";
import { NodeCluster3D } from "@/components/nodes/NodeCluster3D";

interface RealmScene3DProps {
  realmState: RealmState;
  onNodeHover?: (node: any) => void;
  onNodeClick?: (node: any) => void;
}

function SceneContent({ realmState, onNodeHover, onNodeClick }: RealmScene3DProps) {
  const { camera, atmosphere, nodes, clusters } = realmState;

  return (
    <>
      {/* Background */}
      <color attach="background" args={[atmosphere.fogColor]} />
      <fog attach="fog" args={[atmosphere.fogColor, atmosphere.fogDensity * 10, atmosphere.fogDensity * 30]} />

      {/* Lighting */}
      <ambientLight intensity={atmosphere.ambientLight} />
      {atmosphere.pointLights.map((light, i) => (
        <pointLight
          key={i}
          position={light.position}
          color={light.color}
          intensity={light.intensity}
        />
      ))}

      {/* Stars */}
      <Stars radius={50} depth={40} count={2000} factor={4} fade speed={0.3} />

      {/* Central orb (life reactor) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={1.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Nodes */}
      {nodes.map((node) => (
        <SemanticNode3D
          key={node.id}
          node={node}
          onHover={onNodeHover}
          onClick={onNodeClick}
        />
      ))}

      {/* Clusters */}
      {clusters.map((cluster) => (
        <NodeCluster3D
          key={cluster.id}
          cluster={cluster}
          onNodeHover={onNodeHover}
          onNodeClick={onNodeClick}
        />
      ))}

      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={camera.position}
        fov={camera.fov}
      />
      <OrbitControls
        target={camera.target}
        enablePan={false}
        minDistance={camera.minDistance}
        maxDistance={camera.maxDistance}
        autoRotate={camera.autoRotate}
        autoRotateSpeed={camera.autoRotateSpeed}
      />
    </>
  );
}

export function RealmScene3D(props: RealmScene3DProps) {
  return (
    <div className="absolute inset-0">
      <Canvas>
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}



