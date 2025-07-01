import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  category: 'navigation' | 'actions' | 'tools' | 'system';
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[];
  enabled: boolean;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  const shortcutsRef = useRef(config.shortcuts);

  useEffect(() => {
    shortcutsRef.current = config.shortcuts;
  }, [config.shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!config.enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const pressedKey = event.key.toLowerCase();
    const pressedShortcuts = shortcutsRef.current.filter(shortcut => {
      return (
        shortcut.key.toLowerCase() === pressedKey &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.metaKey === event.metaKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey
      );
    });

    if (pressedShortcuts.length > 0) {
      event.preventDefault();
      pressedShortcuts.forEach(shortcut => {
        try {
          shortcut.action();
        } catch (error) {
          console.error(`Error executing keyboard shortcut ${shortcut.key}:`, error);
        }
      });
    }
  }, [config.enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    registerShortcut: useCallback((shortcut: KeyboardShortcut) => {
      shortcutsRef.current = [...shortcutsRef.current, shortcut];
    }, []),
    unregisterShortcut: useCallback((key: string) => {
      shortcutsRef.current = shortcutsRef.current.filter(s => s.key !== key);
    }, []),
  };
}; 