import { createContext, useCallback, useContext, useMemo, useRef } from "react";

export type HomeTab = "shopping" | "recipes";

type HomeTabScrollContextValue = {
  registerHomeTabPane: (tab: HomeTab, element: HTMLElement | null) => void;
  registerMainScrollPane: (element: HTMLElement | null) => void;
  scrollToTop: (tab: HomeTab) => void;
};

const HomeTabScrollContext = createContext<HomeTabScrollContextValue | null>(null);

export function HomeTabScrollProvider({ children }: { children: React.ReactNode }) {
  const homeTabPanesRef = useRef<Record<HomeTab, HTMLElement | null>>({
    shopping: null,
    recipes: null,
  });
  const mainScrollPaneRef = useRef<HTMLElement | null>(null);

  const registerHomeTabPane = useCallback((tab: HomeTab, element: HTMLElement | null) => {
    homeTabPanesRef.current[tab] = element;
  }, []);

  const registerMainScrollPane = useCallback((element: HTMLElement | null) => {
    mainScrollPaneRef.current = element;
  }, []);

  const scrollToTop = useCallback((tab: HomeTab) => {
    const pane = homeTabPanesRef.current[tab] ?? mainScrollPaneRef.current;
    pane?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const value = useMemo(
    () => ({ registerHomeTabPane, registerMainScrollPane, scrollToTop }),
    [registerHomeTabPane, registerMainScrollPane, scrollToTop],
  );

  return <HomeTabScrollContext.Provider value={value}>{children}</HomeTabScrollContext.Provider>;
}

export function useHomeTabScroll() {
  return useContext(HomeTabScrollContext);
}

export function useHomeTabPaneRef(tab: HomeTab) {
  const context = useHomeTabScroll();

  return useCallback(
    (node: HTMLElement | null) => {
      context?.registerHomeTabPane(tab, node);
    },
    [context, tab],
  );
}

export function useMainScrollPaneRef() {
  const context = useHomeTabScroll();

  return useCallback(
    (node: HTMLElement | null) => {
      context?.registerMainScrollPane(node);
    },
    [context],
  );
}
