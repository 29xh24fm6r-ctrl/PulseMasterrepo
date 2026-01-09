"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
}

export function CinematicBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let particles: Particle[] = [];
        let animationFrameId: number;
        let mouseX = -1000;
        let mouseY = -1000;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000); // 1 particle per 15000px
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.2, // Slow movement
                    vy: (Math.random() - 0.5) * 0.2,
                    size: Math.random() * 1.5 + 0.5,
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Particles & Connections
            particles.forEach((p, i) => {
                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Bounce off edges
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                // Draw Dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(127, 19, 236, 0.3)"; // #7f13ec base
                ctx.fill();

                // Connect to neighbors
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dbx = p.x - p2.x;
                    const dby = p.y - p2.y;
                    const dist = Math.sqrt(dbx * dbx + dby * dby);

                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(127, 19, 236, ${0.1 * (1 - dist / 100)})`;
                        ctx.stroke();
                    }
                }

                // Connect to Mouse (Interaction)
                const dmx = p.x - mouseX;
                const dmy = p.y - mouseY;
                const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);

                if (distMouse < 200) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.strokeStyle = `rgba(127, 19, 236, ${0.4 * (1 - distMouse / 200)})`;
                    ctx.stroke();

                    // Subtle push away from mouse
                    if (distMouse < 100) {
                        p.x += dmx * 0.01;
                        p.y += dmy * 0.01;
                    }
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        };

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        resize();
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 bg-[#0a070e]">
            {/* Deep Field Gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-[#0a070e] to-[#1a1025]" />

            {/* Canvas Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

            {/* Atmospheric Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#7f13ec]/5 rounded-full blur-[150px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7f13ec]/5 rounded-full blur-[150px]" />
        </div>
    );
}
