"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ActiveSessionMeta = {
  projectName?: string;
  intention?: string;
};

type ActiveSessionState = ActiveSessionMeta & {
  isRunning: boolean;
  elapsedMs: number; // ms
  startTimestamp: number | null; // epoch ms
};

type ActiveSessionContextValue = {
  state: ActiveSessionState;
  startSession: (meta: ActiveSessionMeta) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
};

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(
  null
);

export const ActiveSessionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, setState] = useState<ActiveSessionState>({
    isRunning: false,
    elapsedMs: 0,
    startTimestamp: null,
    projectName: undefined,
    intention: undefined,
  });

  // Tick every second while running
  useEffect(() => {
    if (!state.isRunning || state.startTimestamp == null) return;

    const id = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isRunning || prev.startTimestamp == null) return prev;
        const elapsed = Date.now() - prev.startTimestamp;
        return { ...prev, elapsedMs: elapsed };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [state.isRunning, state.startTimestamp]);

  const startSession: ActiveSessionContextValue["startSession"] = (meta) => {
    const now = Date.now();
    setState({
      isRunning: true,
      elapsedMs: 0,
      startTimestamp: now,
      projectName: meta.projectName,
      intention: meta.intention,
    });
  };

  const pauseSession = () => {
    setState((prev) => {
      if (!prev.isRunning || prev.startTimestamp == null) return prev;
      const elapsed = Date.now() - prev.startTimestamp;
      return {
        ...prev,
        isRunning: false,
        startTimestamp: null,
        elapsedMs: elapsed,
      };
    });
  };

  const resumeSession = () => {
    setState((prev) => {
      if (prev.isRunning || prev.elapsedMs <= 0) return prev;
      const now = Date.now();
      return {
        ...prev,
        isRunning: true,
        startTimestamp: now - prev.elapsedMs,
      };
    });
  };

  const resetSession = () => {
    setState({
      isRunning: false,
      elapsedMs: 0,
      startTimestamp: null,
      projectName: undefined,
      intention: undefined,
    });
  };

  return (
    <ActiveSessionContext.Provider
      value={{ state, startSession, pauseSession, resumeSession, resetSession }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
};

export const useActiveSession = () => {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) {
    throw new Error(
      "useActiveSession must be used within ActiveSessionProvider"
    );
  }
  return ctx;
};
