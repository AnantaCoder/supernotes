import { useState, useCallback, useRef } from 'react';
import { deepClone } from '../utils/math.js';

export function useHistory(initialElements = []) {
  const [history, setHistory] = useState(() => {
    const base = initialElements ? deepClone(initialElements) : [];
    if (base.length > 0) {
      return { states: [[], base], currentIndex: 1 };
    }
    return { states: [[]], currentIndex: 0 };
  });

  const historyRef = useRef(history);
  historyRef.current = history;

  const initHistory = useCallback((elements = []) => {
    const base = elements ? deepClone(elements) : [];
    const newHist = base.length > 0 
      ? { states: [[], base], currentIndex: 1 }
      : { states: [[]], currentIndex: 0 };
    setHistory(newHist);
  }, []);

  const record = useCallback((elements) => {
    setHistory((prev) => {
      const currentSnapshot = deepClone(elements || []);
      const currentState = prev.states[prev.currentIndex];

      if (currentState && JSON.stringify(currentState) === JSON.stringify(currentSnapshot)) {
        return prev;
      }

      const nextStates = prev.states.slice(0, prev.currentIndex + 1);
      nextStates.push(currentSnapshot);

      if (nextStates.length > 50) {
        nextStates.shift();
      }

      return {
        states: nextStates,
        currentIndex: nextStates.length - 1
      };
    });
  }, []);

  const undo = useCallback((onRevert) => {
    let revertedElements = null;
    setHistory((prev) => {
      if (prev.currentIndex <= 0) return prev;
      const nextIndex = prev.currentIndex - 1;
      revertedElements = deepClone(prev.states[nextIndex]);
      return {
        ...prev,
        currentIndex: nextIndex
      };
    });
    if (revertedElements !== null && onRevert) {
      onRevert(revertedElements);
    }
  }, []);

  const redo = useCallback((onRevert) => {
    let revertedElements = null;
    setHistory((prev) => {
      if (prev.currentIndex >= prev.states.length - 1) return prev;
      const nextIndex = prev.currentIndex + 1;
      revertedElements = deepClone(prev.states[nextIndex]);
      return {
        ...prev,
        currentIndex: nextIndex
      };
    });
    if (revertedElements !== null && onRevert) {
      onRevert(revertedElements);
    }
  }, []);

  const canUndo = history.currentIndex > 0;
  const canRedo = history.currentIndex < history.states.length - 1;

  return {
    record,
    undo,
    redo,
    canUndo,
    canRedo,
    initHistory
  };
}

