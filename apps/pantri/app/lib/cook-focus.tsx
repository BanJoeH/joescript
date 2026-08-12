import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";

type CookFocusContextValue = {
  focused: boolean;
  setFocused: (focused: boolean) => void;
  toggleFocused: () => void;
};

const CookFocusContext = createContext<CookFocusContextValue | null>(null);

export function CookFocusProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Leaving a recipe (or changing recipes) should always exit focus.
    void location.pathname;
    setFocused(false);
  }, [location.pathname]);

  const toggleFocused = useCallback(() => {
    setFocused((current) => !current);
  }, []);

  const value = useMemo(() => ({ focused, setFocused, toggleFocused }), [focused, toggleFocused]);

  return <CookFocusContext.Provider value={value}>{children}</CookFocusContext.Provider>;
}

export function useCookFocus() {
  return useContext(CookFocusContext);
}
