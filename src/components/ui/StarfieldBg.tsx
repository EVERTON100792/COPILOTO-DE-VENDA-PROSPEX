import { useEffect, useRef } from 'react';

export const StarfieldBg = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Create a spinning galaxy of golden particles
    const particles: { r: number; theta: number; size: number; speed: number; color: string }[] = [];
    const numParticles = 2500;
    
    // Golden/Orange colors like the image
    const colors = [
      'rgba(255, 215, 0, 0.8)', // Gold
      'rgba(255, 165, 0, 0.6)', // Orange
      'rgba(255, 235, 150, 0.9)', // Light gold
      'rgba(255, 140, 0, 0.7)'  // Dark orange
    ];

    const maxRadius = Math.max(width, height);

    for (let i = 0; i < numParticles; i++) {
      // Gaussian-like distribution favoring the inner ring but spreading out
      const u = Math.random();
      // Keep them away from the absolute center (void)
      const r = 100 + (Math.pow(u, 2.5) * maxRadius * 0.8); 
      
      const theta = Math.random() * Math.PI * 2;
      const size = Math.random() * 1.5 + 0.5;
      
      // Speed of rotation. Inner particles can rotate slightly faster or all uniformly.
      const speed = 0.0005 + (Math.random() * 0.0005); 
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({ r, theta, size, speed, color });
    }

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      particles.forEach(p => {
        p.theta += p.speed;
        const x = cx + Math.cos(p.theta) * p.r;
        const y = cy + Math.sin(p.theta) * p.r;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6,
        mixBlendMode: 'screen',
      }}
    />
  );
};
