"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import {
    Code,
    Database,
    Globe,
    Server,
    Cpu,
    Shield,
    Zap,
    Layout,
    type LucideIcon
} from "lucide-react";
import { renderToString } from "react-dom/server";

// Icon configuration
const icons: { Icon: LucideIcon; label: string }[] = [
    { Icon: Code, label: "Code" },
    { Icon: Database, label: "Database" },
    { Icon: Globe, label: "Globe" },
    { Icon: Server, label: "Server" },
    { Icon: Cpu, label: "CPU" },
    { Icon: Shield, label: "Shield" },
    { Icon: Zap, label: "Zap" },
    { Icon: Layout, label: "Layout" },
];

// Generate points on a sphere using Fibonacci distribution
function fibonacciSphere(samples: number, radius: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (Math.sqrt(5) - 1); // golden angle

    for (let i = 0; i < samples; i++) {
        const y = 1 - (i / (samples - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;

        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }

    return points;
}

// Create texture from Lucide icon
function createIconTexture(Icon: LucideIcon): THREE.Texture {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    // Clear with transparent background
    ctx.clearRect(0, 0, size, size);

    // Draw icon as SVG
    const svgString = renderToString(
        <Icon size={80} color="#00f0ff" strokeWidth={1.5} />
    );
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const texture = new THREE.Texture(canvas);

    img.onload = () => {
        ctx.drawImage(img, (size - 80) / 2, (size - 80) / 2, 80, 80);
        texture.needsUpdate = true;
        URL.revokeObjectURL(url);
    };
    img.src = url;

    return texture;
}

// Individual floating icon
function FloatingIcon({
    position,
    Icon,
    index,
}: {
    position: THREE.Vector3;
    Icon: LucideIcon;
    index: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const tex = createIconTexture(Icon);
        setTexture(tex);
        return () => {
            tex.dispose();
        };
    }, [Icon]);

    useFrame((state) => {
        if (!meshRef.current) return;
        // Subtle floating animation
        const offset = index * 0.5;
        meshRef.current.position.y =
            position.y + Math.sin(state.clock.elapsedTime * 0.8 + offset) * 0.05;
        // Always face camera
        meshRef.current.lookAt(state.camera.position);
    });

    if (!texture) return null;

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial map={texture} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
    );
}

// Rotating sphere container
function RotatingSphere() {
    const groupRef = useRef<THREE.Group>(null);
    const { mouse, viewport } = useThree();
    const targetRotation = useRef({ x: 0, y: 0 });

    const points = useMemo(() => fibonacciSphere(icons.length, 2), []);

    useFrame(() => {
        if (!groupRef.current) return;

        // Mouse-following rotation (subtle)
        targetRotation.current.y = mouse.x * 0.3;
        targetRotation.current.x = -mouse.y * 0.2;

        // Smooth interpolation
        groupRef.current.rotation.y +=
            (targetRotation.current.y - groupRef.current.rotation.y + 0.002) * 0.05;
        groupRef.current.rotation.x +=
            (targetRotation.current.x - groupRef.current.rotation.x) * 0.05;
    });

    return (
        <group ref={groupRef}>
            {/* Wireframe sphere for structure */}
            <mesh>
                <sphereGeometry args={[2, 24, 24]} />
                <meshBasicMaterial
                    color="#00f0ff"
                    wireframe
                    transparent
                    opacity={0.08}
                />
            </mesh>

            {/* Floating icons */}
            {icons.map((icon, index) => (
                <FloatingIcon
                    key={icon.label}
                    position={points[index]}
                    Icon={icon.Icon}
                    index={index}
                />
            ))}

            {/* Center glow */}
            <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#00f0ff" transparent opacity={0.6} />
            </mesh>
        </group>
    );
}

export default function TechGlobe() {
    return (
        <div className="w-full h-full min-h-[400px] lg:min-h-[500px]">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                style={{ background: "transparent" }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.5} />
                <RotatingSphere />
            </Canvas>
        </div>
    );
}
