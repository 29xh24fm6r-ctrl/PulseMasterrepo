// Life 3D Scene - Central orb, rings, particles
// components/life3d/Life3DScene.tsx

"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LivingFocusNode, LivingEmotionNode, LivingGrowthNode } from "./LivingNodes";
import { ReactiveAtmosphere } from "./ReactiveAtmosphere";
import { IntelligentCamera } from "./IntelligentCamera";
import { getNodeState } from "@/lib/realm/nodeState";

type EmotionState = "calm" | "neutral" | "energized" | "stressed";

interface Life3DSceneProps {
  emotionState?: EmotionState;
  onNodeSelect?: (nodeId: "focus" | "emotion" | "growth") => void;
  hoveredNodeId?: string | null;
  selectedNodeId?: string | null;
  userId?: string;
}

function getEmotionColors(emotionState: EmotionState = "neutral") {
  switch (emotionState) {
    case "calm":
      return {
        core: "#3b82f6",
        coreBase: "#1e40af",
        light: "#60a5fa",
        ring1: "#3b82f6",
        ring2: "#06b6d4",
      };
    case "energized":
      return {
        core: "#fb923c",
        coreBase: "#ea580c",
        light: "#fdba74",
        ring1: "#fb923c",
        ring2: "#fbbf24",
      };
    case "stressed":
      return {
        core: "#8b5cf6",
        coreBase: "#6d28d9",
        light: "#a78bfa",
        ring1: "#8b5cf6",
        ring2: "#ec4899",
      };
    default: // neutral
      return {
        core: "#a855f7",
        coreBase: "#7c3aed",
        light: "#c084fc",
        ring1: "#a855f7",
        ring2: "#ec4899",
      };
  }
}

// Central Pulse Orb
function PulseOrb({ colors }: { colors: ReturnType<typeof getEmotionColors> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Breathing animation - more pronounced (0.97 to 1.03)
      const scale = 0.97 + Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current) {
      // Glow follows main orb
      const scale = 1.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.06;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group>
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.9, 64, 64]} />
          <meshStandardMaterial
            emissive={colors.core}
            emissiveIntensity={1.8}
            color={colors.coreBase}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
      </Float>
      {/* Outer glow */}
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.9, 32, 32]} />
          <meshStandardMaterial
            emissive={colors.core}
            emissiveIntensity={0.4}
            transparent
            opacity={0.3}
          />
        </mesh>
      </Float>
    </group>
  );
}

// Rotating Ring - Layer 2
function RotatingRing({
  radius,
  tube,
  color,
  rotationAxis,
  speed,
}: {
  radius: number;
  tube: number;
  color: string;
  rotationAxis: "x" | "y" | "z";
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const angle = state.clock.elapsedTime * speed;
      if (rotationAxis === "x") {
        meshRef.current.rotation.x = angle;
      } else if (rotationAxis === "y") {
        meshRef.current.rotation.y = angle;
      } else {
        meshRef.current.rotation.z = angle;
      }
    }
  });

  return (
    <mesh ref={meshRef} rotation={rotationAxis === "x" ? [Math.PI / 2, 0, 0] : [0, 0, 0]} renderOrder={2}>
      <torusGeometry args={[radius, tube, 16, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={0.4}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
}

// Floating Particles
function FloatingParticles({ count = 100 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const particles = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y += 0.0005;
      points.current.rotation.x += 0.0003;
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
      <pointsMaterial size={0.08} color="#ffffff" transparent opacity={0.6} />
    </points>
  );
}

// Focus Node - 3 tall translucent beams rising from orb surface
function FocusNode({ onSelect, colors }: { onSelect: () => void; colors: ReturnType<typeof getEmotionColors> }) {
  const [hovered, setHovered] = useState(false);
  const beamRef1 = useRef<THREE.Mesh>(null);
  const beamRef2 = useRef<THREE.Mesh>(null);
  const beamRef3 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const refs = [beamRef1, beamRef2, beamRef3];
    refs.forEach((ref, i) => {
      if (ref.current) {
        // Subtle pulsing
        const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
        ref.current.scale.y = scale;
      }
    });
  });

  return (
    <group position={[0, 0.5, 0]} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onSelect}>
      <mesh ref={beamRef1} position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.15, hovered ? 1.5 : 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={hovered ? 1.5 : 0.8}
          transparent
          opacity={hovered ? 0.6 : 0.4}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={beamRef2} position={[0, 0, 0]}>
        <boxGeometry args={[0.15, hovered ? 1.5 : 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={hovered ? 1.5 : 0.8}
          transparent
          opacity={hovered ? 0.6 : 0.4}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={beamRef3} position={[0.3, 0, 0]}>
        <boxGeometry args={[0.15, hovered ? 1.5 : 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={hovered ? 1.5 : 0.8}
          transparent
          opacity={hovered ? 0.6 : 0.4}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// Emotion Node - Glowing outer ring with pulsing
function EmotionNode({ onSelect, colors }: { onSelect: () => void; colors: ReturnType<typeof getEmotionColors> }) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += 0.01;
      const material = ringRef.current.material as THREE.MeshStandardMaterial;
      const intensity = hovered ? 1.2 : 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      material.emissiveIntensity = intensity;
    }
  });

  return (
    <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onSelect}>
      <mesh ref={ringRef}>
        <torusGeometry args={[1.8, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={colors.ring1}
          emissive={colors.ring1}
          emissiveIntensity={hovered ? 1.2 : 0.6}
          transparent
          opacity={hovered ? 0.8 : 0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

// Growth Node - 3-5 small satellite orbs orbiting the main orb
function GrowthNode({ onSelect, colors }: { onSelect: () => void; colors: ReturnType<typeof getEmotionColors> }) {
  const [hovered, setHovered] = useState(false);
  const satellitesRef = useRef<THREE.Group>(null);
  const count = 4;

  useFrame((state) => {
    if (satellitesRef.current) {
      satellitesRef.current.rotation.y += 0.02;
      satellitesRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const angle = (i / count) * Math.PI * 2;
          const radius = 2.2;
          child.position.x = Math.cos(angle + state.clock.elapsedTime * 0.5) * radius;
          child.position.z = Math.sin(angle + state.clock.elapsedTime * 0.5) * radius;
          child.position.y = Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.3;
          
          // Pulsing
          const scale = hovered ? 1.3 : 0.9 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
          child.scale.setScalar(scale);
        }
      });
    }
  });

  return (
    <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onSelect}>
      <group ref={satellitesRef}>
        {Array.from({ length: count }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color={colors.ring2}
              emissive={colors.ring2}
              emissiveIntensity={hovered ? 2 : 1}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Scene Content
function SceneContent({ 
  emotionState, 
  onNodeSelect, 
  hoveredNodeId, 
  selectedNodeId,
  userId 
}: { 
  emotionState: EmotionState; 
  onNodeSelect: (nodeId: "focus" | "emotion" | "growth") => void;
  hoveredNodeId?: string | null;
  selectedNodeId?: string | null;
  userId?: string;
}) {
  const colors = getEmotionColors(emotionState);
  const [dominantEmotion, setDominantEmotion] = useState<"neutral" | "rising" | "falling" | "blocked" | "flowing">("neutral");

  React.useEffect(() => {
    async function fetchDominantEmotion() {
      if (userId) {
        try {
          const emotionState = await getNodeState("emotion", userId);
          setDominantEmotion(emotionState.emotion);
        } catch (err) {
          console.error("Failed to fetch emotion state:", err);
        }
      }
    }
    fetchDominantEmotion();
    const interval = setInterval(fetchDominantEmotion, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <>
      <color attach="background" args={["#050014"]} />

      {/* Reactive Atmosphere */}
      <ReactiveAtmosphere emotion={dominantEmotion} />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 3, 4]} intensity={1.4} color={colors.light} />
      <pointLight position={[-4, -2, 2]} intensity={0.6} color={colors.light} />
      <pointLight position={[4, -2, 2]} intensity={0.6} color={colors.light} />

      {/* Stars - Layer 0 */}
      <Stars radius={50} depth={40} count={2000} factor={4} fade speed={0.3} renderOrder={0} />

      {/* Floating Particles - Layer 0 */}
      <FloatingParticles count={150} />

      {/* Intelligent Camera */}
      <IntelligentCamera hoveredNodeId={hoveredNodeId} selectedNodeId={selectedNodeId} />

      {/* Central Orb - Layer 1 */}
      <group renderOrder={1}>
        <PulseOrb colors={colors} />
      </group>

      {/* Rotating Rings - Layer 2 */}
      <group renderOrder={2}>
        <RotatingRing radius={1.5} tube={0.02} color={colors.ring1} rotationAxis="y" speed={0.3} />
        <RotatingRing radius={2} tube={0.015} color={colors.ring2} rotationAxis="x" speed={0.2} />
        <RotatingRing radius={2.5} tube={0.01} color={colors.ring1} rotationAxis="z" speed={0.25} />
      </group>

      {/* Living Interactive Nodes */}
      {userId && (
        <>
          <LivingFocusNode 
            nodeId="focus" 
            onSelect={() => onNodeSelect("focus")} 
            colors={colors}
            userId={userId}
            hovered={hoveredNodeId === "focus"}
            selected={selectedNodeId === "focus"}
          />
          <LivingEmotionNode 
            nodeId="emotion" 
            onSelect={() => onNodeSelect("emotion")} 
            colors={colors}
            userId={userId}
            hovered={hoveredNodeId === "emotion"}
            selected={selectedNodeId === "emotion"}
          />
          <LivingGrowthNode 
            nodeId="growth" 
            onSelect={() => onNodeSelect("growth")} 
            colors={colors}
            userId={userId}
            hovered={hoveredNodeId === "growth"}
            selected={selectedNodeId === "growth"}
          />
        </>
      )}

      {/* Fallback to old nodes if no userId */}
      {!userId && (
        <>
          <FocusNode onSelect={() => onNodeSelect("focus")} colors={colors} />
          <EmotionNode onSelect={() => onNodeSelect("emotion")} colors={colors} />
          <GrowthNode onSelect={() => onNodeSelect("growth")} colors={colors} />
        </>
      )}

      {/* Vertical light beam below orb */}
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 2, 16]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Camera Controls - Fixed framing law */}
      <OrbitControls
        enablePan={false}
        minDistance={3.8}
        maxDistance={4.5}
        target={[0, 0.3, 0]}
        autoRotate={!hoveredNodeId && !selectedNodeId}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function Life3DScene({ 
  emotionState = "neutral", 
  onNodeSelect,
  hoveredNodeId,
  selectedNodeId,
  userId 
}: Life3DSceneProps) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Vignette edges */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#050014] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#050014] to-transparent" />
      </div>
      <Canvas camera={{ position: [0, 0.8, 4.5], fov: 45 }}>
        <SceneContent 
          emotionState={emotionState} 
          onNodeSelect={onNodeSelect || (() => {})}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
          userId={userId}
        />
      </Canvas>
    </div>
  );
}

