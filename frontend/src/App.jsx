import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Toolbar } from './components/Toolbar.jsx';
import { Canvas } from './components/Canvas.jsx';
import { StatusBar } from './components/StatusBar.jsx';
import { useFileManager } from './hooks/useFileManager.js';
import { useHistory } from './hooks/useHistory.js';
import { deepClone, generateId } from './utils/math.js';
import { measureText, getSelectionBounds, move } from './utils/elements.js';

export function App() {
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('supernotes_theme') === 'dark';
  });

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('supernotes_sidebar_collapsed') === 'true';
  });

  // Canvas Viewport State
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentTool, setCurrentTool] = useState('select');

  // Styling & Formatting State
  const [strokeColor, setStrokeColor] = useState(isDark ? '#f4f4f5' : '#1e1e1e');
  const [fillColor, setFillColor] = useState('#a5d8ff');
  const [noFill, setNoFill] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState("'Caveat', cursive");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const clipboardRef = useRef([]);
  const mousePosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  // History hook
  const { record, undo, redo, canUndo, canRedo, initHistory } = useHistory([]);

  // File Manager Hook
  const fileManager = useFileManager({
    onFileLoaded: (fileData) => {
      const els = fileData.elements || [];
      setElements(els);
      setScrollX(fileData.scrollX !== undefined ? fileData.scrollX : 0);
      setScrollY(fileData.scrollY !== undefined ? fileData.scrollY : 0);
      setZoom(fileData.zoom !== undefined ? fileData.zoom : 1);
      setSelectedIds(new Set());
      initHistory(els);
    }
  });

  // Apply dark mode class to body & update theme
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('supernotes_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      setStrokeColor(curr => {
        if (!prev && curr === '#1e1e1e') return '#f4f4f5';
        if (prev && curr === '#f4f4f5') return '#1e1e1e';
        return curr;
      });
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('supernotes_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  }, []);

  // Sync toolbar when selection changes
  useEffect(() => {
    const selected = elements.filter(el => selectedIds.has(el.id));
    if (selected.length === 0) return;

    const first = selected[0];
    if (first.strokeColor) setStrokeColor(first.strokeColor);
    if (first.strokeWidth) setStrokeWidth(first.strokeWidth);

    if (first.fillColor === 'transparent') {
      setNoFill(true);
    } else if (first.fillColor) {
      setNoFill(false);
      setFillColor(first.fillColor);
    }

    const textEl = selected.find(el => el.type === 'text');
    if (textEl) {
      if (textEl.fontSize) setFontSize(textEl.fontSize);
      if (textEl.fontFamily) setFontFamily(textEl.fontFamily);
      setIsBold(!!textEl.bold);
      setIsItalic(!!textEl.italic);
      setIsUnderline(!!textEl.underline);
    }
  }, [selectedIds, elements]);

  // Track mouse coordinates for pasting
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Autosave to SQLite whenever elements, scroll, or zoom change
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const scrollRef = useRef({ x: scrollX, y: scrollY });
  scrollRef.current = { x: scrollX, y: scrollY };

  const triggerAutoSave = useCallback(() => {
    if (!fileManager.currentFileId) return;
    fileManager.saveCurrent(fileManager.currentFileId, {
      name: fileManager.currentFile ? fileManager.currentFile.name : 'Untitled',
      elements: elementsRef.current,
      scrollX: scrollRef.current.x,
      scrollY: scrollRef.current.y,
      zoom: zoomRef.current
    });
  }, [fileManager]);

  const handleRecordHistory = useCallback((nextElements) => {
    record(nextElements);
    triggerAutoSave();
  }, [record, triggerAutoSave]);

  const handleElementsChange = useCallback((nextElements) => {
    setElements(nextElements);
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    undo((revertedElements) => {
      setElements(revertedElements);
      setSelectedIds(new Set());
      triggerAutoSave();
    });
  }, [undo, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    redo((revertedElements) => {
      setElements(revertedElements);
      setSelectedIds(new Set());
      triggerAutoSave();
    });
  }, [redo, triggerAutoSave]);

  // Property Change Handlers (applies immediately to selection if active)
  const handleChangeStrokeColor = (newColor) => {
    setStrokeColor(newColor);
    if (selectedIds.size > 0) {
      const updated = elements.map(el => selectedIds.has(el.id) ? { ...el, strokeColor: newColor } : el);
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleChangeFillColor = (newColor) => {
    setFillColor(newColor);
    setNoFill(false);
    if (selectedIds.size > 0) {
      const updated = elements.map(el => selectedIds.has(el.id) ? { ...el, fillColor: newColor } : el);
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleToggleNoFill = (checked) => {
    setNoFill(checked);
    if (selectedIds.size > 0) {
      const updated = elements.map(el => selectedIds.has(el.id) ? { ...el, fillColor: checked ? 'transparent' : fillColor } : el);
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleChangeStrokeWidth = (newWidth) => {
    setStrokeWidth(newWidth);
    if (selectedIds.size > 0) {
      const updated = elements.map(el => selectedIds.has(el.id) ? { ...el, strokeWidth: newWidth } : el);
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleChangeFontFamily = (newFamily) => {
    setFontFamily(newFamily);
    const selectedTexts = elements.filter(el => selectedIds.has(el.id) && el.type === 'text');
    if (selectedTexts.length > 0) {
      const updated = elements.map(el => {
        if (selectedIds.has(el.id) && el.type === 'text') {
          const clone = { ...el, fontFamily: newFamily };
          const tb = measureText(clone);
          clone.height = tb.height;
          return clone;
        }
        return el;
      });
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleChangeFontSize = (newSize) => {
    setFontSize(newSize);
    const selectedTexts = elements.filter(el => selectedIds.has(el.id) && el.type === 'text');
    if (selectedTexts.length > 0) {
      const updated = elements.map(el => {
        if (selectedIds.has(el.id) && el.type === 'text') {
          const clone = { ...el, fontSize: newSize };
          const tb = measureText(clone);
          clone.height = tb.height;
          return clone;
        }
        return el;
      });
      setElements(updated);
      handleRecordHistory(updated);
    }
  };

  const handleToggleFormatting = (prop) => {
    const selectedTexts = elements.filter(el => selectedIds.has(el.id) && el.type === 'text');

    if (selectedTexts.length > 0) {
      const newVal = !selectedTexts[0][prop];
      if (prop === 'bold') setIsBold(newVal);
      if (prop === 'italic') setIsItalic(newVal);
      if (prop === 'underline') setIsUnderline(newVal);

      const updated = elements.map(el => {
        if (selectedIds.has(el.id) && el.type === 'text') {
          const clone = { ...el, [prop]: newVal };
          const tb = measureText(clone);
          clone.height = tb.height;
          return clone;
        }
        return el;
      });
      setElements(updated);
      handleRecordHistory(updated);
    } else {
      if (prop === 'bold') setIsBold(prev => !prev);
      if (prop === 'italic') setIsItalic(prev => !prev);
      if (prop === 'underline') setIsUnderline(prev => !prev);
    }
  };

  // Delete selected elements
  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const nextElements = elements.filter(el => !selectedIds.has(el.id));
    setElements(nextElements);
    setSelectedIds(new Set());
    handleRecordHistory(nextElements);
  }, [selectedIds, elements, handleRecordHistory]);

  // Copy selected elements
  const copySelected = useCallback(() => {
    const selected = elements.filter(el => selectedIds.has(el.id));
    if (selected.length === 0) return;
    clipboardRef.current = deepClone(selected);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JSON.stringify(clipboardRef.current));
      }
    } catch (e) {}
  }, [elements, selectedIds]);

  // Paste clipboard elements
  const pasteClipboard = useCallback((customCanvasPt = null) => {
    const items = clipboardRef.current;
    if (!items || items.length === 0) return;

    const bounds = getSelectionBounds(items);
    let deltaX = 25;
    let deltaY = 25;

    if (customCanvasPt && bounds) {
      deltaX = customCanvasPt.x - bounds.x;
      deltaY = customCanvasPt.y - bounds.y;
    }

    const newIds = new Set();
    const cloned = items.map(item => {
      const clone = deepClone(item);
      clone.id = generateId();
      clone.seed = Math.floor(Math.random() * 2147483647);
      move(clone, deltaX, deltaY);
      newIds.add(clone.id);
      return clone;
    });

    const nextElements = [...elements, ...cloned];
    setElements(nextElements);
    setSelectedIds(newIds);
    handleRecordHistory(nextElements);
  }, [elements, handleRecordHistory]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        e.preventDefault();
        return;
      }

      // Undo Ctrl+Z
      if (isCmdOrCtrl && key === 'z' && !e.shiftKey) {
        handleUndo();
        e.preventDefault();
        return;
      }

      // Redo Ctrl+Shift+Z or Ctrl+Y
      if ((isCmdOrCtrl && key === 'z' && e.shiftKey) || (isCmdOrCtrl && key === 'y')) {
        handleRedo();
        e.preventDefault();
        return;
      }

      // Copy Ctrl+C
      if (isCmdOrCtrl && key === 'c') {
        copySelected();
        e.preventDefault();
        return;
      }

      // Paste Ctrl+V
      if (isCmdOrCtrl && key === 'v') {
        pasteClipboard();
        e.preventDefault();
        return;
      }

      // Select All Ctrl+A
      if (isCmdOrCtrl && key === 'a') {
        setSelectedIds(new Set(elements.map(el => el.id)));
        e.preventDefault();
        return;
      }

      // Toggle Sidebar Ctrl+\
      if (isCmdOrCtrl && e.key === '\\') {
        toggleSidebar();
        e.preventDefault();
        return;
      }

      // Bold Ctrl+B, Italic Ctrl+I, Underline Ctrl+U
      if (isCmdOrCtrl && key === 'b') {
        handleToggleFormatting('bold');
        e.preventDefault();
        return;
      }
      if (isCmdOrCtrl && key === 'i') {
        handleToggleFormatting('italic');
        e.preventDefault();
        return;
      }
      if (isCmdOrCtrl && key === 'u') {
        handleToggleFormatting('underline');
        e.preventDefault();
        return;
      }

      // Tool shortcuts (without Ctrl)
      if (!isCmdOrCtrl) {
        if (key === 'v' || key === '1') setCurrentTool('select');
        else if (key === 'r' || key === '2') setCurrentTool('rectangle');
        else if (key === 'u' || key === '9') setCurrentTool('roundRect');
        else if (key === 'o' || key === '3') setCurrentTool('ellipse');
        else if (key === 'd' || key === '4') setCurrentTool('diamond');
        else if (key === 'l' || key === '5') setCurrentTool('line');
        else if (key === 'a' || key === '6') setCurrentTool('arrow');
        else if (key === 'p' || key === '7') setCurrentTool('freehand');
        else if (key === 't' || key === '8') setCurrentTool('text');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, deleteSelected, handleUndo, handleRedo, copySelected, pasteClipboard, toggleSidebar, handleToggleFormatting]);

  return (
    <div id="app">
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        dbStatus={fileManager.dbStatus}
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onExport={() => fileManager.exportCurrentFile({ elements, scrollX, scrollY, zoom })}
        onImport={(file) => fileManager.importFile(file)}
      />

      <div id="main">
        <Sidebar
          files={fileManager.files}
          currentFileId={fileManager.currentFileId}
          trashFiles={fileManager.trashFiles}
          collapsed={sidebarCollapsed}
          onCollapse={toggleSidebar}
          onSelectFile={fileManager.switchFile}
          onCreateFile={fileManager.createFile}
          onRenameFile={fileManager.renameFile}
          onMoveToTrash={fileManager.moveToTrash}
          onRestoreFromTrash={fileManager.restoreFromTrash}
          onPermanentDelete={fileManager.permanentDelete}
          onEmptyTrash={fileManager.emptyTrash}
        />

        <div id="workspace">
          <Toolbar
            currentTool={currentTool}
            onSetTool={setCurrentTool}
            strokeColor={strokeColor}
            onChangeStrokeColor={handleChangeStrokeColor}
            fillColor={fillColor}
            onChangeFillColor={handleChangeFillColor}
            noFill={noFill}
            onToggleNoFill={handleToggleNoFill}
            strokeWidth={strokeWidth}
            onChangeStrokeWidth={handleChangeStrokeWidth}
            fontFamily={fontFamily}
            onChangeFontFamily={handleChangeFontFamily}
            fontSize={fontSize}
            onChangeFontSize={handleChangeFontSize}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            onToggleFormatting={handleToggleFormatting}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <Canvas
            elements={elements}
            onChangeElements={handleElementsChange}
            selectedIds={selectedIds}
            onSelectIds={setSelectedIds}
            currentTool={currentTool}
            onSetTool={setCurrentTool}
            strokeColor={strokeColor}
            fillColor={fillColor}
            noFill={noFill}
            strokeWidth={strokeWidth}
            fontSize={fontSize}
            fontFamily={fontFamily}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            zoom={zoom}
            onZoomChange={setZoom}
            scrollX={scrollX}
            scrollY={scrollY}
            onScrollChange={(x, y) => { setScrollX(x); setScrollY(y); }}
            isDark={isDark}
            onRecordHistory={handleRecordHistory}
          />
        </div>
      </div>

      <StatusBar
        tool={currentTool}
        zoom={zoom}
        elementCount={elements.length}
        dbStatus={fileManager.dbStatus}
      />
    </div>
  );
}

