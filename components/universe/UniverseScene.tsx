// Universe Scene - 3D Living Universe
// components/universe/UniverseScene.tsx

"use client";

import React, { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { UNIVERSE_NODES, UniverseNodeConfig } from "@/lib/universe/config";
import { UniverseNodeMetrics } from "@/lib/universe/state";

type EmotionState = "calm" | "neutral" | "energized" | "stressed";

interface UniverseSceneProps {
  emotionState?: EmotionState;
  onNodeHover?: (node: UniverseNodeConfig | null) => void;
  onNodeClick?: (node: UniverseNodeConfig) => void;
  selectedNodeId?: string | null;
  nodeMetrics?: Record<string, UniverseNodeMetrics>;
}

// Pulse Orb Component
function PulseOrb({ emotionState = "neutral" }: { emotionState?: EmotionState }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Emotion-based colors
  const getColor = () => {
    switch (emotionState) {
      case "calm":
        return new THREE.Color(0x3b82f6); // blue
      case "energized":
        return new THREE.Color(0xfb923c); // orange
      case "stressed":
        return new THREE.Color(0x8b5cf6); // muted purple
      default:
        return new THREE.Color(0x8b5cf6); // purple
    }
  };

  useFrame((state) => {
    if (meshRef.current) {
      // Breathing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.scale.setScalar(scale);

      // Slow rotation
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshStandardMaterial
        color={getColor()}
        emissive={getColor()}
        emissiveIntensity={hovered ? 0.8 : 0.5}
        metalness={0.3}
        roughness={0.2}
      />
      {/* Glow effect */}
      <mesh scale={1.2}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={0.2}
          transparent
          opacity={0.3}
        />
      </mesh>
    </mesh>
  );
}

// Orbital Ring Component
function OrbitalRing({ radius, color }: { radius: number; color: string }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Helper function to lerp
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// System Node Component
function SystemNode({
  node,
  emotionState,
  isSelected,
  onHover,
  onClick,
  metrics,
}: {
  node: UniverseNodeConfig;
  emotionState?: EmotionState;
  isSelected: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  metrics?: UniverseNodeMetrics;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);

  // Data-driven calculations
  const baseSize = node.size;
  const baseSpeed = node.orbitSpeed;
  const baseEmissive = 0.4;

  const dynamicSize = metrics
    ? lerp(baseSize * 0.85, baseSize * 1.4, metrics.importance)
    : baseSize;
  const dynamicSpeed = metrics
    ? baseSpeed * lerp(0.5, 1.8, metrics.urgency)
    : baseSpeed;
  const dynamicEmissive = metrics
    ? lerp(0.2, 1.2, metrics.momentum)
    : baseEmissive;
  const hasHighUrgency = metrics && metrics.urgency > 0.7;

  // Calculate position on orbit
  useFrame((state) => {
    if (meshRef.current) {
      timeRef.current += 0.01 * dynamicSpeed;
      const angle = (node.orbitAngle * Math.PI) / 180 + timeRef.current;
      const x = Math.cos(angle) * node.orbitRadius;
      const z = Math.sin(angle) * node.orbitRadius;
      const y = Math.sin(timeRef.current * 2) * 0.3; // subtle wobble

      meshRef.current.position.set(x, y, z);

      // Subtle rotation
      meshRef.current.rotation.y += 0.01;

      // Base scale from hover/select
      const baseTargetScale = hovered || isSelected ? 1.15 : 1;
      
      // Heat ripple effect for high urgency
      let finalScale = baseTargetScale;
      if (hasHighUrgency) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 1;
        finalScale = baseTargetScale * pulse;
      }
      
      meshRef.current.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.1);
    }
  });

  const color = new THREE.Color().setHSL(node.hue / 360, 0.7, 0.6);
  const emissiveIntensity = hovered || isSelected ? 1.0 : dynamicEmissive;

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHover(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[dynamicSize, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Outer glow */}
      {(hovered || isSelected) && (
        <mesh position={meshRef.current?.position}>
          <sphereGeometry args={[node.size * 1.5, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}

// Cosmic Dust Particles
function CosmicDust({ count = 2000 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const particles = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.0001;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.3} />
    </points>
  );
}

// Main Scene Component
function SceneContent({
  emotionState,
  onNodeHover,
  onNodeClick,
  selectedNodeId,
  nodeMetrics,
}: UniverseSceneProps) {
  const [hoveredNode, setHoveredNode] = useState<UniverseNodeConfig | null>(null);

  const handleNodeHover = (node: UniverseNodeConfig | null) => {
    setHoveredNode(node);
    onNodeHover?.(node);
  };

  const handleNodeClick = (node: UniverseNodeConfig) => {
    onNodeClick?.(node);
  };

  // Background gradient color based on emotion
  const getBgColor = () => {
    switch (emotionState) {
      case "calm":
        return "#1e3a5f";
      case "energized":
        return "#4a2c2a";
      case "stressed":
        return "#2d1b3d";
      default:
        return "#1a0f2e";
    }
  };

  return (
    <>
      {/* Background */}
      <color attach="background" args={[getBgColor()]} />
      <fog attach="fog" args={[getBgColor(), 20, 50]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#8b5cf6" />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={0.5} />

      {/* Cosmic Dust */}
      <CosmicDust count={2000} />

      {/* Orbital Rings */}
      <OrbitalRing radius={4} color="#8b5cf6" />
      <OrbitalRing radius={7} color="#ec4899" />
      <OrbitalRing radius={10} color="#06b6d4" />

      {/* Pulse Orb (Center) */}
      <PulseOrb emotionState={emotionState} />

      {/* System Nodes */}
      {UNIVERSE_NODES.map((node) => (
        <SystemNode
          key={node.id}
          node={node}
          emotionState={emotionState}
          isSelected={selectedNodeId === node.id}
          metrics={nodeMetrics?.[node.id]}
          onHover={(hovered) => handleNodeHover(hovered ? node : null)}
          onClick={() => handleNodeClick(node)}
        />
      ))}

      {/* Camera Controls */}
      <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={50} />
      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.5}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function UniverseScene(props: UniverseSceneProps) {
  return (
    <div className="absolute inset-0">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

