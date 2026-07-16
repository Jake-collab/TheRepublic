/**
 * TalksCategoryContext — manages the user's Talks category preferences.
 *
 * Persists to AsyncStorage immediately on every change so preferences
 * survive restarts. Both TalksScreen (reader) and the manage-talks-categories
 * screen (writer) consume this context, so changes show instantly without
 * any navigation-focus tricks.
 *
 * Citizen Vote (id = -1) is always pinned first and is never stored here.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const HIDDEN_KEY = "republic_hidden_talk_cats";
const ORDER_KEY  = "republic_talk_cat_order";

interface TalksCategoryContextType {
  /** IDs of categories the user has toggled off. */
  hiddenCatIds: number[];
  /** Preferred display order (IDs). Empty = server default order. */
  catOrder: number[];
  /** Toggle a category on/off. */
  toggleCatVisibility: (id: number) => void;
  /**
   * Swap a category one slot in the given direction.
   * @param allIds Full list of available (non-CV) category IDs — used to
   *   initialise the order from the server order on first move.
   */
  moveCat: (id: number, direction: "up" | "down", allIds: number[]) => void;
}

const TalksCategoryContext = createContext<TalksCategoryContextType>({
  hiddenCatIds: [],
  catOrder: [],
  toggleCatVisibility: () => {},
  moveCat: () => {},
});

export function TalksCategoryProvider({ children }: { children: React.ReactNode }) {
  const [hiddenCatIds, setHiddenCatIds] = useState<number[]>([]);
  const [catOrder, setCatOrder]         = useState<number[]>([]);

  // Load persisted preferences on mount.
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HIDDEN_KEY),
      AsyncStorage.getItem(ORDER_KEY),
    ]).then(([hidden, order]) => {
      try { if (hidden) setHiddenCatIds(JSON.parse(hidden)); } catch {}
      try { if (order)  setCatOrder(JSON.parse(order));       } catch {}
    });
  }, []);

  const toggleCatVisibility = useCallback((id: number) => {
    setHiddenCatIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const moveCat = useCallback(
    (id: number, direction: "up" | "down", allIds: number[]) => {
      setCatOrder((prevOrder) => {
        // Seed from server order on first explicit move.
        const base =
          prevOrder.length > 0
            ? [
                ...prevOrder.filter((x) => allIds.includes(x)),
                ...allIds.filter((x) => !prevOrder.includes(x)),
              ]
            : [...allIds];

        const idx = base.indexOf(id);
        if (idx === -1) return prevOrder;
        const next = direction === "up" ? idx - 1 : idx + 1;
        if (next < 0 || next >= base.length) return prevOrder;

        const reordered = [...base];
        [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
        AsyncStorage.setItem(ORDER_KEY, JSON.stringify(reordered)).catch(() => {});
        return reordered;
      });
    },
    [],
  );

  return (
    <TalksCategoryContext.Provider
      value={{ hiddenCatIds, catOrder, toggleCatVisibility, moveCat }}
    >
      {children}
    </TalksCategoryContext.Provider>
  );
}

export function useTalksCategory(): TalksCategoryContextType {
  return useContext(TalksCategoryContext);
}
