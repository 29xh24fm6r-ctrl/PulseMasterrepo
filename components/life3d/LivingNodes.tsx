// Living Nodes - State-driven reactive nodes with expressions
// components/life3d/LivingNodes.tsx

"use client";

import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getNodeState, NodeStatus, NodeEmotion } from "@/lib/realm/nodeState";
import { getNodePosition, getNodeScale } from "@/lib/realm/NodePositions";
import { HoloTag } from "@/components/nodes/HoloTag";
import { InsightBubble } from "@/components/nodes/InsightBubble";

interface LivingNodeProps {
  nodeId: "focus" | "emotion" | "growth";
  onSelect: () => void;
  colors: ReturnType<typeof getEmotionColors>;
  userId: string;
  hovered?: boolean;
  selected?: boolean;
}

function getEmotionColors(emotionState: string = "neutral") {
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

// Focus Node with state-driven behavior
export function LivingFocusNode({ nodeId, onSelect, colors, userId, hovered, selected }: LivingNodeProps) {
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  const beamRef1 = useRef<THREE.Mesh>(null);
  const beamRef2 = useRef<THREE.Mesh>(null);
  const beamRef3 = useRef<THREE.Mesh>(null);
  const lastPingTime = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  
  // Fixed semantic position
  const targetPosition = getNodePosition("focus");
  const nodeScale = getNodeScale("focus");

  useEffect(() => {
    async function loadStatus() {
      const s = await getNodeState("focus", userId);
      setStatus(s);
      if (s.message) {
        setShowInsight(true);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userId]);

  useFrame((state, delta) => {
    // Lerp to fixed semantic position
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPosition, 0.1);
    }

    if (!status) return;

    const refs = [beamRef1, beamRef2, beamRef3];
    const baseSpeed = 0.5 + status.urgency * 0.5; // Urgency affects pulse speed
    const baseScale = hovered ? 1.2 : selected ? 1.1 : 1.0;
    const healthModifier = status.health < 0.5 ? 0.8 : 1.0; // Dim if low health
    const finalScale = nodeScale * baseScale * healthModifier;

    refs.forEach((ref, i) => {
      if (ref.current) {
        const material = ref.current.material as THREE.MeshStandardMaterial;
        
        // Pulse based on urgency (only Y scale, not overall size)
        const pulse = 1 + Math.sin(state.clock.elapsedTime * baseSpeed * 2 + i) * 0.15;
        ref.current.scale.y = finalScale * pulse;
        ref.current.scale.x = finalScale * 0.5;
        ref.current.scale.z = finalScale * 0.5;
        
        // Glow based on momentum
        material.emissiveIntensity = hovered ? 1.8 : 0.6 + status.momentum * 0.6;
        
        // Flicker if blocked
        if (status.emotion === "blocked") {
          const flicker = Math.random() > 0.95 ? 0.3 : 1.0;
          material.opacity = (hovered ? 0.7 : 0.5) * flicker;
        } else {
          material.opacity = hovered ? 0.7 : 0.5;
        }

        // Ping pulse every 5 seconds if urgent
        if (status.urgency > 0.7 && state.clock.elapsedTime - lastPingTime.current > 5) {
          lastPingTime.current = state.clock.elapsedTime;
          ref.current.scale.multiplyScalar(1.3);
          setTimeout(() => {
            if (ref.current) ref.current.scale.setScalar(finalScale);
          }, 200);
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={targetPosition.toArray()} renderOrder={3} onPointerOver={() => {}} onPointerOut={() => {}} onClick={onSelect}>
      <mesh ref={beamRef1} position={[-0.3, 0, 0]} renderOrder={3}>
        <boxGeometry args={[0.15, 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={beamRef2} position={[0, 0, 0]} renderOrder={3}>
        <boxGeometry args={[0.15, 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={beamRef3} position={[0.3, 0, 0]} renderOrder={3}>
        <boxGeometry args={[0.15, 1.2, 0.15]} />
        <meshStandardMaterial
          color={colors.core}
          emissive={colors.core}
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      
      {/* HoloTag */}
      {status && (
        <HoloTag
          position={[0, 0.8, 0]}
          label="Focus"
          value={status.message}
          color={colors.core}
          nodeId="focus"
        />
      )}
      
      {/* Insight Bubble */}
      {showInsight && status?.message && (
        <InsightBubble
          position={[0, 1.2, 0]}
          message={status.message}
          onComplete={() => setShowInsight(false)}
        />
      )}
    </group>
  );
}

// Emotion Node with state-driven behavior
export function LivingEmotionNode({ nodeId, onSelect, colors, userId, hovered, selected }: LivingNodeProps) {
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Fixed semantic position
  const targetPosition = getNodePosition("emotion");
  const nodeScale = getNodeScale("emotion");

  useEffect(() => {
    async function loadStatus() {
      const s = await getNodeState("emotion", userId);
      setStatus(s);
      if (s.message) {
        setShowInsight(true);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useFrame((state, delta) => {
    // Lerp to fixed semantic position
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPosition, 0.1);
    }

    if (!status || !ringRef.current) return;
    
    const material = ringRef.current.material as THREE.MeshStandardMaterial;
    
    // NO rotation - fixed semantic position
    // Rotation speed based on emotion (subtle, not orbital)
    let rotationSpeed = 0.005;
    if (status.emotion === "rising") rotationSpeed = 0.01;
    else if (status.emotion === "falling") rotationSpeed = 0.002;
    else if (status.emotion === "blocked") rotationSpeed = -0.005; // Reverse when blocked
    
    ringRef.current.rotation.y += rotationSpeed;
    
    // Fixed scale based on semantic meaning
    const baseScale = hovered ? 1.1 : 1.0;
    ringRef.current.scale.setScalar(nodeScale * baseScale);
    
    // Glow based on momentum
    material.emissiveIntensity = hovered ? 1.4 : 0.5 + status.momentum * 0.7;
    
    // Color shift based on emotion
    if (status.emotion === "rising") {
      material.emissive.setHex(0xff6b35);
    } else if (status.emotion === "falling") {
      material.emissive.setHex(0x4a90e2);
    } else {
      material.emissive.setHex(parseInt(colors.ring1.replace("#", "0x")));
    }
  });

  return (
    <group ref={groupRef} position={targetPosition.toArray()} renderOrder={3} onPointerOver={() => {}} onPointerOut={() => {}} onClick={onSelect}>
      <mesh ref={ringRef} renderOrder={3}>
        <torusGeometry args={[0.4, 0.04, 16, 32]} />
        <meshStandardMaterial
          color={colors.ring1}
          emissive={colors.ring1}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      
      {/* HoloTag */}
      {status && (
        <HoloTag
          position={[0.6, 0, 0]}
          label="Emotion"
          value={status.message}
          color={colors.ring1}
          nodeId="emotion"
        />
      )}
      
      {/* Insight Bubble */}
      {showInsight && status?.message && (
        <InsightBubble
          position={[0.8, 0.3, 0]}
          message={status.message}
          onComplete={() => setShowInsight(false)}
        />
      )}
    </group>
  );
}

// Growth Node with state-driven behavior
export function LivingGrowthNode({ nodeId, onSelect, colors, userId, hovered, selected }: LivingNodeProps) {
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  const satellitesRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const count = 4;
  
  // Fixed semantic position
  const targetPosition = getNodePosition("growth");
  const nodeScale = getNodeScale("growth");

  useEffect(() => {
    async function loadStatus() {
      const s = await getNodeState("growth", userId);
      setStatus(s);
      if (s.message) {
        setShowInsight(true);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useFrame((state, delta) => {
    // Lerp to fixed semantic position
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPosition, 0.1);
    }

    if (!status || !satellitesRef.current) return;

    // NO orbital rotation - satellites stay in fixed positions relative to node
    // Subtle rotation for visual interest only
    satellitesRef.current.rotation.y += 0.01;
    
    // Fixed radius around semantic position
    const baseRadius = 0.3;
    const radius = baseRadius + status.momentum * 0.1; // Subtle expansion based on momentum
    
    satellitesRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        // Fixed positions around center (no orbital motion)
        const angle = (i / count) * Math.PI * 2;
        child.position.x = Math.cos(angle) * radius;
        child.position.z = Math.sin(angle) * radius;
        child.position.y = Math.sin(state.clock.elapsedTime * 1.5 + i) * 0.1; // Subtle float
        
        const material = child.material as THREE.MeshStandardMaterial;
        
        // Fixed scale based on semantic meaning
        const baseScale = hovered ? 1.2 : selected ? 1.1 : 1.0;
        const momentumScale = 0.9 + status.momentum * 0.1;
        child.scale.setScalar(nodeScale * baseScale * momentumScale);
        
        // Glow based on momentum
        material.emissiveIntensity = hovered ? 2.5 : 1.0 + status.momentum * 1.0;
        
        // Warm glow when momentum is high
        if (status.momentum > 0.7) {
          material.emissive.setHex(0xffd700);
        } else {
          material.emissive.setHex(parseInt(colors.ring2.replace("#", "0x")));
        }
      }
    });
  });

  return (
    <group ref={groupRef} position={targetPosition.toArray()} renderOrder={3} onPointerOver={() => {}} onPointerOut={() => {}} onClick={onSelect}>
      <group ref={satellitesRef} renderOrder={3}>
        {Array.from({ length: count }).map((_, i) => (
          <mesh key={i} renderOrder={3}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={colors.ring2}
              emissive={colors.ring2}
              emissiveIntensity={1}
              metalness={0.8}
              roughness={0.1}
            />
          </mesh>
        ))}
      </group>
      
      {/* HoloTag */}
      {status && (
        <HoloTag
          position={[-0.6, 0, 0]}
          label="Growth"
          value={status.message}
          color={colors.ring2}
          nodeId="growth"
        />
      )}
      
      {/* Insight Bubble */}
      {showInsight && status?.message && (
        <InsightBubble
          position={[-0.8, 0.3, 0]}
          message={status.message}
          onComplete={() => setShowInsight(false)}
        />
      )}
    </group>
  );
}

