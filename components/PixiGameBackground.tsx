"use client";

import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

type Particle = {
  sprite: Sprite;
  vx: number;
  vy: number;
  baseAlpha: number;
  phase: number;
};

type PixiGameBackgroundProps = {
  intensity?: "low" | "medium" | "high";
};

const intensityConfig = {
  low: { particleCount: 26, speed: 0.18 },
  medium: { particleCount: 42, speed: 0.26 },
  high: { particleCount: 62, speed: 0.34 },
} as const;

export function PixiGameBackground({
  intensity = "medium",
}: Readonly<PixiGameBackgroundProps>) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const setup = async () => {
      const app = new Application();
      await app.init({
        width: root.clientWidth || 1200,
        height: root.clientHeight || 800,
        antialias: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });

      if (disposed) {
        app.destroy(true);
        return;
      }

      root.appendChild(app.canvas);

      const scene = new Container();
      app.stage.addChild(scene);

      const glow = new Graphics();
      scene.addChild(glow);

      const { particleCount, speed } = intensityConfig[intensity];
      const particles: Particle[] = [];

      for (let index = 0; index < particleCount; index += 1) {
        const dot = new Sprite(Texture.WHITE);
        dot.anchor.set(0.5);
        dot.width = 2 + Math.random() * 3.5;
        dot.height = dot.width;
        dot.tint = Math.random() > 0.5 ? 0xf59e0b : 0xf97316;
        dot.x = Math.random() * app.renderer.width;
        dot.y = Math.random() * app.renderer.height;

        const particle: Particle = {
          sprite: dot,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          baseAlpha: 0.14 + Math.random() * 0.24,
          phase: Math.random() * Math.PI * 2,
        };

        dot.alpha = particle.baseAlpha;
        particles.push(particle);
        scene.addChild(dot);
      }

      let tick = 0;

      const drawGlow = () => {
        glow.clear();
        glow.rect(0, 0, app.renderer.width, app.renderer.height);
        glow.fill({ color: 0xffedd5, alpha: 0.06 });

        const waveY = app.renderer.height * 0.32 + Math.sin(tick * 0.004) * 28;
        glow.roundRect(-80, waveY, app.renderer.width + 160, 90, 42);
        glow.fill({ color: 0xf59e0b, alpha: 0.07 });
      };

      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        tick += delta;
        drawGlow();

        for (const particle of particles) {
          particle.sprite.x += particle.vx * delta * 2;
          particle.sprite.y += particle.vy * delta * 2;

          const shimmer =
            Math.sin(tick * 0.035 + particle.phase) * 0.08 + particle.baseAlpha;
          particle.sprite.alpha = shimmer;

          if (particle.sprite.x < -8) {
            particle.sprite.x = app.renderer.width + 8;
          }
          if (particle.sprite.x > app.renderer.width + 8) {
            particle.sprite.x = -8;
          }
          if (particle.sprite.y < -8) {
            particle.sprite.y = app.renderer.height + 8;
          }
          if (particle.sprite.y > app.renderer.height + 8) {
            particle.sprite.y = -8;
          }
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        if (!root) {
          return;
        }
        app.renderer.resize(root.clientWidth || 1200, root.clientHeight || 800);
      });

      resizeObserver.observe(root);

      return () => {
        resizeObserver.disconnect();
        app.destroy(true);
      };
    };

    let cleanup: (() => void) | undefined;

    void setup().then((fn) => {
      cleanup = fn;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [intensity]);

  return (
    <div className="absolute inset-0 -z-0 overflow-hidden" ref={rootRef} />
  );
}
