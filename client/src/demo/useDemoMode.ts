import { useCallback, useEffect, useState } from 'react';
import {
  isDemoMode,
  setDemoMode,
  subscribeDemoMode,
  resetAllDemoSessions,
} from './index';

export function useDemoMode() {
  const [isDemo, setIsDemo] = useState(isDemoMode);

  useEffect(() => subscribeDemoMode(setIsDemo), []);

  const enableDemo = useCallback((on: boolean) => {
    resetAllDemoSessions();
    setDemoMode(on);
  }, []);

  const toggleDemo = useCallback(() => {
    enableDemo(!isDemoMode());
  }, [enableDemo]);

  return { isDemo, setDemo: enableDemo, toggleDemo };
}
