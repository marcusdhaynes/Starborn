import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './language';
import { 
  Database, Plus, Trash2, ArrowUpDown, ChevronRight, 
  Sparkles, Save, RotateCcw, HelpCircle, GripVertical, GripHorizontal,
  Maximize2, Minimize2, Grid, FileSpreadsheet, Download, Eraser, Search, Copy, Clipboard
} from 'lucide-react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { safeStorage } from '../storage';

// Define structure for custom tables
export interface ColumnDef {
  id: string;
  name: string;
}

export interface RowDef {
  id: string;
  [key: string]: string; // Column values
}

export interface TableState {
  columns: ColumnDef[];
  rows: RowDef[];
}

interface BackendSettingsProps {
  playTick: (freq?: number, duration?: number, type?: 'sine' | 'square' | 'triangle' | 'sawtooth') => void;
  onDraftChange: (hasChanges: boolean, saveFn: () => Promise<void>) => void;
}

// ----------------------------------------------------
// DEFAULT STATIC TEMPLATE TABLES (Aesthetic baselines)
// ----------------------------------------------------
const DEFAULT_TABLES: Record<string, TableState> = {
  Compendium: {
    columns: [
      { id: 'ID', name: 'ID' },
      { id: 'Name', name: 'Name' },
      { id: 'Category', name: 'Category' },
      { id: 'Description', name: 'Description' },
      { id: 'Source', name: 'Source' }
    ],
    rows: [
      { id: 'r1', ID: 'C1', Name: 'Aelfborn', Category: 'Race', Description: 'Low physical fortitude; blessed by starlight.', Source: 'Core Book' },
      { id: 'r2', ID: 'C2', Name: 'Starfire Bolt', Category: 'Evocation', Description: 'Launches a precise beam of starlight damage.', Source: 'Astral Spells' }
    ]
  },
  Weapons: {
    columns: [
      { id: 'ID', name: 'ID' },
      { id: 'Name', name: 'Name' },
      { id: 'Damage', name: 'Damage' },
      { id: 'Weight', name: 'Weight' },
      { id: 'Properties', name: 'Properties' }
    ],
    rows: [
      { id: 'r1', ID: 'W1', Name: 'Glass Foil', Damage: '1d6 Piercing', Weight: '2 lbs', Properties: 'Finesse, Fragile' },
      { id: 'r2', ID: 'W2', Name: 'Star Broadsword', Damage: '2d6 Radiant', Weight: '8 lbs', Properties: 'Two-Handed, Heavy' }
    ]
  },
  Inventory: {
    columns: [
      { id: 'Name', name: 'Name' },
      { id: 'Quantity', name: 'Quantity' },
      { id: 'Value', name: 'Value' },
      { id: 'Weight', name: 'Weight' },
      { id: 'Notes', name: 'Notes' }
    ],
    rows: [
      { id: 'r1', Name: 'Elixir of Life', Quantity: '3', Value: '150 gp', Weight: '1 lb', Notes: 'Restores 25 HP upon drink' },
      { id: 'r2', Name: 'Runic Compass', Quantity: '1', Value: '45 gp', Weight: '0.5 lb', Notes: 'Glows near starlight portals' }
    ]
  },
  Magic: {
    columns: [
      { id: 'Name', name: 'Spell Name' },
      { id: 'Level', name: 'Level' },
      { id: 'School', name: 'School' },
      { id: 'CastTime', name: 'Cast Time' },
      { id: 'Effect', name: 'Effect Summary' }
    ],
    rows: [
      { id: 'r1', Name: 'Arcane Step', Level: '2', School: 'Conjuration', CastTime: '1 Bonus Msg', Effect: 'Teleport 30ft into starlight spaces.' },
      { id: 'r2', Name: 'Astral Shield', Level: '1', School: 'Abjuration', CastTime: '1 Reaction', Effect: '+5 AC defense buff to caster.' }
    ]
  },
  Journal: {
    columns: [
      { id: 'ID', name: 'ID' },
      { id: 'Date', name: 'Date/Epoch' },
      { id: 'Title', name: 'Entry Title' },
      { id: 'Summary', name: 'Summary Details' },
      { id: 'QuestState', name: 'Quest State' }
    ],
    rows: [
      { id: 'r1', ID: 'J1', Date: 'Era 490.4', Title: 'Starlight Circle', Summary: 'Located obsidian stones in Northern Reach.', QuestState: 'Active' }
    ]
  }
};

type BackendTab = 'Compendium' | 'Weapons' | 'Inventory' | 'Magic' | 'Journal';

const measureTextWidth = (text: string, font: string): number => {
  if (typeof document === 'undefined') return 60;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = font;
      return context.measureText(text).width;
    }
  } catch (e) {
    // fallback
  }
  return text.length * 5.2;
};

const tableToTsv = (table: TableState): string => {
  if (!table) return '';
  const headers = table.columns.map(c => c.name).join('\t');
  const rows = table.rows.map(row => 
    table.columns.map(col => row[col.id] || '').join('\t')
  ).join('\n');
  return `${headers}\n${rows}`;
};

const tsvToTable = (text: string, currentTable: TableState): TableState => {
  const lines = text.split('\n');
  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    return { columns: currentTable.columns, rows: [] };
  }
  
  // First line is headers
  const headerLine = lines[0];
  const headerCols = headerLine.split('\t').map(h => h.trim());
  
  // Map columns based on headers, matching current columns or creating new ones
  const newColumns: ColumnDef[] = headerCols.map((colName, cIdx) => {
    const existing = currentTable.columns[cIdx];
    if (existing && existing.name.toLowerCase() === colName.toLowerCase()) {
      return { id: existing.id, name: colName };
    }
    const foundByName = currentTable.columns.find(c => c.name.toLowerCase() === colName.toLowerCase());
    if (foundByName) {
      return { id: foundByName.id, name: colName };
    }
    // Generate new ID
    const safeId = colName.trim().replace(/[^a-zA-Z0-9]/g, '_') || `col_${cIdx}`;
    return { id: safeId, name: colName };
  });

  const newRows: RowDef[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' && i === lines.length - 1) continue;
    
    const cells = line.split('\t');
    const rowId = currentTable.rows[i - 1]?.id || `row_${Date.now()}_${i}`;
    const row: RowDef = { id: rowId };
    
    newColumns.forEach((col, cIdx) => {
      row[col.id] = cells[cIdx] !== undefined ? cells[cIdx] : '';
    });
    newRows.push(row);
  }
  
  return { columns: newColumns, rows: newRows };
};

export default function BackendSettings({ playTick, onDraftChange }: BackendSettingsProps) {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<BackendTab>('Compendium');
  
  // Real active working tables (all tabs compiled)
  const [tables, setTables] = useState<Record<string, TableState>>(() => {
    // Attempt local retrieval first
    const local = safeStorage.getItem('vtt_draft_rpg_tables');
    return local ? JSON.parse(local) : JSON.parse(JSON.stringify(DEFAULT_TABLES));
  });

  // Reference tables before modification to check for changes
  const [savedTables, setSavedTables] = useState<Record<string, TableState>>(() => {
    return JSON.parse(JSON.stringify(DEFAULT_TABLES));
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // Drag indicators
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  // Column Resizing State & Handler
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  // ----------------------------------------------------
  // EXCEL / SPREADSHEET PRO EXTENSIONS (Instant Excel Mode)
  // ----------------------------------------------------
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ rIdx: number, colId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rIdx: number, colId: string } | null>(null);
  const [copiedCellData, setCopiedCellData] = useState<string | null>(null);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [showFindReplace, setShowFindReplace] = useState<boolean>(false);
  const [formulaValue, setFormulaValue] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [localTsv, setLocalTsv] = useState<string>('');
  const lastSyncedTabRef = useRef<BackendTab>(activeTab);

  useEffect(() => {
    const currentTsv = tableToTsv(tables[activeTab]);
    const tabChanged = lastSyncedTabRef.current !== activeTab;
    if (tabChanged || document.activeElement?.id !== 'vtt-tsv-editor-textarea') {
      setLocalTsv(currentTsv);
      lastSyncedTabRef.current = activeTab;
    }
  }, [tables, activeTab]);

  const handleTsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalTsv(val);
    const parsed = tsvToTable(val, tables[activeTab]);
    
    // Update state silently without click Sound for seamless typing
    const updated = { ...tables, [activeTab]: parsed };
    setTables(updated);
    safeStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(updated));
  };

  const currentTable = tables[activeTab];

  // Live Formula Evaluator Functions
  const evaluateFormula = (val: string, rows: RowDef[], columns: ColumnDef[]): string => {
    if (!val || typeof val !== 'string' || !val.startsWith('=')) return val;
    try {
      const rawExpression = val.substring(1).trim();
      const upperExpr = rawExpression.toUpperCase();
      
      const getCellVal = (colLetter: string, rowNumStr: string): number => {
        const colIdx = colLetter.charCodeAt(0) - 65; // A -> 0
        const rowIdx = parseInt(rowNumStr, 10) - 1; // 1 -> 0
        if (colIdx >= 0 && colIdx < columns.length && rowIdx >= 0 && rowIdx < rows.length) {
          const colId = columns[colIdx].id;
          const cellText = rows[rowIdx][colId] || '';
          if (cellText.startsWith('=')) {
            return parseFloat(evaluateFormula(cellText, rows, columns)) || 0;
          }
          return parseFloat(cellText) || 0;
        }
        return 0;
      };

      // Support basic range operators over SUM, AVG, MIN, MAX
      const sumRegex = /SUM\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/i;
      const avgRegex = /AVG\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/i;
      const minRegex = /MIN\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/i;
      const maxRegex = /MAX\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/i;

      if (sumRegex.test(upperExpr)) {
        const match = upperExpr.match(sumRegex);
        if (match) {
          const [, start, end] = match;
          const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
          const startRow = start.match(/[0-9]+/)?.[0] || '1';
          const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
          const endRow = end.match(/[0-9]+/)?.[0] || '1';
          
          let sum = 0;
          const cStart = startCol.charCodeAt(0);
          const cEnd = endCol.charCodeAt(0);
          const rStart = parseInt(startRow, 10);
          const rEnd = parseInt(endRow, 10);
          
          for (let c = Math.min(cStart, cEnd); c <= Math.max(cStart, cEnd); c++) {
            for (let r = Math.min(rStart, rEnd); r <= Math.max(rStart, rEnd); r++) {
              sum += getCellVal(String.fromCharCode(c), String(r));
            }
          }
          return String(sum);
        }
      }
      
      if (avgRegex.test(upperExpr)) {
        const match = upperExpr.match(avgRegex);
        if (match) {
          const [, start, end] = match;
          const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
          const startRow = start.match(/[0-9]+/)?.[0] || '1';
          const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
          const endRow = end.match(/[0-9]+/)?.[0] || '1';
          
          let sum = 0;
          let count = 0;
          const cStart = startCol.charCodeAt(0);
          const cEnd = endCol.charCodeAt(0);
          const rStart = parseInt(startRow, 10);
          const rEnd = parseInt(endRow, 10);
          
          for (let c = Math.min(cStart, cEnd); c <= Math.max(cStart, cEnd); c++) {
            for (let r = Math.min(rStart, rEnd); r <= Math.max(rStart, rEnd); r++) {
              sum += getCellVal(String.fromCharCode(c), String(r));
              count++;
            }
          }
          return String(count > 0 ? (sum / count).toFixed(2).replace(/\.00$/, '') : 0);
        }
      }

      if (minRegex.test(upperExpr)) {
        const match = upperExpr.match(minRegex);
        if (match) {
          const [, start, end] = match;
          const cStart = (start.match(/[A-Z]+/)?.[0] || 'A').charCodeAt(0);
          const rStart = parseInt(start.match(/[0-9]+/)?.[0] || '1', 10);
          const cEnd = (end.match(/[A-Z]+/)?.[0] || 'A').charCodeAt(0);
          const rEnd = parseInt(end.match(/[0-9]+/)?.[0] || '1', 10);
          
          let min = Infinity;
          for (let c = Math.min(cStart, cEnd); c <= Math.max(cStart, cEnd); c++) {
            for (let r = Math.min(rStart, rEnd); r <= Math.max(rStart, rEnd); r++) {
              const v = getCellVal(String.fromCharCode(c), String(r));
              if (v < min) min = v;
            }
          }
          return String(min === Infinity ? 0 : min);
        }
      }

      if (maxRegex.test(upperExpr)) {
        const match = upperExpr.match(maxRegex);
        if (match) {
          const [, start, end] = match;
          const cStart = (start.match(/[A-Z]+/)?.[0] || 'A').charCodeAt(0);
          const rStart = parseInt(start.match(/[0-9]+/)?.[0] || '1', 10);
          const cEnd = (end.match(/[A-Z]+/)?.[0] || 'A').charCodeAt(0);
          const rEnd = parseInt(end.match(/[0-9]+/)?.[0] || '1', 10);
          
          let max = -Infinity;
          for (let c = Math.min(cStart, cEnd); c <= Math.max(cStart, cEnd); c++) {
            for (let r = Math.min(rStart, rEnd); r <= Math.max(rStart, rEnd); r++) {
              const v = getCellVal(String.fromCharCode(c), String(r));
              if (v > max) max = v;
            }
          }
          return String(max === -Infinity ? 0 : max);
        }
      }

      // Basic math evaluated cell by cell
      let evalStr = rawExpression;
      const cellRefRegex = /([A-Z]+)([0-9]+)/g;
      evalStr = evalStr.replace(cellRefRegex, (match, colLetter, rowNumStr) => {
        return String(getCellVal(colLetter, rowNumStr));
      });

      if (/^[0-9+\-*/().\s]+$/.test(evalStr)) {
        const result = new Function(`return (${evalStr})`)();
        return String(typeof result === 'number' && !isNaN(result) ? result : evalStr);
      }
      return evalStr;
    } catch (e) {
      return "#VALERR";
    }
  };

  // Sync selected cell's raw formula representation to formula bar
  useEffect(() => {
    if (selectedCell) {
      const cellText = currentTable.rows[selectedCell.rIdx]?.[selectedCell.colId] || '';
      setFormulaValue(cellText);
    } else {
      setFormulaValue('');
    }
  }, [selectedCell, currentTable.rows]);

  const handleFormulaValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCell) return;
    const newVal = e.target.value;
    setFormulaValue(newVal);
    handleCellEdit(currentTable.rows[selectedCell.rIdx].id, selectedCell.colId, newVal);
  };

  // Actions
  const handleSortColumn = (colId: string) => {
    const nextDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(nextDirection);
    
    const sortedRows = [...currentTable.rows].sort((a, b) => {
      const valA = a[colId] || '';
      const valB = b[colId] || '';
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return nextDirection === 'asc' ? numA - numB : numB - numA;
      }
      return nextDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    updateTableState(activeTab, { columns: currentTable.columns, rows: sortedRows });
    playTick(550, 0.08, 'sine');
  };

  const handleExportCSV = () => {
    const csvContent = [
      currentTable.columns.map(c => c.name).join(','),
      ...currentTable.rows.map(row => 
        currentTable.columns.map(col => {
          const rawVal = row[col.id] || '';
          const escaped = rawVal.replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rpg_sheet_${activeTab.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playTick(880, 0.1, 'sine');
  };

  const handleFillSeries = () => {
    if (!selectedCell) return;
    const colId = selectedCell.colId;
    const startIdx = selectedCell.rIdx;
    const initialValText = currentTable.rows[startIdx][colId] || '';
    const initialVal = parseInt(initialValText, 10) || 1;
    
    const newRows = currentTable.rows.map((row, idx) => {
      if (idx < startIdx) return row;
      return {
        ...row,
        [colId]: String(initialVal + (idx - startIdx))
      };
    });
    
    updateTableState(activeTab, { columns: currentTable.columns, rows: newRows });
    playTick(600, 0.1, 'triangle');
  };

  const handleFindReplace = (all: boolean) => {
    if (!findText) return;
    let replacedCount = 0;
    const newRows = currentTable.rows.map(row => {
      const copy = { ...row };
      currentTable.columns.forEach(col => {
        const val = copy[col.id] || '';
        if (val.includes(findText)) {
          if (all) {
            copy[col.id] = val.replaceAll(findText, replaceText);
            replacedCount++;
          } else if (replacedCount === 0) {
            copy[col.id] = val.replace(findText, replaceText);
            replacedCount++;
          }
        }
      });
      return copy;
    });
    
    if (replacedCount > 0) {
      updateTableState(activeTab, { columns: currentTable.columns, rows: newRows });
      playTick(750, 0.12, 'sine');
      alert(`Replaced ${replacedCount} occurrence(s) matching "${findText}".`);
    } else {
      alert(`No occurrences of "${findText}" were found.`);
    }
  };

  const handleAutoFitColumnsAll = () => {
    const newWidths = { ...colWidths };
    currentTable.columns.forEach(col => {
      let maxWidth = 40;
      const headerFont = "700 8.5px serif";
      const needsDeleteBtn = col.id !== 'id' && col.id !== 'ID' && col.id !== 'Name';
      const headerExtra = needsDeleteBtn ? 26 : 16;
      const headerWidth = measureTextWidth(col.name.toUpperCase(), headerFont) + headerExtra;
      if (headerWidth > maxWidth) maxWidth = headerWidth;

      const cellFont = "400 8.5px JetBrains Mono, SFMono-Regular, monospace";
      currentTable.rows.forEach(row => {
        const cellVal = String(row[col.id] || '');
        const cellWidth = measureTextWidth(cellVal, cellFont) + 14;
        if (cellWidth > maxWidth) maxWidth = cellWidth;
      });

      newWidths[col.id] = Math.min(300, Math.max(55, Math.ceil(maxWidth)));
    });
    setColWidths(newWidths);
    playTick(700, 0.15, 'sine');
  };

  const handleClearTable = () => {
    if (!confirm("Are you sure you want to clear all rows in the active list? This keeps headers intact.")) return;
    const clearedRows = currentTable.rows.map(row => {
      const item = { id: row.id };
      currentTable.columns.forEach(c => {
        item[c.id] = "";
      });
      return item;
    });
    updateTableState(activeTab, { columns: currentTable.columns, rows: clearedRows });
    playTick(200, 0.25, 'sawtooth');
  };

  const handleExcelArrowKeysAndHotkeys = (e: KeyboardEvent) => {
    if (!isExpanded || editingCell) return;
    const rCount = currentTable.rows.length;
    const cCount = currentTable.columns.length;
    
    if (showFindReplace) {
      if (document.activeElement?.tagName === 'INPUT') {
        // Let user type into Find & Replace standard inputs
        return;
      }
    }

    if (!selectedCell) return;
    const cIdx = currentTable.columns.findIndex(c => c.id === selectedCell.colId);
    
    let nextR = selectedCell.rIdx;
    let nextCIdx = cIdx;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nextR = Math.max(0, nextR - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextR = Math.min(rCount - 1, nextR + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextCIdx = Math.max(0, nextCIdx - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextCIdx = Math.min(cCount - 1, nextCIdx + 1);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          nextCIdx = cIdx - 1;
          if (nextCIdx < 0) {
            nextCIdx = cCount - 1;
            nextR = Math.max(0, nextR - 1);
          }
        } else {
          nextCIdx = cIdx + 1;
          if (nextCIdx >= cCount) {
            nextCIdx = 0;
            nextR = Math.min(rCount - 1, nextR + 1);
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        setEditingCell(selectedCell);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        handleCellEdit(currentTable.rows[selectedCell.rIdx].id, selectedCell.colId, '');
        return;
      case 'c':
      case 'C':
        if (e.ctrlKey || e.metaKey) {
          const text = currentTable.rows[selectedCell.rIdx]?.[selectedCell.colId] || '';
          setCopiedCellData(text);
          playTick(720, 0.05, 'sine');
        }
        break;
      case 'v':
      case 'V':
        if (e.ctrlKey || e.metaKey) {
          if (copiedCellData !== null) {
            handleCellEdit(currentTable.rows[selectedCell.rIdx].id, selectedCell.colId, copiedCellData);
            playTick(800, 0.07, 'sine');
          }
        }
        break;
      default:
        // Direct type fallback
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleCellEdit(currentTable.rows[selectedCell.rIdx].id, selectedCell.colId, e.key);
          setEditingCell(selectedCell);
        }
        return;
    }

    if (nextR !== selectedCell.rIdx || nextCIdx !== cIdx) {
      setSelectedCell({ rIdx: nextR, colId: currentTable.columns[nextCIdx].id });
      playTick(500, 0.02, 'sine');
    }
  };

  useEffect(() => {
    if (!isExpanded) return;
    window.addEventListener('keydown', handleExcelArrowKeysAndHotkeys);
    return () => {
      window.removeEventListener('keydown', handleExcelArrowKeysAndHotkeys);
    };
  }, [isExpanded, selectedCell, editingCell, currentTable, copiedCellData, showFindReplace]);

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const thElement = (e.target as HTMLElement).closest('th');
    const startWidth = thElement ? thElement.getBoundingClientRect().width : 85;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const difference = currentX - startX;
      setColWidths(prev => ({
        ...prev,
        [colId]: Math.max(40, startWidth + difference)
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeDoubleClick = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const col = currentTable.columns.find(c => c.id === colId);
    if (!col) return;

    let maxWidth = 40;

    // 1. Measure header text (with uppercase name)
    const headerFont = "700 8.5px serif";
    const needsDeleteBtn = col.id !== 'id' && col.id !== 'ID' && col.id !== 'Name';
    const headerExtra = needsDeleteBtn ? 26 : 16;
    const headerWidth = measureTextWidth(col.name.toUpperCase(), headerFont) + headerExtra;
    if (headerWidth > maxWidth) maxWidth = headerWidth;

    // 2. Measure all rows in this column
    const cellFont = "400 8.5px JetBrains Mono, SFMono-Regular, monospace";
    currentTable.rows.forEach(row => {
      const cellVal = String(row[colId] || '');
      const cellWidth = measureTextWidth(cellVal, cellFont) + 14;
      if (cellWidth > maxWidth) {
        maxWidth = cellWidth;
      }
    });

    const finalWidth = Math.min(300, Math.max(45, Math.ceil(maxWidth)));

    setColWidths(prev => ({
      ...prev,
      [colId]: finalWidth
    }));
    playTick(600, 0.05, 'sine');
  };

  const [activeCharId, setActiveCharId] = useState(() => {
    return safeStorage.getItem('setting_active_character_id') || 'default';
  });

  const loadTablesForCharacter = async (user: User, charId: string) => {
    setIsLoading(true);
    const fetchedTables: Record<string, TableState> = {};
    let loadedAll = true;

    for (const tabName of Object.keys(DEFAULT_TABLES)) {
      try {
        const docRef = doc(db, 'users', user.uid, 'tables', `${charId}_${tabName}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          fetchedTables[tabName] = {
            columns: data.columns as ColumnDef[],
            rows: data.rows as RowDef[]
          };
        } else {
          fetchedTables[tabName] = JSON.parse(JSON.stringify(DEFAULT_TABLES[tabName]));
        }
      } catch (err) {
        console.error(`Failed to fetch tab ${tabName} from Firestore`, err);
        loadedAll = false;
      }
    }

    if (loadedAll && Object.keys(fetchedTables).length > 0) {
      setTables(fetchedTables);
      setSavedTables(JSON.parse(JSON.stringify(fetchedTables)));
      safeStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(fetchedTables));
    }
    setIsLoading(false);
  };

  // 1. Auth Listener Setup
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const currentId = safeStorage.getItem('setting_active_character_id') || 'default';
        setActiveCharId(currentId);
        await loadTablesForCharacter(user, currentId);
      } else {
        // Fall back to safeStorage draft or static default
        const local = safeStorage.getItem('vtt_draft_rpg_tables');
        if (local) {
          const parsed = JSON.parse(local);
          setTables(parsed);
          setSavedTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
        } else {
          setTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
          setSavedTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
        }
      }
    });

    return () => unsub();
  }, []);

  // Listen to Character selection switches
  useEffect(() => {
    const handleCharChange = () => {
      const nextCharId = safeStorage.getItem('setting_active_character_id') || 'default';
      if (nextCharId !== activeCharId) {
        setActiveCharId(nextCharId);
        if (currentUser) {
          loadTablesForCharacter(currentUser, nextCharId);
        } else {
          // If guest, just reload from safeStorage namespaced values
          const local = safeStorage.getItem('vtt_draft_rpg_tables');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              setTables(parsed);
              setSavedTables(parsed);
            } catch (e) {
              console.error("Failed to parse tables on character switch:", e);
            }
          } else {
            setTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
            setSavedTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
          }
        }
      }
    };

    window.addEventListener('tabletop-state-update', handleCharChange);
    window.addEventListener('storage', handleCharChange);
    return () => {
      window.removeEventListener('tabletop-state-update', handleCharChange);
      window.removeEventListener('storage', handleCharChange);
    };
  }, [activeCharId, currentUser]);

  // Check for unsaved differences
  useEffect(() => {
    const isModified = JSON.stringify(tables) !== JSON.stringify(savedTables);
    onDraftChange(isModified, handleSaveToStorageAndCloud);
  }, [tables, savedTables]);

  const updateTableState = (tab: BackendTab, newState: TableState) => {
    const updated = { ...tables, [tab]: newState };
    setTables(updated);
    safeStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(updated));
    playTick(420, 0.04, 'sine');
  };

  // ----------------------------------------------------
  // GRID COLUMN & ROW MANIPULATIONS (Add / Remove)
  // ----------------------------------------------------
  const handleAddColumn = () => {
    const currentTable = tables[activeTab];
    const newColNumber = currentTable.columns.length + 1;
    const colName = `Col ${newColNumber}`;

    // Unique ID
    const newId = `col_${Date.now()}`;
    const newColumns = [...currentTable.columns, { id: newId, name: colName }];
    
    // Update rows - assign empty values for new column
    const newRows = currentTable.rows.map(row => ({
      ...row,
      [newId]: ""
    }));

    updateTableState(activeTab, { columns: newColumns, rows: newRows });
    playTick(580, 0.08, 'triangle');
  };

  const handleRemoveColumn = (colId: string, colName: string) => {
    if (colId === 'id' || colId === 'ID' || colId === 'Name') {
      alert(`The indexing column "${colName}" is locked and cannot be removed.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete the column "${colName}" and all associated data inside it?`)) {
      return;
    }

    const currentTable = tables[activeTab];
    const newColumns = currentTable.columns.filter(col => col.id !== colId);
    
    // Clean column from row fields
    const newRows = currentTable.rows.map(row => {
      const copy = { ...row };
      delete copy[colId];
      return copy;
    });

    updateTableState(activeTab, { columns: newColumns, rows: newRows });
    playTick(300, 0.1, 'sawtooth');
  };

  const handleAddRow = () => {
    const currentTable = tables[activeTab];
    const newRowId = `row_${Date.now()}`;
    
    // Initialize empty values for all defined columns
    const emptyRow: RowDef = { id: newRowId };
    currentTable.columns.forEach(col => {
      emptyRow[col.id] = "";
    });

    const newRows = [...currentTable.rows, emptyRow];
    updateTableState(activeTab, { columns: currentTable.columns, rows: newRows });
    playTick(650, 0.08, 'triangle');
  };

  const handleRemoveRow = (rowId: string, rowIndex: number) => {
    const currentTable = tables[activeTab];
    if (currentTable.rows.length <= 1) {
      alert("A table must contain at least one single row of data.");
      return;
    }

    const newRows = currentTable.rows.filter(row => row.id !== rowId);
    updateTableState(activeTab, { columns: currentTable.columns, rows: newRows });
    playTick(280, 0.12, 'sawtooth');
  };

  const handleCellEdit = (rowId: string, colId: string, value: string) => {
    const currentTable = tables[activeTab];
    const newRows = currentTable.rows.map(row => {
      if (row.id === rowId) {
        return { ...row, [colId]: value };
      }
      return row;
    });

    // Update state silently without click Sound for seamless typings
    const updated = { ...tables, [activeTab]: { ...currentTable, rows: newRows } };
    setTables(updated);
    localStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(updated));
  };

  const handleHeaderEdit = (colId: string, value: string) => {
    if (!value || value.trim() === "") return;
    const currentTable = tables[activeTab];
    const newColumns = currentTable.columns.map(col => {
      if (col.id === colId) {
        return { ...col, name: value };
      }
      return col;
    });

    const updated = { ...tables, [activeTab]: { ...currentTable, columns: newColumns } };
    setTables(updated);
    localStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(updated));
  };

  // ----------------------------------------------------
  // HTML5 NATIVE DRAG-AND-DROP REORDERINGS
  // ----------------------------------------------------
  
  // DRAG COLUMNS
  const handleColDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Clear thumbnail ghost to enable custom row animations
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    e.dataTransfer.setDragImage(canvas, 0, 0);
  };

  const handleColDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === index) return;

    const currentTable = tables[activeTab];
    const cols = [...currentTable.columns];
    
    // Swap columns
    const item = cols[draggedColIndex];
    cols.splice(draggedColIndex, 1);
    cols.splice(index, 0, item);

    setDraggedColIndex(index);
    updateTableState(activeTab, { columns: cols, rows: currentTable.rows });
  };

  const handleColDragEnd = () => {
    setDraggedColIndex(null);
    playTick(600, 0.05, 'sine');
  };

  // DRAG ROWS
  const handleRowDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    e.dataTransfer.setDragImage(canvas, 0, 0);
  };

  const handleRowDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === index) return;

    const currentTable = tables[activeTab];
    const rows = [...currentTable.rows];

    // Swap rows
    const item = rows[draggedRowIndex];
    rows.splice(draggedRowIndex, 1);
    rows.splice(index, 0, item);

    setDraggedRowIndex(index);
    updateTableState(activeTab, { columns: currentTable.columns, rows });
  };

  const handleRowDragEnd = () => {
    setDraggedRowIndex(null);
    playTick(600, 0.05, 'sine');
  };

  // ----------------------------------------------------
  // DISPATCH CORE SAVING ACTIONS & FIREBASE PIPING
  // ----------------------------------------------------
  const handleSaveToStorageAndCloud = async () => {
    setIsLoading(true);
    setSyncStatus('idle');
    playTick(450, 0.15, 'triangle');

    // Save locally
    safeStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(tables));

    if (currentUser) {
      try {
        const rawCharId = safeStorage.getItem('setting_active_character_id') || 'default';
        const charId = rawCharId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'default';
        // Save each active altered subtable doc into user subcollections
        for (const tabName of Object.keys(DEFAULT_TABLES)) {
          const rawTableData = tables[tabName] || DEFAULT_TABLES[tabName];
          const cols = Array.isArray(rawTableData?.columns) ? rawTableData.columns : (DEFAULT_TABLES[tabName]?.columns || []);
          const rws = Array.isArray(rawTableData?.rows) ? rawTableData.rows : (DEFAULT_TABLES[tabName]?.rows || []);
          const payload = {
            userId: currentUser.uid,
            tabName: String(tabName).slice(0, 64),
            columns: cols,
            rows: rws,
            updatedAt: new Date().toISOString() // Server side placeholder is parsed, but we also save native standard format
          };

          const path = `users/${currentUser.uid}/tables/${charId}_${tabName}`;
          try {
            // Write standard doc payload in users metadata fields
            const docRef = doc(db, 'users', currentUser.uid, 'tables', `${charId}_${tabName}`);
            await setDoc(docRef, payload);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, path);
          }
        }

        // Write each individual row from Weapons, Inventory, Magic, and Compendium as dedicated RPGItem documents in the database
        const syncTabs = ['Weapons', 'Inventory', 'Magic', 'Compendium'];
        for (const tabName of syncTabs) {
          const tableData = tables[tabName];
          if (tableData && tableData.rows) {
            for (const row of tableData.rows) {
              const itemIdRaw = `${charId}_${tabName}_${row.id}`;
              const safeItemId = itemIdRaw.replace(/[^a-zA-Z0-9_\-]/g, '_');
              
              // Standardize to matching RPGItem schema
              const itemPayload = {
                userId: currentUser.uid,
                itemId: safeItemId,
                name: String(row.Name || row.id || "Unnamed Item").slice(0, 128),
                subtitle: String(row.Description || row.Notes || row.Properties || row.School || "").slice(0, 512),
                icon: String(tabName === "Weapons" ? "⚔️" : tabName === "Magic" ? "✨" : tabName === "Inventory" ? "🎒" : "📦"),
                state: String(row.QuestState || row.Source || "READY").slice(0, 64),
                power: String(row.Damage || row.Level || "").slice(0, 128),
                perditor: String(row.Weight || "").slice(0, 128),
                virtus: String(row.Value || "").slice(0, 128),
                cost: String(row.CastTime || "").slice(0, 128),
                nature: tabName.toUpperCase(),
                effect: String(row.Effect || row.Description || row.Notes || "").slice(0, 1024),
                focus: "",
                terminus: "",
                rarity: "Common",
                quantity: typeof row.Quantity === "string" ? (parseInt(row.Quantity, 10) || 1) : (typeof row.Quantity === "number" ? row.Quantity : 1),
                category: tabName.toLowerCase(),
                updatedAt: new Date().toISOString()
              };

              const itemPath = `users/${currentUser.uid}/items/${safeItemId}`;
              try {
                const itemDocRef = doc(db, 'users', currentUser.uid, 'items', safeItemId);
                await setDoc(itemDocRef, itemPayload);
              } catch (err) {
                console.error(`Failed to sync item ${safeItemId} to items collection`, err);
                handleFirestoreError(err, OperationType.WRITE, itemPath);
              }
            }
          }
        }

        setSavedTables(JSON.parse(JSON.stringify(tables)));
        setSyncStatus('success');
        playTick(880, 0.2, 'sine');
      } catch (error) {
        console.error("Cloud database sync failed: ", error);
        setSyncStatus('failed');
        playTick(150, 0.35, 'sawtooth');
      }
    } else {
      // Just local persistence
      setSavedTables(JSON.parse(JSON.stringify(tables)));
      setSyncStatus('success');
      playTick(720, 0.15, 'sine');
    }
    setIsLoading(false);
  };

  const handleResetToDefaults = () => {
    if (!confirm("Restore default table setups? This overrides draft matrices and cloud arrays with default RPG slots.")) return;
    setTables(JSON.parse(JSON.stringify(DEFAULT_TABLES)));
    safeStorage.setItem('vtt_draft_rpg_tables', JSON.stringify(DEFAULT_TABLES));
    playTick(240, 0.2, 'sawtooth');
  };

  return (
    <div className="flex-1 flex flex-col relative min-h-0 h-full" id="vtt-backend-tab-matrices">
      
      {/* 1. Matrix Tabs Bar */}
      <div className="flex flex-nowrap gap-1">
        {(Object.keys(DEFAULT_TABLES) as BackendTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                playTick(480, 0.03, 'sine');
                setActiveTab(tab);
              }}
              className={`px-1.5 py-1 rounded-t text-[7.8px] font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer border-t border-x ${
                isActive
                  ? 'bg-purple-600/25 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.12)] font-bold'
                  : 'bg-stone-950/30 border-stone-900/40 text-stone-500 hover:text-stone-300'
              }`}
            >
              {t(tab)}
            </button>
          );
        })}
      </div>

      {/* 2. Splendid Matrix Scroll Window */}
      <div className="flex-1 overflow-auto border border-white/5 rounded-b-lg rounded-tr-lg bg-stone-950/70 relative min-h-[160px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full text-left border-collapse text-[8.5px] font-sans">
          <thead>
            <tr className="border-b border-white/10 bg-stone-900/60 sticky top-0 z-[10]">
              {/* Row Grab Drag Header cell with Expand Button */}
              <th className="w-6 p-1 text-center font-mono text-[7px] text-amber-500 border-r border-white/10 bg-stone-900 hover:bg-stone-850 hover:text-amber-400 cursor-pointer select-none relative group"
                  onClick={() => {
                    setIsExpanded(true);
                    playTick(650, 0.1, 'triangle');
                  }}
                  title="Expand Spreadsheet (Google Sheets & Excel Mode)">
                <div className="flex items-center justify-center">
                  <Maximize2 size={8} className="transition-transform group-hover:scale-110 active:scale-95" />
                </div>
              </th>
              
              {currentTable.columns.map((col, cIdx) => (
                <th 
                  key={`matrix-th-col-${col.id}-${cIdx}`}
                  className="p-0.5 px-1 font-serif font-extrabold uppercase tracking-wide text-stone-400 border-r border-white/10 hover:bg-stone-900/90 group relative align-middle"
                  style={{ 
                    width: colWidths[col.id] ? `${colWidths[col.id]}px` : undefined, 
                    minWidth: colWidths[col.id] ? `${colWidths[col.id]}px` : '65px' 
                  }}
                >
                  <div 
                    className="flex items-center justify-between gap-0.5 select-none w-full h-5"
                    draggable="true"
                    onDragStart={(e) => handleColDragStart(e, cIdx)}
                    onDragOver={(e) => handleColDragOver(e, cIdx)}
                    onDragEnd={handleColDragEnd}
                  >
                    <div className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing flex-grow min-w-0 h-full">
                      <GripHorizontal size={8} className="text-stone-700 group-hover:text-stone-500 shrink-0" />
                      <input 
                        type="text"
                        value={col.name}
                        onChange={(e) => handleHeaderEdit(col.id, e.target.value)}
                        className="bg-transparent text-stone-300 font-serif font-bold uppercase border-none focus:outline-none focus:bg-stone-850 focus:text-white px-0.5 py-0 rounded leading-none text-[8px] w-full h-full min-w-0"
                        title="Edit column header"
                      />
                    </div>
                    {col.id !== 'id' && col.id !== 'ID' && col.id !== 'Name' && (
                      <button
                        onClick={() => handleRemoveColumn(col.id, col.name)}
                        className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-red-400 transition-opacity p-0.5 cursor-pointer flex-shrink-0"
                        title="Delete this column"
                      >
                        <Trash2 size={7.5} />
                      </button>
                    )}
                  </div>
                  {/* Invisible resize handler handle at the border of cell */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, col.id)}
                    onDoubleClick={(e) => handleResizeDoubleClick(e, col.id)}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none bg-transparent hover:bg-purple-500/30 active:bg-purple-500/60 z-[12]"
                    title="Double-click to auto-fit width, drag to resize column"
                  />
                </th>
              ))}
              
              {/* Remove Row indicator spacer header with Add Column Button */}
              <th className="w-8 p-0.5 text-center font-mono border-l border-white/10 bg-stone-900/40 align-middle">
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="w-4.5 h-4.5 rounded hover:bg-stone-800 text-stone-400 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 mx-auto"
                  title="Add new column"
                >
                  <Plus size={8} strokeWidth={2.5} />
                </button>
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {currentTable.rows.map((row, rIdx) => (
              <tr 
                key={`matrix-row-${row.id || 'r'}-${rIdx}`}
                className="hover:bg-stone-900/25 transition-colors group"
                draggable="true"
                onDragStart={(e) => handleRowDragStart(e, rIdx)}
                onDragOver={(e) => handleRowDragOver(e, rIdx)}
                onDragEnd={handleRowDragEnd}
              >
                {/* Row Drag Handle Cell */}
                <td className="w-6 p-1 text-center border-r border-white/10 cursor-grab active:cursor-grabbing text-stone-700 group-hover:text-stone-500 transition-colors">
                  <div className="flex justify-center">
                    <GripVertical size={9} />
                  </div>
                </td>

                {currentTable.columns.map((col, cIdx) => {
                  return (
                    <td key={`matrix-cell-${row.id || 'r'}-${col.id}-${cIdx}`} className="p-0.5 px-1.5 border-r border-white/5 font-mono text-[8.5px]">
                      <input 
                        type="text"
                        value={row[col.id] || ""}
                        onChange={(e) => handleCellEdit(row.id, col.id, e.target.value)}
                        className="w-full bg-transparent border-none text-stone-300 focus:outline-none focus:bg-white/5 focus:text-white px-1 rounded h-5 text-[8.2px] leading-none"
                        placeholder="--"
                      />
                    </td>
                  );
                })}

                {/* Remove Row Cell: Always blank final column acting as definitive end column with row delete button */}
                <td className="w-8 p-0.5 text-center bg-stone-950/60 border-l border-white/10">
                  <button
                    onClick={() => handleRemoveRow(row.id, rIdx)}
                    className="text-stone-500 hover:text-red-400 hover:scale-110 active:scale-90 transition-all p-1 cursor-pointer inline-flex items-center justify-center rounded-sm hover:bg-red-500/10"
                    title="Delete row"
                  >
                    <Trash2 size={8} />
                  </button>
                </td>
              </tr>
            ))}
            {/* Row containing the small plus button confined to the reorder/drag handle column box */}
            <tr className="bg-stone-950/20 border-t border-white/5">
              {/* Box matching the reorder grab columns */}
              <td className="w-6 p-1 text-center bg-stone-900/10">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-4.5 h-4.5 rounded bg-stone-900 hover:bg-purple-950/60 text-stone-400 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 mx-auto"
                  title="Add blank row"
                >
                  <Plus size={8} strokeWidth={2.5} />
                </button>
              </td>
              {/* Other columns empty / spacer */}
              <td colSpan={currentTable.columns.length} className="p-0.5 border-r border-white/5 bg-transparent"></td>
              {/* Final definitive end column cell */}
              <td className="w-8 p-1 bg-stone-950/40 border-l border-white/10"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Divider & Bottom-half Real-time TSV text editor */}
      <div className="h-[1px] bg-white/10 my-3 shrink-0" />

      <div className="flex-1 flex flex-col min-h-[140px] bg-stone-950/60 border border-white/5 rounded-lg p-2.5 relative">
        <div className="flex justify-between items-center mb-1.5 select-none">
          <div className="flex items-center gap-1.5">
            <span className="p-0.5 bg-purple-600/20 border border-purple-500/30 rounded text-purple-400">
              <FileSpreadsheet size={10} />
            </span>
            <div>
              <span className="text-[9px] font-serif font-extrabold uppercase tracking-widest text-[#fbbf24]">
                {t("Real-Time TSV Editor")}
              </span>
              <span className="mx-1.5 text-stone-600 text-[8px]">•</span>
              <span className="text-[7.5px] text-stone-400 font-mono uppercase tracking-wider">
                {t("Tab-separated columns, newline-separated rows. Tab:")} <span className="text-purple-400 font-bold">{t(activeTab)}</span>
              </span>
            </div>
          </div>
          <span className="text-[7px] text-stone-500 font-mono uppercase tracking-widest">
            {t("First line is headers")}
          </span>
        </div>

        <textarea
          id="vtt-tsv-editor-textarea"
          value={localTsv}
          onChange={handleTsvChange}
          wrap="off"
          placeholder="ID&#9;Name&#9;Category&#9;Description&#9;Source"
          className="w-full flex-grow min-h-[100px] bg-stone-900/40 border border-white/5 focus:border-purple-500/40 focus:outline-none rounded p-2 text-[8.2px] font-mono text-stone-300 leading-normal selection:bg-purple-500/25 whitespace-pre overflow-auto resize-none"
        />
      </div>

      {/* 5. Saving Controls */}
      {JSON.stringify(tables) !== JSON.stringify(savedTables) && (
        <div className="flex justify-start items-center gap-1.5 border-t border-white/5 pt-2 mt-2">
          <button
            onClick={handleSaveToStorageAndCloud}
            className="px-2.5 py-1 text-[7.5px] font-mono font-bold bg-purple-600 hover:bg-purple-500 hover:scale-105 active:scale-95 text-white uppercase flex items-center gap-1 cursor-pointer transition-all rounded shadow-[0_0_10px_rgba(168,85,247,0.25)]"
            title={t("Save current matrix configurations to local storage & cloud database")}
          >
            <Save size={8.5} /> {t("Save Changes")}
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <span className="font-mono text-[8px] text-purple-400 uppercase tracking-widest animate-pulse">{t("Syncing Matrix...")}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COSMIC EXCEL-LIKE FULLSCREEN SPREADSHEET EDITOR MODAL */}
      {/* ======================================================== */}
      {isExpanded && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-stone-950/98 text-stone-200 select-text p-5 font-sans overflow-hidden animate-fade-in border border-amber-500/30">
          
          {/* 1. Header & Title Bar */}
          <div className="flex justify-between items-center bg-stone-900 border border-white/5 p-3 rounded-lg mb-2 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-600/20 border border-emerald-500/40 rounded text-emerald-400">
                <FileSpreadsheet size={16} />
              </div>
              <div>
                <h2 className="text-sm font-serif font-extrabold uppercase tracking-widest text-[#fbbf24] flex items-center gap-2">
                  Cosmic Spreadsheet Pro <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-mono">EXCEL MODE</span>
                </h2>
                <p className="text-[9px] text-stone-400 font-mono uppercase tracking-wider">
                  Fully featured live formula engine • Arrow keys navigation • Drag, Autocomplete & Instant Re-Fit
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoFitColumnsAll}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[8.5px] font-mono font-bold bg-[#ffe066]/10 hover:bg-[#ffe066]/20 text-[#ffe066] border border-[#ffe066]/20 transition-all rounded cursor-pointer"
                title="Automatically calculate and map columns to perfectly fit context lengths"
              >
                <Sparkles size={11} className="text-amber-400" /> Autofit Columns
              </button>
              
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[8.5px] font-mono font-bold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-all rounded cursor-pointer"
                title="Download current matrix layout as a real CSV spreadsheet file compatible with Microsoft Excel & Google Sheets"
              >
                <Download size={11} /> Export CSV
              </button>
              
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setEditingCell(null);
                  setSelectedCell(null);
                  playTick(450, 0.1, 'sawtooth');
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-[8.5px] font-mono font-bold bg-red-600/25 hover:bg-red-600/35 text-red-400 border border-red-500/30 transition-all rounded cursor-pointer animate-pulse"
                title="Save changes and close Excel-like editor"
              >
                <Minimize2 size={11} /> Exit spreadsheet Mode
              </button>
            </div>
          </div>

          {/* 2. Sheet Tabs and Toolbar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mb-2 items-center">
            {/* Sheet Tabs */}
            <div className="lg:col-span-5 flex items-center gap-1 bg-stone-900/60 p-1 rounded-lg border border-white/5 overflow-x-auto select-none">
              {(Object.keys(DEFAULT_TABLES) as BackendTab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      playTick(480, 0.03, 'sine');
                      setActiveTab(tab);
                      setSelectedCell(null);
                      setEditingCell(null);
                    }}
                    className={`px-3 py-1 rounded text-[9px] font-serif font-bold uppercase transition-all duration-150 cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-extrabold shadow-inner'
                        : 'bg-stone-950/30 border-stone-800/40 text-stone-500 hover:text-stone-300 hover:bg-stone-900'
                    }`}
                  >
                    📊 {tab}
                  </button>
                );
              })}
            </div>

            {/* Cell & Grid Control Toolbar buttons */}
            <div className="lg:col-span-7 flex flex-wrap gap-1.5 justify-end bg-stone-900/45 p-1 rounded-lg border border-white/5">
              
              {/* Insert Row */}
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono bg-stone-900 hover:bg-stone-850 hover:text-white text-stone-300 border border-white/5 rounded cursor-pointer transition-all uppercase"
                title="Insert a blank row at bottom of sheet"
              >
                <Plus size={10} className="text-emerald-500" /> Row
              </button>

              {/* Insert Column */}
              <button
                onClick={handleAddColumn}
                className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono bg-stone-900 hover:bg-stone-850 hover:text-white text-stone-300 border border-white/5 rounded cursor-pointer transition-all uppercase"
                title="Create and append a new column definition"
              >
                <Plus size={10} className="text-emerald-500" /> Col
              </button>

              {/* Series Numbering Autocomplete */}
              <button
                onClick={handleFillSeries}
                disabled={!selectedCell}
                className={`flex items-center gap-1 px-2 py-1 text-[8px] font-mono border rounded cursor-pointer transition-all uppercase ${
                  selectedCell
                    ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-amber-500/20'
                    : 'bg-stone-950/40 text-stone-600 border-transparent cursor-not-allowed'
                }`}
                title="Auto-fill numbers down! Enter number in starting cell, then click Fill Series to increment numbers to column bottom"
              >
                <ArrowUpDown size={10} className="text-amber-500" /> Fill Series
              </button>

              {/* Sort Active Column */}
              <button
                onClick={() => {
                  if (selectedCell) {
                    handleSortColumn(selectedCell.colId);
                  } else {
                    alert('Select any cell to sort the sheet by its column values.');
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono bg-stone-900 hover:bg-stone-850 hover:text-white text-stone-300 border border-white/5 rounded cursor-pointer transition-all uppercase"
                title="Sort entire list based on selected column fields"
              >
                <ArrowUpDown size={10} /> Sort Col
              </button>

              {/* Toggle Find and Replace banner */}
              <button
                onClick={() => {
                  setShowFindReplace(!showFindReplace);
                  playTick(400, 0.05, 'triangle');
                }}
                className={`flex items-center gap-1 px-2 py-1 text-[8px] font-mono border rounded cursor-pointer transition-all uppercase ${
                  showFindReplace 
                    ? 'bg-[#10b981]/25 border-emerald-500 text-emerald-300' 
                    : 'bg-stone-900 hover:bg-stone-850 text-stone-300 border-white/5'
                }`}
                title="Toggle search and bulk replace utility"
              >
                <Search size={10} /> Find & Replace
              </button>

              {/* Clear Table */}
              <button
                onClick={handleClearTable}
                className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono bg-red-955/25 hover:bg-[#ef4444]/15 text-red-300 border border-red-500/25 rounded cursor-pointer transition-all uppercase"
                title="Clear row information logs within this active sheet"
              >
                <Eraser size={10} /> Clear Sheet
              </button>
            </div>
          </div>

          {/* 3. Find and Replace Banner popup drawer */}
          {showFindReplace && (
            <div className="flex flex-wrap items-center gap-3 bg-stone-900 border border-emerald-500/20 p-2.5 rounded-lg mb-2 shadow-md hover:border-emerald-500/35 transition-colors">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[7.5px] uppercase tracking-wider text-stone-400">Search Text:</span>
                <input
                  type="text"
                  placeholder="e.g. Race"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="bg-stone-950 border border-white/10 rounded px-2 py-0.5 text-[8.5px] font-mono text-stone-200 focus:outline-none focus:border-emerald-500/50 w-36 h-5.5 select-text"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[7.5px] uppercase tracking-wider text-stone-400">Replace With:</span>
                <input
                  type="text"
                  placeholder="e.g. Heritage"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="bg-stone-950 border border-white/10 rounded px-2 py-0.5 text-[8.5px] font-mono text-stone-200 focus:outline-none focus:border-emerald-500/50 w-36 h-5.5 select-text"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleFindReplace(false)}
                  className="px-2.5 py-0.5 text-[8px] font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 transition-all rounded cursor-pointer"
                  title="Find first matching instance and replace"
                >
                  Replace Match
                </button>
                <button
                  onClick={() => handleFindReplace(true)}
                  className="px-2.5 py-0.5 text-[8px] font-mono font-bold bg-emerald-600/80 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 transition-all rounded cursor-pointer border border-emerald-500"
                  title="Replace all matching instances in current sheet"
                >
                  Replace All
                </button>
                <button
                  onClick={() => {
                    setShowFindReplace(false);
                    playTick(400, 0.05, 'sine');
                  }}
                  className="px-2 py-0.5 text-[8px] font-mono text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 4. Google Sheets Style Formula Bar */}
          <div className="flex items-center gap-1 bg-stone-900 border border-white/10 rounded-lg p-1.5 mb-2.5 shadow px-2 select-none h-9">
            
            {/* Active Cell Coordinates readout (e.g. C2) */}
            <div className="flex items-center justify-center p-1 font-mono font-bold text-[#f59e0b] shadow bg-stone-950 border border-white/5 rounded text-[9px] min-w-[32px] text-center shrink-0">
              {selectedCell ? (
                `${String.fromCharCode(65 + currentTable.columns.findIndex(c => c.id === selectedCell.colId))}${selectedCell.rIdx + 1}`
              ) : (
                '--'
              )}
            </div>
            
            {/* Split bar spacer */}
            <div className="h-full w-[1px] bg-white/10 mx-1 shrink-0" />
            
            {/* Excel Formula Identifier logo ( fx ) */}
            <div className="italic font-serif font-bold text-stone-500 text-xs px-1 hover:text-emerald-400 cursor-pointer shrink-0" title="Formula evaluation indicator">
              fx
            </div>
            
            {/* Dedicated Formula Line input field */}
            <input
              type="text"
              value={formulaValue}
              onChange={handleFormulaValueChange}
              disabled={!selectedCell}
              placeholder={selectedCell ? "Enter text, numbers, or Excel formulas starting with '=' (e.g. =SUM(A1:B3), =A1+B1, =AVG(C1:D3))" : "Select any grid cell to begin typing Excel formulas"}
              className={`flex-1 bg-transparent border-none text-stone-200 focus:outline-none placeholder-stone-600 px-2 text-[9px] font-mono h-full min-w-0 select-text cursor-text ${
                selectedCell ? '' : 'cursor-not-allowed bg-stone-950/25'
              }`}
            />
          </div>

          {/* 5. High Fidelity Infinite Excel Grid */}
          <div className="flex-1 overflow-auto border border-white/10 rounded-lg bg-stone-950/90 relative min-h-[160px] shadow-[0_5px_20px_rgba(0,0,0,0.6)] [&::-webkit-scrollbar]:visible [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse grid-rows-auto select-none">
              
              {/* Spreadsheet layout Column Letter Row */}
              <thead>
                <tr className="border-b border-white/10 bg-stone-900 sticky top-0 z-[20] select-none text-[8px] font-mono h-[18px]">
                  {/* Select All corner spreadsheet box */}
                  <th className="w-9 p-0.5 text-center text-stone-500 border-r border-white/10 select-none bg-stone-900 sticky left-0 z-[30]">
                    <div className="flex items-center justify-center">
                      <Grid size={9} className="text-stone-500 hover:text-emerald-400 cursor-pointer" onClick={handleAutoFitColumnsAll} title="Auto-fit all spreadsheet columns" />
                    </div>
                  </th>
                  
                  {currentTable.columns.map((col, cIdx) => (
                    <th 
                      key={`excel-letter-col-${col.id}-${cIdx}`} 
                      className="p-0 text-center font-mono text-stone-500 border-r border-white/10 uppercase select-none align-middle"
                      style={{ 
                        width: colWidths[col.id] ? `${colWidths[col.id]}px` : undefined, 
                        minWidth: colWidths[col.id] ? `${colWidths[col.id]}px` : '75px' 
                      }}
                    >
                      <div className="flex flex-col items-center justify-center leading-none text-[7.5px] py-[1px] select-none hover:bg-stone-800 transition-colors">
                        <span className="font-extrabold text-[#78716c]">{String.fromCharCode(65 + cIdx)}</span>
                      </div>
                    </th>
                  ))}
                  
                  {/* End Empty space spacer */}
                  <th className="w-8 border-l border-white/10 bg-stone-900/60 " />
                </tr>

                {/* Subheader Column custom RPG field name label row */}
                <tr className="border-b border-white/10 bg-[#1e1c1b] sticky top-[18px] z-[20] text-[8px] font-sans h-6">
                  {/* Reorder drag spacer header cell */}
                  <th className="w-9 p-1 text-center bg-[#1e1c1b] border-r border-white/10 text-stone-600 sticky left-0 z-[30]" />
                  
                  {currentTable.columns.map((col, cIdx) => (
                    <th 
                      key={`excel-hdr-col-${col.id}-${cIdx}`}
                      className="p-0.5 px-2 font-serif font-extrabold uppercase tracking-wide text-stone-400 border-r border-white/10 hover:bg-stone-900/40 relative group text-left align-middle"
                      style={{ 
                        width: colWidths[col.id] ? `${colWidths[col.id]}px` : undefined, 
                        minWidth: colWidths[col.id] ? `${colWidths[col.id]}px` : '75px' 
                      }}
                    >
                      <div className="flex items-center justify-between gap-1 w-full h-full min-w-0">
                        <input 
                          type="text"
                          value={col.name}
                          onChange={(e) => handleHeaderEdit(col.id, e.target.value)}
                          className="bg-transparent text-[#fbbf24] font-serif font-extrabold uppercase border-none focus:outline-none focus:bg-stone-850 px-1 py-0.5 rounded leading-none text-[8.5px] w-full min-w-0 font-bold"
                          title="Rename Excel Column Head"
                        />
                        {col.id !== 'id' && col.id !== 'ID' && col.id !== 'Name' && (
                          <button
                            onClick={() => handleRemoveColumn(col.id, col.name)}
                            className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-red-400 transition-opacity p-0.5 cursor-pointer shrink-0"
                            title="Delete this column"
                          >
                            <Trash2 size={7.5} />
                          </button>
                        )}
                      </div>
                      <div 
                        onMouseDown={(e) => handleResizeStart(e, col.id)}
                        onDoubleClick={(e) => handleResizeDoubleClick(e, col.id)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none bg-transparent hover:bg-emerald-500/30 active:bg-emerald-500/60 z-[12]"
                        title="Drag to resize column width"
                      />
                    </th>
                  ))}
                  
                  {/* Plus Add new Column excel indicator */}
                  <th className="w-8 text-center bg-stone-900/40 border-l border-white/10 align-middle">
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="w-4 h-4 rounded hover:bg-emerald-600/30 text-stone-400 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 mx-auto"
                      title="Add column to grid"
                    >
                      <Plus size={8} strokeWidth={2.5} />
                    </button>
                  </th>
                </tr>
              </thead>
              
              {/* Excel Grid Cell contents */}
              <tbody className="divide-y divide-white/5 whitespace-nowrap">
                {currentTable.rows.map((row, rIdx) => {
                  return (
                    <tr 
                      key={`excel-row-${row.id || 'r'}-${rIdx}`}
                      className="hover:bg-stone-900/15 group relative h-6"
                    >
                      {/* Row Left Numbering Label Column */}
                      <td className="w-9 p-0 bg-stone-900 border-r border-white/10 text-center font-mono font-bold text-stone-500 text-[8px] select-none sticky left-0 z-[15] h-5.5 align-middle">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[#a8a29e]">{rIdx + 1}</span>
                          <button
                            onClick={() => handleRemoveRow(row.id, rIdx)}
                            className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-red-400 transition-opacity p-0.5 cursor-pointer"
                            title={`Remove spreadsheet row ${rIdx + 1}`}
                          >
                            <Trash2 size={7} />
                          </button>
                        </div>
                      </td>

                      {currentTable.columns.map((col, cIdx) => {
                        const isCellSelected = selectedCell?.rIdx === rIdx && selectedCell?.colId === col.id;
                        const isCellEditing = editingCell?.rIdx === rIdx && editingCell?.colId === col.id;
                        const cellRawValue = row[col.id] || "";
                        // If it starts with '=', evaluate it dynamically, otherwise show raw string value
                        const cellDisplayValue = evaluateFormula(cellRawValue, currentTable.rows, currentTable.columns);

                        return (
                          <td 
                            key={`excel-cell-${row.id || 'r'}-${col.id}-${cIdx}`} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCell({ rIdx, colId: col.id });
                              setEditingCell(null);
                              playTick(420, 0.01, 'sine');
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setSelectedCell({ rIdx, colId: col.id });
                              setEditingCell({ rIdx, colId: col.id });
                              playTick(600, 0.04, 'triangle');
                            }}
                            className={`p-0 px-[1.5px] border-r border-white/15 font-mono text-[8.5px] select-text relative cursor-cell h-5.5 transition-all ${
                              isCellSelected 
                                ? 'bg-emerald-950/20' 
                                : 'hover:bg-stone-900/20'
                            }`}
                            style={{ 
                              width: colWidths[col.id] ? `${colWidths[col.id]}px` : undefined,
                              minWidth: colWidths[col.id] ? `${colWidths[col.id]}px` : '75px' 
                            }}
                          >
                            {isCellEditing ? (
                              <input 
                                type="text"
                                value={cellRawValue}
                                onChange={(e) => handleCellEdit(row.id, col.id, e.target.value)}
                                autoFocus
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    setEditingCell(null);
                                    // Move select marker down
                                    const nextR = Math.min(currentTable.rows.length - 1, rIdx + 1);
                                    setSelectedCell({ rIdx: nextR, colId: col.id });
                                    playTick(500, 0.02, 'sine');
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full h-full bg-stone-900 border border-emerald-500 text-emerald-300 font-mono text-[8.2px] focus:outline-none px-1 rounded select-text"
                                placeholder="..."
                              />
                            ) : (
                              <div className="w-full h-full flex items-center px-1 truncate leading-none text-stone-300 text-[8px] select-all min-h-[16px]">
                                {cellDisplayValue || <span className="text-[#a8a29e]/30">—</span>}
                              </div>
                            )}

                            {/* Crisp excel selected cell outline */}
                            {isCellSelected && !isCellEditing && (
                              <div className="absolute inset-0 border-2 border-emerald-500 pointer-events-none z-[8]">
                                {/* Bottom right solid fill handle square of Google Sheets */}
                                <div className="absolute bottom-[-2.5px] right-[-2.5px] w-1.5 h-1.5 bg-emerald-400 border border-emerald-600 rounded-sm shadow cursor-crosshair animate-pulse" title="Excel Auto Fill Cell handle" />
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Spacer end column */}
                      <td className="w-8 p-0 bg-stone-950/40 border-l border-white/10" />
                    </tr>
                  );
                })}
                
                {/* Additional Blank Spreadsheet bottom spacer row containing the easy Add Button */}
                <tr className="bg-stone-900/10 border-t border-white/5 h-6">
                  <td className="w-9 p-0.5 text-center bg-stone-900 sticky left-0 z-[15] h-6 align-middle border-r border-[#ffe066]/10">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="w-4 h-4 rounded bg-stone-950 hover:bg-emerald-600/30 text-stone-400 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 mx-auto"
                      title="Add blank row"
                    >
                      <Plus size={8} strokeWidth={2.5} />
                    </button>
                  </td>
                  <td colSpan={currentTable.columns.length} className="bg-transparent h-6" />
                  <td className="w-8 bg-stone-950/40 border-l border-white/10 h-6" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. Excel Modal Save Actions and Instruction hints */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-stone-900 border border-white/5 p-3 rounded-lg mt-2 gap-3">
            <div className="flex items-center gap-1.5 font-mono text-[7px] text-stone-400 uppercase tracking-wider">
              <span className="px-1.5 py-0.5 rounded bg-stone-950 text-[#f59e0b] border border-white/10">ESC</span> exits edit mode
              <span className="text-stone-600">•</span>
              <span className="px-1.5 py-0.5 rounded bg-stone-950 text-[#f59e0b] border border-white/10">Double-Click</span> edits cells
              <span className="text-stone-600">•</span>
              <span className="px-1.5 py-0.5 rounded bg-stone-950 text-[#f59e0b] border border-white/10">Arrow Keys</span> navigate grid cells
              <span className="text-stone-600">•</span>
              <span className="px-1.5 py-0.5 rounded bg-stone-950 text-emerald-400 border border-white/10">Ctrl+C / Ctrl+V</span> copy & paste
            </div>

            <div className="flex items-center gap-2">
              {JSON.stringify(tables) !== JSON.stringify(savedTables) && (
                <button
                  onClick={handleSaveToStorageAndCloud}
                  className="px-4 py-1.5 text-[9px] font-mono font-bold bg-[#10b981] hover:bg-[#059669] text-white uppercase flex items-center gap-1.5 cursor-pointer transition-all rounded shadow-md font-serif hover:scale-105 active:scale-95"
                  title="Save spreadsheet draft edits permanently to database"
                >
                  <Save size={11} /> Save Matrix Changes
                </button>
              )}
              
              <button
                onClick={() => {
                  setIsExpanded(false);
                  setEditingCell(null);
                  setSelectedCell(null);
                  playTick(450, 0.1, 'sawtooth');
                }}
                className="px-4 py-1.5 text-[9px] font-mono font-bold bg-[#374151] hover:bg-[#4b5563] text-[#ffe066] uppercase border border-[#ffe066]/30 hover:border-[#ffe066]/60 transition-all rounded cursor-pointer hover:text-white"
              >
                Close Editor
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
