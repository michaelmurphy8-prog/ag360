// lib/maps/windParticles.ts
// Animated wind particle system overlaying Mapbox GL
// Uses Open-Meteo for wind data (free, no API key needed)

import mapboxgl from "mapbox-gl";

interface WindDataPoint {
  lat: number;
  lng: number;
  u: number; // east-west component (m/s)
  v: number; // north-south component (m/s)
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  prevX: number;
  prevY: number;
}

interface WindGridConfig {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  step: number;
}

export class WindParticleLayer {
  private map: mapboxgl.Map;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private windGrid: WindDataPoint[] = [];
  private animationId: number | null = null;
  private active = false;
  private resizeObserver: ResizeObserver | null = null;

  // Tuning parameters
  private PARTICLE_COUNT = 3000;
  private PARTICLE_MIN_AGE = 20;
  private PARTICLE_MAX_AGE = 100;
  private SPEED_FACTOR = 0.3;
  private LINE_WIDTH = 1.2;
  private FADE_OPACITY = 0.93;

  constructor(map: mapboxgl.Map) {
    this.map = map;
  }

  /** Activate wind layer: fetch data + start animation */
  async start() {
    if (this.active) return;
    this.active = true;
    this.createCanvas();
    await this.fetchWindData();
    this.initParticles();
    this.animate();
    this.bindMapEvents();
  }

  /** Stop and clean up */
  stop() {
    this.active = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.windGrid = [];
    this.unbindMapEvents();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /** Create a canvas element overlaying the map */
  private createCanvas() {
    const container = this.map.getContainer();
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "5";
    this.canvas.width = container.offsetWidth * window.devicePixelRatio;
    this.canvas.height = container.offsetHeight * window.devicePixelRatio;
    this.canvas.style.width = container.offsetWidth + "px";
    this.canvas.style.height = container.offsetHeight + "px";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(container);
  }

  private resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    const container = this.map.getContainer();
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    this.canvas.width = w * window.devicePixelRatio;
    this.canvas.height = h * window.devicePixelRatio;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  /** Fetch wind u/v grid from Open-Meteo for the visible bounds */
  private async fetchWindData() {
    const bounds = this.map.getBounds();
    if (!bounds) return;

    const latMin = Math.max(bounds.getSouth() - 0.5, -90);
    const latMax = Math.min(bounds.getNorth() + 0.5, 90);
    const lngMin = bounds.getWest() - 0.5;
    const lngMax = bounds.getEast() + 0.5;

    // Build a small grid that fits in ONE API call (max ~40 points)
    const GRID_SIZE = 6; // 6x6 = 36 points max
    const latStep = (latMax - latMin) / (GRID_SIZE - 1);
    const lngStep = (lngMax - lngMin) / (GRID_SIZE - 1);

    const lats: number[] = [];
    const lngs: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) lats.push(Math.round((latMin + i * latStep) * 100) / 100);
    for (let i = 0; i < GRID_SIZE; i++) lngs.push(Math.round((lngMin + i * lngStep) * 100) / 100);

    const coordPairs: { lat: number; lng: number }[] = [];
    for (const lat of lats) {
      for (const lng of lngs) {
        coordPairs.push({ lat, lng });
      }
    }

    try {
      const latParam = coordPairs.map((c) => c.lat).join(",");
      const lngParam = coordPairs.map((c) => c.lng).join(",");

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latParam}&longitude=${lngParam}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Wind API error:", res.status);
        return;
      }
      const data = await res.json();

      const results = Array.isArray(data) ? data : [data];
      const grid: WindDataPoint[] = [];

      results.forEach((r: any, idx: number) => {
        if (!r?.current) return;
        const speed = r.current.wind_speed_10m || 0;
        const dir = r.current.wind_direction_10m || 0;
        const dirRad = ((270 - dir) * Math.PI) / 180;
        const u = speed * Math.cos(dirRad);
        const v = speed * Math.sin(dirRad);

        grid.push({
          lat: coordPairs[idx].lat,
          lng: coordPairs[idx].lng,
          u,
          v,
          speed,
        });
      });

      this.windGrid = grid;
    } catch (err) {
      console.error("Wind data fetch error:", err);
    }
  }

  /** Determine grid step based on zoom level */
  private getGridStep(): number {
    const zoom = this.map.getZoom();
    if (zoom > 10) return 0.1;
    if (zoom > 8) return 0.25;
    if (zoom > 6) return 0.5;
    if (zoom > 4) return 1;
    return 2;
  }

  /** Initialize random particles across the viewport */
  private initParticles() {
    const container = this.map.getContainer();
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    this.particles = [];

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        prevX: 0,
        prevY: 0,
        age: Math.floor(Math.random() * this.PARTICLE_MAX_AGE),
        maxAge: this.PARTICLE_MIN_AGE + Math.floor(Math.random() * (this.PARTICLE_MAX_AGE - this.PARTICLE_MIN_AGE)),
      });
    }
  }

  /** Interpolate wind at a given screen position */
  private getWindAt(x: number, y: number): { u: number; v: number; speed: number } {
    if (this.windGrid.length === 0) return { u: 0, v: 0, speed: 0 };

    const lngLat = this.map.unproject([x, y]);
    const { lng, lat } = lngLat;

    // Find nearest 2 grid points and weighted interpolate
    let minDist = Infinity;
    let nearest: WindDataPoint | null = null;
    let second: WindDataPoint | null = null;
    let minDist2 = Infinity;

    for (const p of this.windGrid) {
      const d = Math.abs(p.lat - lat) + Math.abs(p.lng - lng);
      if (d < minDist) {
        minDist2 = minDist;
        second = nearest;
        minDist = d;
        nearest = p;
      } else if (d < minDist2) {
        minDist2 = d;
        second = p;
      }
    }

    if (!nearest) return { u: 0, v: 0, speed: 0 };
    if (!second) return { u: nearest.u, v: nearest.v, speed: nearest.speed };

    const totalDist = minDist + minDist2;
    if (totalDist === 0) return { u: nearest.u, v: nearest.v, speed: nearest.speed };

    const w1 = 1 - minDist / totalDist;
    const w2 = 1 - minDist2 / totalDist;
    const wSum = w1 + w2;

    return {
      u: (nearest.u * w1 + second.u * w2) / wSum,
      v: (nearest.v * w1 + second.v * w2) / wSum,
      speed: (nearest.speed * w1 + second.speed * w2) / wSum,
    };
  }

  /** Get particle color based on wind speed (km/h visual) */
  private getSpeedColor(speed: number): string {
    if (speed < 2) return "rgba(100, 200, 255, 0.4)";   // light blue — calm
    if (speed < 5) return "rgba(100, 230, 200, 0.5)";   // teal — gentle
    if (speed < 10) return "rgba(130, 255, 160, 0.6)";  // green — moderate
    if (speed < 15) return "rgba(255, 230, 100, 0.7)";  // yellow — fresh
    if (speed < 20) return "rgba(255, 160, 60, 0.8)";   // orange — strong
    return "rgba(255, 80, 80, 0.9)";                     // red — severe
  }

  /** Core animation loop */
  private animate = () => {
    if (!this.active || !this.ctx || !this.canvas) return;

    const container = this.map.getContainer();
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    // Fade existing trails
    this.ctx.fillStyle = `rgba(8, 12, 21, ${1 - this.FADE_OPACITY})`;
    this.ctx.globalCompositeOperation = "destination-in";
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = `rgba(8, 12, 21, ${1 - this.FADE_OPACITY})`;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillRect(0, 0, w, h);

    // Update and draw particles
    this.ctx.lineWidth = this.LINE_WIDTH;
    this.ctx.globalCompositeOperation = "lighter";

    for (const p of this.particles) {
      p.prevX = p.x;
      p.prevY = p.y;

      const wind = this.getWindAt(p.x, p.y);

      // Scale u/v by zoom-dependent factor
      const zoom = this.map.getZoom();
      const scale = this.SPEED_FACTOR * Math.pow(2, zoom - 7);

      p.x += wind.u * scale;
      p.y -= wind.v * scale; // canvas Y is inverted

      p.age++;

      // Reset if out of bounds or too old
      if (p.age > p.maxAge || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.prevX = p.x;
        p.prevY = p.y;
        p.age = 0;
        p.maxAge = this.PARTICLE_MIN_AGE + Math.floor(Math.random() * (this.PARTICLE_MAX_AGE - this.PARTICLE_MIN_AGE));
        continue;
      }

      // Draw trail line
      const opacity = 1 - p.age / p.maxAge;
      this.ctx.strokeStyle = this.getSpeedColor(wind.speed).replace(/[\d.]+\)$/, `${opacity * 0.7})`);
      this.ctx.beginPath();
      this.ctx.moveTo(p.prevX, p.prevY);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    }

    this.ctx.globalCompositeOperation = "source-over";
    this.animationId = requestAnimationFrame(this.animate);
  };

  // ── Map event handlers ────────────────────────────
  private moveEndHandler = () => {
    if (!this.active) return;
    this.fetchWindData();
  };

  private moveHandler = () => {
    if (this.ctx && this.canvas) {
      const container = this.map.getContainer();
      this.ctx.clearRect(0, 0, container.offsetWidth, container.offsetHeight);
    }
  };

  private bindMapEvents() {
    this.map.on("moveend", this.moveEndHandler);
    this.map.on("move", this.moveHandler);
  }

  private unbindMapEvents() {
    this.map.off("moveend", this.moveEndHandler);
    this.map.off("move", this.moveHandler);
  }

  isActive(): boolean {
    return this.active;
  }
}