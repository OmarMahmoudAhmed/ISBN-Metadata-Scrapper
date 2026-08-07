'use client';

import { useEffect, useRef } from 'react';

/**
 * MouseGlow — تأثير توهج خفيف يتبع مؤشر الماوس (منقول من initMouseEffect
 * في المحرك الأصلي)، مُعاد كتابته باستخدام React ref + useEffect بدل
 * document.body.appendChild المباشر، حتى لا يتعارض مع دورة حياة React.
 */
export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let hideTimer: ReturnType<typeof setTimeout>;

    const handleMouseMove = (e: MouseEvent) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
      glow.style.opacity = '1';
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        glow.style.opacity = '0';
      }, 2000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(77,235,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 0.3s ease',
        opacity: 0,
      }}
    />
  );
}
