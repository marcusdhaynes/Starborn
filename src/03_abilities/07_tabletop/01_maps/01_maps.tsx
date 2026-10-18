import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  FolderOpen, 
  Map, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Grid, 
  Sliders, 
  UploadCloud, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw,
  FolderPlus,
  Compass,
  Sparkles
} from 'lucide-react';
import { TabletopLabel } from '../../01_section_labels';
import { safeStorage } from '../../../storage';
import { useTranslation } from '../../../99_settings/language';

// ==========================================
// Types & Defaults
// ==========================================

export interface TreeItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  imageUrl?: string;
  gridSize?: number;
  gridOpacity?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  children?: TreeItem[];
}

// Inline SVGs for elegant default maps, guaranteeing 100% stable offline loader capability!
const DEFAULT_MAPS = {
  voidPortal: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'><defs><radialGradient id='g1' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='%231b153a'/><stop offset='45%' stop-color='%230b0521'/><stop offset='100%' stop-color='%2302000d'/></radialGradient><radialGradient id='glow' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='%2300ffff' stop-opacity='0.4'/><stop offset='100%' stop-color='%23ff00ff' stop-opacity='0'/></radialGradient></defs><rect width='100%' height='100%' fill='url(%23g1)'/><circle cx='400' cy='400' r='180' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-dasharray='8 14' opacity='0.7'/><circle cx='400' cy='400' r='100' fill='url(%23glow)'/><circle cx='400' cy='400' r='100' fill='none' stroke='%23ec4899' stroke-width='1.5' stroke-dasharray='4 6' opacity='0.8'/><circle cx='400' cy='400' r='300' fill='none' stroke='%23818cf8' stroke-width='1' opacity='0.3'/><path d='M 100 400 L 700 400 M 400 100 L 400 700' stroke='white' stroke-width='0.5' opacity='0.2'/><circle cx='400' cy='400' r='380' fill='none' stroke='%2338bdf8' stroke-width='0.5' opacity='0.2'/></svg>",
  keepCourtyard: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'><defs><linearGradient id='bg3' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%231c1917'/><stop offset='100%' stop-color='%230c0a09'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23bg3)'/><g stroke='%23292524' stroke-width='1.5' opacity='0.75'><path d='M0 50 h800 M0 100 h800 M0 150 h800 M0 200 h800 M0 250 h800 M0 300 h800 M0 350 h800 M0 400 h800 M0 450 h800 M0 500 h800 M0 550 h800 M0 600 h800 M0 650 h800 M0 700 h800 M0 750 h800 M50 0 v800 M100 0 v800 M150 0 v800 M200 0 v800 M250 0 v800 M300 0 v800 M350 0 v800 M400 0 v800 M450 0 v800 M500 0 v800 M550 0 v800 M600 0 v800 M650 0 v800 M700 0 v800 M750 0 v800'/></g><rect x='150' y='150' width='500' height='500' fill='none' stroke='%2378716c' stroke-width='5' opacity='0.7'/><circle cx='400' cy='400' r='80' fill='none' stroke='%23f59e0b' stroke-width='2' opacity='0.5'/><rect x='250' y='250' width='100' height='100' fill='%231c1917' stroke='%23a8a29e' stroke-width='2' opacity='0.6'/><rect x='450' y='250' width='100' height='100' fill='%231c1917' stroke='%23a8a29e' stroke-width='2' opacity='0.6'/></svg>",
  whisperingForest: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800' viewBox='0 0 800 800'><rect width='100%' height='100%' fill='%23052e16'/><circle cx='220' cy='200' r='90' fill='%23022c22' stroke='%2314532d' stroke-width='3' opacity='0.75'/><circle cx='180' cy='620' r='110' fill='%23022c22' stroke='%2314532d' stroke-width='4' opacity='0.75'/><circle cx='620' cy='460' r='130' fill='%23022c22' stroke='%2314532d' stroke-width='3' opacity='0.75'/><path d='M 80 160 Q 320 380 520 280 T 820 540' fill='none' stroke='%23451a03' stroke-width='22' opacity='0.6'/><path d='M 80 160 Q 320 380 520 280 T 820 540' fill='none' stroke='%2378350f' stroke-width='14' opacity='0.4'/></svg>"
};

const DEFAULT_TREE: TreeItem[] = [
  {
    id: 'folder-void',
    name: 'Campaign: The Void',
    type: 'folder',
    children: [
      {
        id: 'map-void-portal',
        name: 'Celestial Rift Grid',
        type: 'file',
        imageUrl: DEFAULT_MAPS.voidPortal,
        gridSize: 40,
        gridOpacity: 0.35
      }
    ]
  },
  {
    id: 'folder-keep',
    name: 'Campaign: Darkstone Keep',
    type: 'folder',
    children: [
      {
        id: 'map-keep-courtyard',
        name: 'Keep Inner Courtyard',
        type: 'file',
        imageUrl: DEFAULT_MAPS.keepCourtyard,
        gridSize: 50,
        gridOpacity: 0.6
      }
    ]
  },
  {
    id: 'map-whispering-forest',
    name: 'Whispering Forest Path',
    type: 'file',
    imageUrl: DEFAULT_MAPS.whisperingForest,
    gridSize: 60,
    gridOpacity: 0.45
  }
];

// ==========================================
// Primary Operations Helpers
// ==========================================

function removeNodeFromTree(items: TreeItem[], id: string): { newItems: TreeItem[]; removed: TreeItem | null } {
  let removed: TreeItem | null = null;
  
  function recurse(list: TreeItem[]): TreeItem[] {
    const idx = list.findIndex(item => item.id === id);
    if (idx !== -1) {
      removed = list[idx];
      return [...list.slice(0, idx), ...list.slice(idx + 1)];
    }
    return list.map(item => {
      if (item.children) {
        return {
          ...item,
          children: recurse(item.children)
        };
      }
      return item;
    });
  }
  
  const newItems = recurse(items);
  return { newItems, removed };
}

function insertNodeIntoTree(
  items: TreeItem[],
  targetId: string,
  nodeToInsert: TreeItem,
  position: 'before' | 'after' | 'inside'
): TreeItem[] {
  function isNodeContained(parent: TreeItem, searchId: string): boolean {
    if (parent.id === searchId) return true;
    if (parent.children) {
      return parent.children.some(child => isNodeContained(child, searchId));
    }
    return false;
  }
  
  if (isNodeContained(nodeToInsert, targetId)) {
    return items; 
  }

  function recurse(list: TreeItem[]): TreeItem[] {
    const idx = list.findIndex(item => item.id === targetId);
    if (idx !== -1) {
      if (position === 'inside') {
        const target = list[idx];
        if (target.type === 'folder') {
          const updatedChildren = target.children ? [...target.children, nodeToInsert] : [nodeToInsert];
          return [
            ...list.slice(0, idx), 
            { ...target, children: updatedChildren }, 
            ...list.slice(idx + 1)
          ];
        } else {
          return [...list.slice(0, idx + 1), nodeToInsert, ...list.slice(idx + 1)];
        }
      } else if (position === 'before') {
        return [...list.slice(0, idx), nodeToInsert, ...list.slice(idx)];
      } else { // 'after'
        return [...list.slice(0, idx + 1), nodeToInsert, ...list.slice(idx + 1)];
      }
    }
    
    return list.map(item => {
      if (item.children) {
        return {
          ...item,
          children: recurse(item.children)
        };
      }
      return item;
    });
  }
  
  return recurse(items);
}

function renameNodeInTree(items: TreeItem[], id: string, newName: string): TreeItem[] {
  return items.map(item => {
    if (item.id === id) {
      return { ...item, name: newName };
    }
    if (item.children) {
      return {
        ...item,
        children: renameNodeInTree(item.children, id, newName)
      };
    }
    return item;
  });
}

function findNodeInTree(items: TreeItem[], id: string): TreeItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findNodeInTree(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ==========================================
// Primary Tabletop Component
// ==========================================

export default function Tabletop() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef(false);
  
  // Synchronized global states.
  const [isThrown, setIsThrown] = useState(() => safeStorage.getItem('tabletop_is_thrown') === 'true');
  const [appOpacity, setAppOpacity] = useState(() => {
    const saved = safeStorage.getItem('tabletop_app_opacity');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [avatarPos, setAvatarPos] = useState(() => {
    const savedX = safeStorage.getItem('tabletop_avatar_x');
    const savedY = safeStorage.getItem('tabletop_avatar_y');
    return {
      x: savedX ? parseInt(savedX, 10) : 1200,
      y: savedY ? parseInt(savedY, 10) : 1200
    };
  });

  // Track state updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      setIsThrown(safeStorage.getItem('tabletop_is_thrown') === 'true');
      const opacitySaved = safeStorage.getItem('tabletop_app_opacity');
      setAppOpacity(opacitySaved ? parseInt(opacitySaved, 10) : 100);
      const savedX = safeStorage.getItem('tabletop_avatar_x');
      const savedY = safeStorage.getItem('tabletop_avatar_y');
      setAvatarPos({
        x: savedX ? parseInt(savedX, 10) : 1200,
        y: savedY ? parseInt(savedY, 10) : 1200
      });
    };
    window.addEventListener('tabletop-state-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('tabletop-state-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const moveAvatarBy = (dx: number, dy: number) => {
    setAvatarPos(prev => {
      let step = gridSize || 50;
      if (step < 10) step = 50;
      let newX = prev.x + dx * step;
      let newY = prev.y + dy * step;
      newX = Math.max(50, Math.min(2350, newX));
      newY = Math.max(50, Math.min(2350, newY));
      
      setTimeout(() => {
        safeStorage.setItem('tabletop_avatar_x', newX.toString());
        safeStorage.setItem('tabletop_avatar_y', newY.toString());
        window.dispatchEvent(new Event('tabletop-state-update'));
      }, 0);

      return { x: newX, y: newY };
    });
  };

  const [tree, setTree] = useState<TreeItem[]>(() => {
    const saved = safeStorage.getItem('tabletop_tree_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed importing tabletop tree structure", e);
      }
    }
    return DEFAULT_TREE;
  });

  const [activeMapId, setActiveMapId] = useState<string | null>(() => {
    return safeStorage.getItem('tabletop_active_map_id_v3') || 'map-void-portal';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = safeStorage.getItem('tabletop_sidebar_collapsed_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return false;
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const saved = safeStorage.getItem('tabletop_expanded_folders_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return { 'folder-void': true, 'folder-keep': true };
  });

  // Active Grid parameters
  const [gridSize, setGridSize] = useState<number>(() => {
    const saved = safeStorage.getItem('tabletop_grid_size_v3');
    return saved ? parseInt(saved, 10) : 40;
  });
  const [gridOpacity, setGridOpacity] = useState<number>(() => {
    const saved = safeStorage.getItem('tabletop_grid_opacity_v3');
    return saved ? parseFloat(saved) : 0.4;
  });
  const [gridOffsetX, setGridOffsetX] = useState<number>(() => {
    const saved = safeStorage.getItem('tabletop_grid_offset_x_v3');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gridOffsetY, setGridOffsetY] = useState<number>(() => {
    const saved = safeStorage.getItem('tabletop_grid_offset_y_v3');
    return saved ? parseInt(saved, 10) : 0;
  });

  // UI States for Drag & Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after' | 'inside' | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState<string>('');
  
  // Deletion interactive query
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');

  // Floating controls timers map (to handle controls fading away after seconds of hovering over list items)
  const [activeNodeControls, setActiveNodeControls] = useState<Record<string, boolean>>({});
  const controlsTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Map Pan / Zoom coordinates (held inside memory)
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // AI alignment state managers
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const handleAIAutoSetup = async (targetMap: TreeItem) => {
    if (!targetMap || !targetMap.imageUrl) return;
    setIsAnalyzing(true);
    setAiReasoning("AI is analyzing map details & aligning... Please wait.");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://subversion.ai.studio' : '')}/api/analyze-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapName: targetMap.name,
          imageUrl: targetMap.imageUrl,
        }),
      });
      if (!response.ok) {
        let msg = "Server returned an error status.";
        try {
          const errData = await response.json();
          if (errData && errData.error) msg = errData.error;
        } catch (e) {}
        throw new Error(msg);
      }
      const data = await response.json();
      if (data && typeof data.gridSize === 'number') {
        const size = data.gridSize;
        const opacity = typeof data.gridOpacity === 'number' ? data.gridOpacity : 0.4;
        const ox = typeof data.gridOffsetX === 'number' ? data.gridOffsetX : 0;
        const oy = typeof data.gridOffsetY === 'number' ? data.gridOffsetY : 0;
        const reasoning = data.reasoning || "Map layout aligned safely.";
        
        // Update states
        setGridSize(size);
        setGridOpacity(opacity);
        setGridOffsetX(ox);
        setGridOffsetY(oy);
        setAiReasoning(reasoning);

        // Record setup & reasoning locally
        safeStorage.setItem(`tabletop_ai_setup_v2_${targetMap.id}`, 'true');
        safeStorage.setItem(`tabletop_ai_reasoning_v2_${targetMap.id}`, reasoning);

        // Update within tree structure
        setTree(prev => prev.map(item => {
          if (item.id === targetMap.id) {
            return {
              ...item,
              gridSize: size,
              gridOpacity: opacity,
              gridOffsetX: ox,
              gridOffsetY: oy,
            };
          }
          if (item.children) {
            return {
              ...item,
              children: item.children.map(c => c.id === targetMap.id ? {
                ...c,
                gridSize: size,
                gridOpacity: opacity,
                gridOffsetX: ox,
                gridOffsetY: oy,
              } : c)
            };
          }
          return item;
        }));

        // Force storage sync for character snap values
        setTimeout(() => {
          safeStorage.setItem('tabletop_active_map_gridSize', size.toString());
          safeStorage.setItem('tabletop_active_map_gridOpacity', opacity.toString());
          safeStorage.setItem('tabletop_active_map_gridOffsetX', ox.toString());
          safeStorage.setItem('tabletop_active_map_gridOffsetY', oy.toString());
          window.dispatchEvent(new Event('tabletop-state-update'));
        }, 50);
      } else {
        throw new Error("Invalid response schema returned by AI analysis.");
      }
    } catch (err: any) {
      console.error("AI map alignment failed:", err);
      setAiReasoning(`AI Alignment Error: ${err?.message || "Verify your connection & credentials."}`);
      safeStorage.setItem(`tabletop_ai_setup_v2_${targetMap.id}`, 'failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Syncing to local storage
  const activeMap = findNodeInTree(tree, activeMapId || '');

  useEffect(() => {
    safeStorage.setItem('tabletop_tree_v3', JSON.stringify(tree));
  }, [tree]);

  useEffect(() => {
    if (activeMapId) {
      safeStorage.setItem('tabletop_active_map_id_v3', activeMapId);
      const activeNode = findNodeInTree(tree, activeMapId);
      if (activeNode) {
        if (activeNode.gridSize) setGridSize(activeNode.gridSize);
        if (activeNode.gridOpacity !== undefined) setGridOpacity(activeNode.gridOpacity);
        setGridOffsetX(activeNode.gridOffsetX !== undefined ? activeNode.gridOffsetX : 0);
        setGridOffsetY(activeNode.gridOffsetY !== undefined ? activeNode.gridOffsetY : 0);

        const savedReasoning = safeStorage.getItem(`tabletop_ai_reasoning_v2_${activeMapId}`);
        setAiReasoning(savedReasoning);

        const alreadySetup = safeStorage.getItem(`tabletop_ai_setup_v2_${activeMapId}`);
        if (!alreadySetup) {
          handleAIAutoSetup(activeNode);
        }
      }
    } else {
      safeStorage.removeItem('tabletop_active_map_id_v3');
      setAiReasoning(null);
    }
  }, [activeMapId]);

  useEffect(() => {
    if (activeMap) {
      safeStorage.setItem('tabletop_active_map_imageUrl', activeMap.imageUrl || '');
      safeStorage.setItem('tabletop_active_map_name', activeMap.name || '');
      safeStorage.setItem('tabletop_active_map_gridSize', gridSize.toString());
      safeStorage.setItem('tabletop_active_map_gridOpacity', gridOpacity.toString());
      safeStorage.setItem('tabletop_active_map_gridOffsetX', gridOffsetX.toString());
      safeStorage.setItem('tabletop_active_map_gridOffsetY', gridOffsetY.toString());
    } else {
      safeStorage.removeItem('tabletop_active_map_imageUrl');
      safeStorage.removeItem('tabletop_active_map_name');
    }
    window.dispatchEvent(new Event('tabletop-state-update'));
  }, [activeMapId, tree, gridSize, gridOpacity, gridOffsetX, gridOffsetY, activeMap]);

  useEffect(() => {
    safeStorage.setItem('tabletop_sidebar_collapsed_v3', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    safeStorage.setItem('tabletop_expanded_folders_v3', JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  useEffect(() => {
    safeStorage.setItem('tabletop_grid_size_v3', gridSize.toString());
  }, [gridSize]);

  useEffect(() => {
    safeStorage.setItem('tabletop_grid_opacity_v3', gridOpacity.toString());
  }, [gridOpacity]);

  useEffect(() => {
    safeStorage.setItem('tabletop_grid_offset_x_v3', gridOffsetX.toString());
  }, [gridOffsetX]);

  useEffect(() => {
    safeStorage.setItem('tabletop_grid_offset_y_v3', gridOffsetY.toString());
  }, [gridOffsetY]);

  const handleGridSizeChange = (newSize: number) => {
    setGridSize(newSize);
    if (activeMapId) {
      setTree(prev => prev.map(item => {
        if (item.id === activeMapId) {
          return { ...item, gridSize: newSize };
        }
        if (item.children) {
          return {
            ...item,
            children: item.children.map(c => c.id === activeMapId ? { ...c, gridSize: newSize } : c)
          };
        }
        return item;
      }));
    }
  };

  const handleGridOpacityChange = (newOpacity: number) => {
    setGridOpacity(newOpacity);
    if (activeMapId) {
      setTree(prev => prev.map(item => {
        if (item.id === activeMapId) {
          return { ...item, gridOpacity: newOpacity };
        }
        if (item.children) {
          return {
            ...item,
            children: item.children.map(c => c.id === activeMapId ? { ...c, gridOpacity: newOpacity } : c)
          };
        }
        return item;
      }));
    }
  };

  const handleGridOffsetXChange = (newOffset: number) => {
    setGridOffsetX(newOffset);
    if (activeMapId) {
      setTree(prev => prev.map(item => {
        if (item.id === activeMapId) {
          return { ...item, gridOffsetX: newOffset };
        }
        if (item.children) {
          return {
            ...item,
            children: item.children.map(c => c.id === activeMapId ? { ...c, gridOffsetX: newOffset } : c)
          };
        }
        return item;
      }));
    }
  };

  const handleGridOffsetYChange = (newOffset: number) => {
    setGridOffsetY(newOffset);
    if (activeMapId) {
      setTree(prev => prev.map(item => {
        if (item.id === activeMapId) {
          return { ...item, gridOffsetY: newOffset };
        }
        if (item.children) {
          return {
            ...item,
            children: item.children.map(c => c.id === activeMapId ? { ...c, gridOffsetY: newOffset } : c)
          };
        }
        return item;
      }));
    }
  };

  // Cleanup pending control timers on destruction
  useEffect(() => {
    return () => {
      const currentTimers = controlsTimersRef.current;
      Object.keys(currentTimers).forEach(id => {
        clearTimeout(currentTimers[id]);
      });
    };
  }, []);

  // ==========================================
  // Custom Tree Handlers
  // ==========================================

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleStartRename = (e: React.MouseEvent, item: TreeItem) => {
    e.stopPropagation();
    setRenamingId(item.id);
    setRenamingName(item.name);
  };

  const handleSaveRename = () => {
    if (renamingId && renamingName.trim()) {
      setTree(prev => renameNodeInTree(prev, renamingId, renamingName.trim()));
      setRenamingId(null);
    }
  };

  const triggerDelete = (e: React.MouseEvent, item: TreeItem) => {
    e.stopPropagation();
    setDeleteConfirmId(item.id);
    setDeleteConfirmName(item.name);
  };

  const handleCreateFolder = () => {
    const folderName = prompt("Enter Name for the New Subfolder:", "New Folder");
    if (!folderName) return;

    const newFolder: TreeItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      children: []
    };

    setTree(prev => [...prev, newFolder]);
  };

  const processUploadedFiles = (filesList: File[]) => {
    filesList.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        if (dataUrl) {
          const newMap: TreeItem = {
            id: `map-${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
            type: 'file',
            imageUrl: dataUrl,
            gridSize: 50,
            gridOpacity: 0.4
          };
          setTree(prev => [...prev, newMap]);
          setActiveMapId(newMap.id);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedFiles(Array.from(files) as File[]);
    }
  };

  const handleDragOverRoot = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropFilesOnZone = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFiles(Array.from(files) as File[]);
    }
  };

  // Zoom / Pan events
  const handleViewerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { 
      setIsPanning(true);
      setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    }
  };

  const handleViewerMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffsetX(e.clientX - panStart.x);
      setOffsetY(e.clientY - panStart.y);
    }
  };

  const handleViewerMouseUp = () => {
    setIsPanning(false);
  };

  const handleViewerWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const multiplier = e.deltaY < 0 ? 1.12 : 0.88;
    const nextScale = Math.max(0.4, Math.min(6, scale * multiplier));
    setScale(nextScale);
  };

  const resetPanAndZoom = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // ==========================================
  // Sidebar Closure Node Renderer
  // ==========================================

  const renderTreeNode = (item: TreeItem, depth: number, parentFolderId?: string) => {
    const isExpanded = expandedFolders[item.id] || false;
    const isCurrentActive = activeMapId === item.id;
    const isRenamable = renamingId === item.id;
    const isControlsVisible = activeNodeControls[item.id] || false;

    // Refresh display timer for the inline hover edit/delete icons
    const refreshActiveTimer = () => {
      setActiveNodeControls(prev => ({ ...prev, [item.id]: true }));
      if (controlsTimersRef.current[item.id]) {
        clearTimeout(controlsTimersRef.current[item.id]);
      }
      controlsTimersRef.current[item.id] = setTimeout(() => {
        setActiveNodeControls(prev => ({ ...prev, [item.id]: false }));
      }, 3000); // 3 seconds fade out
    };

    const handleDragStartItem = (e: React.DragEvent) => {
      if (isRenamable) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      setDraggedId(item.id);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOverItem = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedId || draggedId === item.id) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height;

      if (item.type === 'folder') {
        if (relativeY < 0.22) {
          setDragOverPos('before');
        } else if (relativeY > 0.78) {
          setDragOverPos('after');
        } else {
          setDragOverPos('inside');
        }
      } else {
        if (relativeY < 0.5) {
          setDragOverPos('before');
        } else {
          setDragOverPos('after');
        }
      }
      setDragOverId(item.id);
    };

    const handleDragLeaveItem = () => {
      if (dragOverId === item.id) {
        setDragOverId(null);
        setDragOverPos(null);
      }
    };

    const handleDropItem = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!draggedId || draggedId === item.id) return;

      const position = dragOverPos || 'after';
      const targetId = item.id;

      const { newItems, removed } = removeNodeFromTree(tree, draggedId);
      if (removed) {
        const updated = insertNodeIntoTree(newItems, targetId, removed, position);
        setTree(updated);
      }

      setDraggedId(null);
      setDragOverId(null);
      setDragOverPos(null);
    };

    const selectOrCollapse = () => {
      if (item.type === 'folder') {
        toggleFolder(item.id);
      } else {
        setActiveMapId(item.id);
      }
    };

    let dragClass = "border-transparent";
    if (dragOverId === item.id) {
      if (dragOverPos === 'before') dragClass = "border-t-amber-500 border-t-2";
      else if (dragOverPos === 'after') dragClass = "border-b-amber-500 border-b-2";
      else if (dragOverPos === 'inside') dragClass = "bg-[#fab005]/10 border-amber-500/50 border-2";
    }

    return (
      <div 
        key={item.id}
        className="w-full select-none"
        onDragOver={handleDragOverItem}
        onDragLeave={handleDragLeaveItem}
        onDrop={handleDropItem}
      >
        <div
          draggable
          onDragStart={handleDragStartItem}
          onDragEnd={() => {
            setDraggedId(null);
            setDragOverId(null);
            setDragOverPos(null);
          }}
          onMouseEnter={refreshActiveTimer}
          onMouseMove={refreshActiveTimer}
          onClick={selectOrCollapse}
          className={`group flex items-center justify-between px-2 py-1.5 my-0.5 rounded transition-all cursor-pointer border ${dragClass} ${
            isCurrentActive 
              ? 'bg-[#ffe066]/15 border-amber-400/30 text-amber-300 shadow-[inset_0_0_10px_rgba(234,179,8,0.07)]' 
              : 'hover:bg-white/5 border-transparent text-stone-200'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
            {item.type === 'folder' ? (
              <span className="text-amber-500/80">
                {isExpanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronRight size={13} strokeWidth={2.5} />}
              </span>
            ) : (
              <span className="text-stone-400/50 pl-2 pr-0.5">
                <Map size={11} />
              </span>
            )}
            
            {item.type === 'folder' && (
              <span className="text-amber-500/80 mr-0.5">
                {isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
              </span>
            )}

            {isRenamable ? (
              <input 
                type="text"
                value={renamingName}
                autoFocus
                onClick={e => e.stopPropagation()}
                onChange={e => setRenamingName(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="bg-stone-900 border border-amber-500/50 px-1 py-0.5 rounded text-[10px] text-white focus:outline-none w-full"
              />
            ) : (
              <span className={`text-[10.5px] font-medium truncate tracking-wide ${item.type === 'folder' ? 'font-serif text-amber-100/90' : 'font-sans text-stone-300'}`}>
                {t(item.name)}
              </span>
            )}
          </div>

          {!isRenamable && (
            <div 
              className={`flex items-center gap-1.5 transition-opacity duration-300 ${
                isControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <button 
                onClick={(e) => handleStartRename(e, item)}
                title={t("Rename")}
                className="p-0.5 hover:text-white text-stone-400 hover:bg-white/10 rounded cursor-pointer transition-all"
              >
                <Edit3 size={11} />
              </button>
              <button 
                onClick={(e) => triggerDelete(e, item)}
                title={t("Delete")}
                className="p-0.5 hover:text-red-400 text-stone-400 hover:bg-red-950/20 rounded cursor-pointer transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Tree Children */}
        {item.type === 'folder' && isExpanded && item.children && (
          <div className="w-full relative">
            <div 
              className="absolute left-[13px] top-1 bottom-1 w-[1px] border-l border-white/5 border-dashed pointer-events-none"
              style={{ left: `${depth * 14 + 13}px` }}
            />
            {item.children.length === 0 ? (
              <div 
                className="text-[9px] text-stone-500/75 italic py-1 pl-6"
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
              >
                {t("Folder is empty")}
              </div>
            ) : (
              item.children.map(child => renderTreeNode(child, depth + 1, item.id))
            )}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // Layout rendering
  // ==========================================

  return (
    <div className="w-full h-full flex flex-col items-center justify-between relative group pointer-events-auto">
      
      <TabletopLabel />
      
      {isThrown && (
        <button
          onClick={() => {
            safeStorage.setItem('tabletop_is_thrown', 'false');
            safeStorage.setItem('tabletop_app_opacity', '100');
            window.dispatchEvent(new Event('tabletop-state-update'));
          }}
          className="px-3 py-1 text-amber-400 hover:text-amber-250 text-[8px] font-mono font-extrabold uppercase tracking-widest transition-all cursor-pointer pointer-events-auto border border-amber-500/20 hover:border-amber-400/35 rounded bg-stone-950/75 hover:bg-stone-900/90 leading-none whitespace-nowrap shadow z-10 absolute bottom-1.5"
        >
          {t("Retrieve Map")}
        </button>
      )}

      <div 
        onClick={() => {
          if (wasDraggingRef.current) {
            return;
          }
          if (isThrown) {
            safeStorage.setItem('tabletop_is_thrown', 'false');
            safeStorage.setItem('tabletop_app_opacity', '100');
            window.dispatchEvent(new Event('tabletop-state-update'));
          } else {
            setIsOpen(true);
          }
        }}
        className="w-full mt-1.5 cursor-pointer flex flex-col items-center justify-center relative rounded overflow-visible transition-[border-color,box-shadow,background-color] duration-300 bg-stone-950/40 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_20px_rgba(234,179,8,0.12)] hover:shadow-[0_0_25px_rgba(234,179,8,0.22)]"
        style={{ height: '74%', marginBottom: '14%' }}
      >
        {activeMap?.imageUrl && !isThrown ? (
          <motion.div 
            ref={dragRef}
            key={`${activeMap.id}-draggable`}
            drag
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ 
              scale: 1.15, 
              zIndex: 99999,
              cursor: 'grabbing',
              boxShadow: '0 25px 60px -15px rgba(234,179,8,0.65), 0 0 35px 6px rgba(234,179,8,0.4)',
              opacity: 0.95
            }}
            onClick={(e) => {
              if (wasDraggingRef.current) {
                e.stopPropagation();
              }
            }}
            onDragStart={() => {
              wasDraggingRef.current = true;
              window.dispatchEvent(new Event('tabletop-drag-start'));
            }}
            onDragEnd={(e, info) => {
              window.dispatchEvent(new Event('tabletop-drag-end'));
              const offset = Math.hypot(info.offset.x, info.offset.y);
              const velocity = Math.hypot(info.velocity.x, info.velocity.y);
              if (offset > 15 || velocity > 40) {
                // Instantly hide the element visually so it literally cannot snap or fly back
                if (dragRef.current) {
                  dragRef.current.style.display = 'none';
                  dragRef.current.style.opacity = '0';
                  dragRef.current.style.visibility = 'hidden';
                }
                safeStorage.setItem('tabletop_drop_pixel_x', info.point.x.toString());
                safeStorage.setItem('tabletop_drop_pixel_y', info.point.y.toString());
                safeStorage.setItem('tabletop_is_thrown', 'true');
                if (activeMap) {
                  safeStorage.setItem('tabletop_active_map_imageUrl', activeMap.imageUrl || '');
                  safeStorage.setItem('tabletop_active_map_name', activeMap.name || '');
                  safeStorage.setItem('tabletop_active_map_gridSize', gridSize.toString());
                  safeStorage.setItem('tabletop_active_map_gridOpacity', gridOpacity.toString());
                  safeStorage.setItem('tabletop_active_map_gridOffsetX', gridOffsetX.toString());
                  safeStorage.setItem('tabletop_active_map_gridOffsetY', gridOffsetY.toString());
                }
                window.dispatchEvent(new Event('tabletop-state-update'));
              }
              setTimeout(() => {
                wasDraggingRef.current = false;
              }, 150);
            }}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing flex flex-col items-center justify-center rounded overflow-hidden"
          >
            {(() => {
              // Determine centering dynamically:
              // (01) the bottom center (if there is no character token)
              // (02) the character token (if there is one).
              const hasTokenOnMap = safeStorage.getItem('tabletop_no_token') !== 'true';
              const xPct = hasTokenOnMap ? (avatarPos.x / 2400) * 100 : 50;
              const yPct = hasTokenOnMap ? (avatarPos.y / 2400) * 100 : 100;

              return (
                <>
                  <img 
                    src={activeMap.imageUrl} 
                    alt={activeMap.name} 
                    className="absolute inset-0 w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      objectPosition: `${xPct}% ${yPct}%`
                    }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Visual Grid cover */}
                  <div className="absolute inset-0 opacity-25 pointer-events-none mix-blend-screen bg-transparent">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="triggerGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                          <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#triggerGrid)" />
                    </svg>
                  </div>
                  {/* Edge vignette instead of dark fill gradient for gorgeous aesthetics */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/60 z-10 pointer-events-none" />

                  {/* Highly polished wizard character token indicator centered precisely on the card */}
                  {hasTokenOnMap && (
                    <div className="absolute z-20 w-8 h-8 rounded-full bg-stone-950/90 border-2 border-amber-400/90 shadow-[0_0_12px_rgba(234,179,8,0.75)] flex items-center justify-center animate-pulse pointer-events-none">
                      <span className="text-[14px] select-none leading-none">🧙‍♂️</span>
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        ) : (
          <div className="absolute inset-0 opacity-[0.24] hover:opacity-45 transition-all pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 12 0 L 0 0 0 12" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />
            </svg>
          </div>
        )}
      </div>

      {/* ==========================================
          PORTAL OVERLAY (Rendered directly in viewport)
          ========================================== */}

      {isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-[2vw] overflow-hidden select-none"
          style={{ background: 'radial-gradient(circle at 50% 30%, rgba(9, 10, 22, 0.88) 0%, rgba(3, 4, 10, 0.96) 100%)', backdropFilter: 'blur(8px)' }}
        >
          <div className="w-full h-full rounded border border-white/10 flex flex-col bg-stone-950/40 relative shadow-[0_0_35px_rgba(0,0,0,0.8)] overflow-hidden">
            
            <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-stone-950/60 z-30">
              <div className="flex items-center gap-2">
                <Compass size={14} className="text-amber-500 animate-spin" style={{ animationDuration: '45s' }} />
                <span className="font-serif text-[11px] tracking-[0.3em] uppercase text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  {t("TABLETOP INTEL & BATTLEMAP VIEWPORT")}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {activeMap && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/5 border border-amber-500/10 text-amber-400 font-mono text-[9px] tracking-widest uppercase">
                    <Grid size={10} />
                    {t("Active Grid")}: {gridSize}px
                  </div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:text-white text-stone-400 bg-white/5 hover:bg-white/10 rounded transition-all cursor-pointer border border-white/5 hover:border-white/20 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full flex overflow-hidden relative">
              
              {sidebarCollapsed && (
                <button 
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand Sidebar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-24 rounded-r border-y border-r border-[#ffe066]/20 bg-stone-950/80 hover:bg-stone-900 flex items-center justify-center text-amber-400 cursor-pointer z-40 hover:text-white transition-all shadow-lg"
                >
                  <ChevronRight size={13} strokeWidth={3} />
                </button>
              )}

              <div 
                className={`flex flex-col h-full border-r border-white/10 bg-stone-950/60 backdrop-blur-md transition-all duration-300 z-20 ${
                  sidebarCollapsed ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'w-64 opacity-100'
                }`}
              >
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <span className="font-serif text-[9px] tracking-[0.22em] text-amber-500/90 uppercase font-black">
                    {t("Campaign Map Index")}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCreateFolder}
                      title={t("Create Subfolder")}
                      className="p-1 hover:text-white text-stone-400 bg-white/5 hover:bg-white/10 border border-white/15 rounded cursor-pointer transition-all"
                    >
                      <FolderPlus size={11.5} />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      title={t("Add Custom Map")}
                      className="p-1 hover:text-white text-stone-400 bg-white/5 hover:bg-white/10 border border-white/15 rounded cursor-pointer transition-all"
                    >
                      <Plus size={11.5} />
                    </button>
                    <button 
                      onClick={() => setSidebarCollapsed(true)}
                      title={t("Collapse Sidebar")}
                      className="p-1 hover:text-white text-stone-400 bg-white/5 hover:bg-white/10 border border-white/15 rounded cursor-pointer transition-all"
                    >
                      <ChevronRight className="rotate-180" size={11.5} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-1.5 py-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                  {tree.length === 0 ? (
                    <div className="text-center py-10 px-4 text-stone-500 text-[10px] italic">
                      {t("No maps found. Select / drag maps to build campaign index.")}
                    </div>
                  ) : (
                    tree.map(item => renderTreeNode(item, 0))
                  )}
                </div>

                {/* Drop Zone Input */}
                <div className="p-3 border-t border-white/10 bg-stone-950/40">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    accept="image/*"
                    className="hidden" 
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOverRoot}
                    onDrop={handleDropFilesOnZone}
                    className="border border-dashed border-white/10 hover:border-amber-500/30 bg-white/0 hover:bg-amber-500/[0.02] p-3 rounded text-center cursor-pointer transition-all flex flex-col items-center justify-center group/uploader"
                  >
                    <UploadCloud size={16} className="text-stone-400 group-hover/uploader:text-amber-400 group-hover/uploader:scale-105 transition-all mb-1" />
                    <span className="font-serif text-[8px] tracking-[0.16em] uppercase text-stone-300 font-bold">
                      {t("Add Battlemap Image")}
                    </span>
                    <span className="text-[7px] text-stone-500 mt-0.5 font-sans">
                      {t("Select / Drop Images Here")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Viewport content */}
              <div 
                ref={viewerRef}
                onMouseDown={handleViewerMouseDown}
                onMouseMove={handleViewerMouseMove}
                onMouseUp={handleViewerMouseUp}
                onMouseLeave={handleViewerMouseUp}
                onWheel={handleViewerWheel}
                className="flex-1 h-full relative overflow-hidden bg-stone-950 select-none cursor-grab active:cursor-grabbing z-10 flex items-center justify-center"
              >
                {activeMap ? (
                  <div
                    className="absolute transition-transform duration-75 origin-center pointer-events-none"
                    style={{
                      transform: `translate3d(${offsetX}px, ${offsetY}px, 0px) scale(${scale})`,
                      width: '100%',
                      height: '100%',
                      maxWidth: '1200px',
                      maxHeight: '1200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div className="relative inline-block max-w-full max-h-full">
                      <img 
                        src={activeMap.imageUrl} 
                        alt={activeMap.name} 
                        className="block max-w-full max-h-full rounded border border-white/10 shadow-2xl select-none"
                        draggable="false"
                        referrerPolicy="no-referrer"
                      />

                      {/* Coordinate Grid line overlays */}
                      <div 
                        className="absolute inset-0 pointer-events-none mix-blend-screen overflow-hidden rounded"
                        style={{ opacity: gridOpacity }}
                      >
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <g id="gridTranslate">
                            <defs>
                              <pattern id="battleGrid" x={gridOffsetX} y={gridOffsetY} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                                <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="white" strokeWidth="0.75" opacity="0.32" />
                                <circle cx="0" cy="0" r="1.5" fill="white" opacity="0.75" />
                              </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#battleGrid)" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <Compass size={40} className="text-stone-500/40 mb-3 animate-spin" style={{ animationDuration: '60s' }} />
                    <h3 className="font-serif text-[11px] tracking-[0.25em] text-stone-300 uppercase font-bold mb-1">
                      {t("NO MAPS ACTIVATED")}
                    </h3>
                    <p className="font-sans text-[9px] text-stone-500 max-w-xs leading-relaxed">
                      {t("Select an existing battle campaign map from the directory tree sidebar, or import your own image to instantiate coordinates.")}
                    </p>
                  </div>
                )}

                <div className="absolute top-3 right-3 flex items-center gap-2 z-40">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-stone-950/80 border border-white/10 text-stone-400 text-[8px] font-sans">
                    <span className="px-1 py-0.5 rounded bg-white/10 font-mono font-bold">{t("Wheel")}</span> {t("Scale")}
                    <span className="w-1 h-3 border-l border-white/20 mx-0.5" />
                    <span className="px-1 py-0.5 rounded bg-white/10 font-mono font-bold">{t("Drag")}</span> {t("Scroll Map")}
                  </div>

                  <button 
                    onClick={resetPanAndZoom}
                    title={t("Recenter Camera")}
                    className="px-2.5 py-1 text-amber-500 hover:text-white bg-stone-950/80 hover:bg-stone-900 border border-white/10 hover:border-amber-400/30 rounded font-serif text-[8.5px] uppercase font-bold tracking-widest flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RefreshCw size={11} />
                    {t("Recenter View")}
                  </button>
                </div>

                {/* Decorative border anchors */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/20 pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/20 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/20 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/20 pointer-events-none" />

                {/* Deletion Overlay dialog popup */}
                {deleteConfirmId && (
                  <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="p-6 border border-red-500/30 bg-stone-900/90 rounded-md max-w-xs shadow-[0_0_25px_rgba(239,68,68,0.18)] text-center relative">
                      <h3 className="font-serif text-[11px] tracking-[0.2em] text-red-400 uppercase font-black mb-1.5">
                        {t("DESTROY MAP RECORD?")}
                      </h3>
                      <p className="font-sans text-[9.5px] text-stone-300 leading-relaxed mb-4">
                        {t("Are you sure you want to delete")} <span className="text-white font-bold font-mono">"{deleteConfirmName}"</span>? {t("This will permanently de-link this map asset.")}
                      </p>
                      
                      <div className="flex gap-2.5 justify-center">
                        <button
                          onClick={() => {
                            const res = removeNodeFromTree(tree, deleteConfirmId);
                            setTree(res.newItems);
                            if (activeMapId === deleteConfirmId) {
                              setActiveMapId(null);
                            }
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1 bg-red-950/40 hover:bg-red-900 border border-red-500/20 text-red-200 hover:text-white text-[9px] font-serif uppercase tracking-widest rounded cursor-pointer transition-all font-black"
                        >
                          {t("Delete Mapping")}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[9px] font-serif uppercase tracking-widest rounded cursor-pointer transition-all font-black"
                        >
                          {t("Cancel")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Downward control footer panel */}
            <div className="border-t border-white/10 bg-stone-950/90 flex flex-col sm:flex-row items-center justify-between px-4 py-1.5 gap-2 z-30 select-none">
              <div className="flex items-center gap-2.5 shrink-0 max-w-full sm:max-w-xs md:max-w-md overflow-hidden">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Sliders size={12} className="text-amber-500/80" />
                  <span className="font-serif text-[8.5px] tracking-[0.15em] uppercase text-stone-300 font-bold">
                    {t("Grid Config")}
                  </span>
                </div>
                {aiReasoning && (
                  <div className="text-[7.5px] text-[#ffe066]/80 font-mono italic max-w-xs md:max-w-md truncate border-l border-white/15 pl-2" title={aiReasoning}>
                    🧐 {t("AI")}: {aiReasoning}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1.5 flex-1 max-w-4xl w-full">
                
                {/* Size adjustment */}
                <div className="flex flex-col gap-0.5 w-[110px] sm:w-[120px] md:w-[140px]">
                  <div className="flex items-center justify-between text-[7px] font-mono text-stone-400 uppercase tracking-widest">
                    <span>{t("Size")}</span>
                    <span className="text-amber-400 font-bold">{gridSize}px</span>
                  </div>
                  <input 
                    type="range"
                    min="2"
                    max="120"
                    disabled={!activeMapId}
                    value={gridSize}
                    onChange={(e) => handleGridSizeChange(parseInt(e.target.value, 10))}
                    className="w-full h-1 accent-amber-500 hover:accent-amber-400 bg-stone-800 rounded outline-none cursor-pointer disabled:opacity-25"
                  />
                </div>

                {/* Opacity adjustment */}
                <div className="flex flex-col gap-0.5 w-[110px] sm:w-[120px] md:w-[140px]">
                  <div className="flex items-center justify-between text-[7px] font-mono text-stone-400 uppercase tracking-widest">
                    <span>{t("Opacity")}</span>
                    <span className="text-amber-400 font-bold">{Math.round(gridOpacity * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    disabled={!activeMapId}
                    value={Math.round(gridOpacity * 100)}
                    onChange={(e) => handleGridOpacityChange(parseFloat(e.target.value) / 100)}
                    className="w-full h-1 accent-amber-500 hover:accent-amber-400 bg-stone-800 rounded outline-none cursor-pointer disabled:opacity-25"
                  />
                </div>

                {/* X-Offset Adjustment */}
                <div className="flex flex-col gap-0.5 w-[110px] sm:w-[120px] md:w-[140px]">
                  <div className="flex items-center justify-between text-[7px] font-mono text-stone-400 uppercase tracking-widest">
                    <span>{t("X-Align")}</span>
                    <span className="text-amber-400 font-bold">{gridOffsetX}px</span>
                  </div>
                  <input 
                    type="range"
                    min="-120"
                    max="120"
                    disabled={!activeMapId}
                    value={gridOffsetX}
                    onChange={(e) => handleGridOffsetXChange(parseInt(e.target.value, 10))}
                    className="w-full h-1 accent-amber-500 hover:accent-amber-400 bg-stone-800 rounded outline-none cursor-pointer disabled:opacity-25"
                  />
                </div>

                {/* Y-Offset Adjustment */}
                <div className="flex flex-col gap-0.5 w-[110px] sm:w-[120px] md:w-[140px]">
                  <div className="flex items-center justify-between text-[7px] font-mono text-stone-400 uppercase tracking-widest">
                    <span>{t("Y-Align")}</span>
                    <span className="text-amber-400 font-bold">{gridOffsetY}px</span>
                  </div>
                  <input 
                    type="range"
                    min="-120"
                    max="120"
                    disabled={!activeMapId}
                    value={gridOffsetY}
                    onChange={(e) => handleGridOffsetYChange(parseInt(e.target.value, 10))}
                    className="w-full h-1 accent-amber-500 hover:accent-amber-400 bg-stone-800 rounded outline-none cursor-pointer disabled:opacity-25"
                  />
                </div>

                {/* AI Alignment Trigger Button */}
                <button
                  disabled={!activeMapId || isAnalyzing}
                  onClick={() => activeMap && handleAIAutoSetup(activeMap)}
                  className={`h-7 px-3 rounded flex items-center justify-center gap-1.5 transition-all text-[8.5px] uppercase font-bold tracking-wider font-serif cursor-pointer shrink-0 select-none
                    ${isAnalyzing 
                      ? "bg-amber-950/20 border border-amber-500/20 text-amber-500/60 animate-pulse pointer-events-none" 
                      : "bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/30 hover:border-amber-400/50 text-amber-400 hover:text-white shadow-[0_0_8px_rgba(234,179,8,0.1)] hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                    }`}
                >
                  <Sparkles size={11} className={isAnalyzing ? "animate-spin" : ""} />
                  {isAnalyzing ? t("Analyzing Map...") : t("AI Auto-Grid")}
                </button>

              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
