import { getDeviceProfile } from '../../core/DeviceProfile';

/**
 * Aviator render budget.
 * Tier is derived from the shared DeviceProfile so the whole games module
 * agrees on what "weak device" means; the fields below are Aviator-specific
 * knobs (particle counts, path samples, parallax layers).
 */

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  tier: QualityTier;
  isMobile: boolean;
  maxDpr: number;
  targetFps: number;
  antialias: boolean;
  roundPixels: boolean;
  starCount: number;
  cloudCount: number;
  skySteps: number;
  pathSamples: number;
  pathStrokes: 1 | 2;
  pathRedrawMinDelta: number;
  trailFrequency: number;
  engineFrequency: number;
  trailMaxParticles: number;
  fireMaxParticles: number;
  smokeEnabled: boolean;
  ambientDust: boolean;
  cameraDrift: boolean;
  lightSweep: boolean;
  vignette: boolean;
  windStreaks: boolean;
  crashParticles: number;
  winParticles: number;
  useAddBlend: boolean;
}

function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return Math.min(window.innerWidth, window.innerHeight) < 700;
}

function detectMobile(): boolean {
  const device = getDeviceProfile();
  if (typeof navigator === 'undefined') return device.coarsePointer;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(ua)) return true;
  return device.coarsePointer && isNarrowViewport();
}

export function createQualityProfile(): QualityProfile {
  const device = getDeviceProfile();
  const isMobile = detectMobile();

  let tier: QualityTier = 'high';
  if (device.veryLow || (isMobile && device.lowPower)) tier = 'low';
  else if (isMobile || device.lowPower) tier = 'medium';
  // OS "reduce motion" never gets the heavy parallax tier.
  if (device.reducedMotion && tier === 'high') tier = 'medium';

  if (tier === 'low') {
    return {
      tier,
      isMobile,
      maxDpr: 1,
      targetFps: 30,
      antialias: false,
      roundPixels: true,
      starCount: 10,
      cloudCount: 2,
      skySteps: 6,
      pathSamples: 18,
      pathStrokes: 1,
      pathRedrawMinDelta: 0.012,
      trailFrequency: 72,
      engineFrequency: 90,
      trailMaxParticles: 12,
      fireMaxParticles: 0,
      smokeEnabled: false,
      ambientDust: false,
      cameraDrift: false,
      lightSweep: false,
      vignette: false,
      windStreaks: false,
      crashParticles: 10,
      winParticles: 10,
      useAddBlend: false,
    };
  }

  if (tier === 'medium') {
    return {
      tier,
      isMobile,
      maxDpr: 1.25,
      targetFps: 45,
      antialias: false,
      roundPixels: true,
      starCount: 18,
      cloudCount: 3,
      skySteps: 10,
      pathSamples: 28,
      pathStrokes: 2,
      pathRedrawMinDelta: 0.008,
      trailFrequency: 48,
      engineFrequency: 60,
      trailMaxParticles: 24,
      fireMaxParticles: 10,
      smokeEnabled: false,
      ambientDust: false,
      cameraDrift: !isMobile,
      lightSweep: !isMobile,
      vignette: true,
      windStreaks: true,
      crashParticles: 14,
      winParticles: 16,
      useAddBlend: true,
    };
  }

  // High — looks good, still budget-conscious.
  return {
    tier: 'high',
    isMobile,
    maxDpr: 2,
    targetFps: 60,
    antialias: true,
    roundPixels: false,
    starCount: 28,
    cloudCount: 5,
    skySteps: 14,
    pathSamples: 40,
    pathStrokes: 2,
    pathRedrawMinDelta: 0.004,
    trailFrequency: 36,
    engineFrequency: 42,
    trailMaxParticles: 32,
    fireMaxParticles: 14,
    smokeEnabled: !isMobile,
    ambientDust: !isMobile,
    cameraDrift: true,
    lightSweep: true,
    vignette: true,
    windStreaks: true,
    crashParticles: 20,
    winParticles: 22,
    useAddBlend: true,
  };
}

export const Quality = createQualityProfile();
