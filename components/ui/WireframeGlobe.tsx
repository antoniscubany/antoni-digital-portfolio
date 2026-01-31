"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Line } from "@react-three/drei";
import * as THREE from "three";

function GlobeLines() {
    const groupRef = useRef<THREE.Group>(null);
    const { pointer } = useThree();

    // Create latitude and longitude line points
    const lineData = useMemo(() => {
        const allLines: THREE.Vector3[][] = [];

        // Latitude lines
        for (let i = -80; i <= 80; i += 20) {
            const phi = (90 - i) * (Math.PI / 180);
            const points: THREE.Vector3[] = [];

            for (let j = 0; j <= 360; j += 5) {
                const theta = j * (Math.PI / 180);
                const x = 2 * Math.sin(phi) * Math.cos(theta);
                const y = 2 * Math.cos(phi);
                const z = 2 * Math.sin(phi) * Math.sin(theta);
                points.push(new THREE.Vector3(x, y, z));
            }

            allLines.push(points);
        }

        // Longitude lines
        for (let i = 0; i < 360; i += 30) {
            const theta = i * (Math.PI / 180);
            const points: THREE.Vector3[] = [];

            for (let j = 0; j <= 180; j += 5) {
                const phi = j * (Math.PI / 180);
                const x = 2 * Math.sin(phi) * Math.cos(theta);
                const y = 2 * Math.cos(phi);
                const z = 2 * Math.sin(phi) * Math.sin(theta);
                points.push(new THREE.Vector3(x, y, z));
            }

            allLines.push(points);
        }

        return allLines;
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Slow rotation
            groupRef.current.rotation.y += delta * 0.08;

            // Subtle mouse interaction
            const targetRotationX = pointer.y * 0.2;
            groupRef.current.rotation.x +=
                (targetRotationX - groupRef.current.rotation.x) * 0.02;
        }
    });

    return (
        <group ref={groupRef}>
            {lineData.map((points, index) => (
                <Line
                    key={index}
                    points={points}
                    color="#3b82f6"
                    lineWidth={1}
                    transparent
                    opacity={0.3}
                />
            ))}

            {/* Inner glow sphere */}
            <Sphere args={[1.9, 32, 32]}>
                <meshBasicMaterial color="#0a0a1a" transparent opacity={0.8} />
            </Sphere>

            {/* Outer glow */}
            <Sphere args={[2.1, 32, 32]}>
                <meshBasicMaterial color="#1e40af" transparent opacity={0.05} />
            </Sphere>
        </group>
    );
}

function Particles() {
    const pointsRef = useRef<THREE.Points>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);

    const { positions, colors } = useMemo(() => {
        const count = 500;
        const positionsArray = new Float32Array(count * 3);
        const colorsArray = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            // Random position on sphere surface
            const radius = 2.5 + Math.random() * 1.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positionsArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positionsArray[i * 3 + 1] = radius * Math.cos(phi);
            positionsArray[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            // Blue-ish color
            colorsArray[i * 3] = 0.2 + Math.random() * 0.2;
            colorsArray[i * 3 + 1] = 0.4 + Math.random() * 0.3;
            colorsArray[i * 3 + 2] = 0.8 + Math.random() * 0.2;
        }

        return { positions: positionsArray, colors: colorsArray };
    }, []);

    useEffect(() => {
        if (geometryRef.current) {
            geometryRef.current.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );
            geometryRef.current.setAttribute(
                "color",
                new THREE.BufferAttribute(colors, 3)
            );
        }
    }, [positions, colors]);

    useFrame((state, delta) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y += delta * 0.05;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry ref={geometryRef} />
            <pointsMaterial
                size={0.02}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
}

export default function WireframeGlobe() {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                style={{ background: "transparent" }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.5} />
                <GlobeLines />
                <Particles />
            </Canvas>
        </div>
    );
}
