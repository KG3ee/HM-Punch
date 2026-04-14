"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type VibeEvent =
  | { type: "mood:updated"; userId: string; mood: string | null }
  | { type: "reaction"; emoji: string; fromDisplayName: string }
  | { type: "bubble"; text: string };

interface VibesContextValue {
  latestEvent: VibeEvent | null;
  moodMap: Record<string, string | null>; // userId → current mood
}

const VibesContext = createContext<VibesContextValue>({
  latestEvent: null,
  moodMap: {},
});

export function VibesProvider({ children }: { children: ReactNode }) {
  const [latestEvent, setLatestEvent] = useState<VibeEvent | null>(null);
  const [moodMap, setMoodMap] = useState<Record<string, string | null>>({});

  // Seed moodMap with existing moods from active duty sessions
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    fetch(`${apiUrl}/vibes/moods`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string | null>) => {
        setMoodMap((prev) => ({ ...data, ...prev }));
      })
      .catch(() => {});
  }, []);

  // Live SSE stream for real-time updates
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const es = new EventSource(`${apiUrl}/vibes/stream`, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as VibeEvent;
        setLatestEvent(event);
        // Keep mood map up to date
        if (event.type === "mood:updated") {
          setMoodMap((prev) => ({ ...prev, [event.userId]: event.mood }));
        }
      } catch {
        // ignore malformed events
      }
    };

    return () => es.close();
  }, []);

  return (
    <VibesContext.Provider value={{ latestEvent, moodMap }}>
      {children}
    </VibesContext.Provider>
  );
}

export function useVibes() {
  return useContext(VibesContext);
}
