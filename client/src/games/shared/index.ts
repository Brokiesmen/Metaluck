/**
 * Game Design System — reusable Phaser UI + services for all minigames.
 * No React / wallet / auth coupling.
 */

export { GameTheme, hexColor } from './theme/tokens';
export type { GameThemeColors } from './theme/tokens';
export { formatAmount, formatMultiplier, formatCountdown, clamp } from './theme/format';

export { GameButton } from './ui/GameButton';
export type { GameButtonOptions, GameButtonVariant } from './ui/GameButton';

export { BetPanel } from './ui/BetPanel';
export type { BetPanelOptions } from './ui/BetPanel';

export { BalancePanel } from './ui/BalancePanel';
export type { BalancePanelOptions } from './ui/BalancePanel';

export { MultiplierDisplay, Multiplier } from './ui/Multiplier';
export type { MultiplierOptions } from './ui/Multiplier';

export { CountdownTimer, Timer } from './ui/CountdownTimer';
export type { CountdownTimerOptions } from './ui/CountdownTimer';

export { HistoryStrip, History } from './ui/HistoryStrip';
export type { HistoryStripOptions, HistoryItem, HistoryTone } from './ui/HistoryStrip';

export { LoadingScreen } from './ui/LoadingScreen';
export type { LoadingScreenOptions } from './ui/LoadingScreen';

export { ResultOverlay } from './ui/ResultOverlay';
export type { ResultOverlayOptions, ResultOverlayShowOpts, ResultKind } from './ui/ResultOverlay';

export { drawRoundRect, makeLabelStyle, makeMonoStyle } from './ui/draw';
export { OverlayShell, overlayTitleStyle } from './ui/OverlayShell';
export type { OverlayKind } from './ui/OverlayShell';

/** Re-export core services used by the design system. */
export { SoundManager } from '../core/SoundManager';
export type { SoundId } from '../core/SoundManager';
export { AnimationManager } from '../core/AnimationManager';
export { Haptics } from '../core/Haptics';
export { getDeviceProfile } from '../core/DeviceProfile';
export type { DeviceProfile } from '../core/DeviceProfile';
