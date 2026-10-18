import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Safe fallback storage dictionary in case iframe context blocks localStorage (SecurityError)
const memoryStorage: Record<string, string> = {};

// Active character namespacing helpers
export function getNamespacedKey(key: string): string {
  if (key.startsWith('vtt_')) {
    if (key.startsWith('vtt_char_')) {
      return key; // Already namespaced
    }
    let activeCharId: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        activeCharId = window.localStorage.getItem('setting_active_character_id');
      }
    } catch (e) {}
    if (!activeCharId) {
      activeCharId = memoryStorage['setting_active_character_id'] || null;
    }
    if (activeCharId && activeCharId !== 'default' && activeCharId !== 'null' && activeCharId !== '') {
      return `vtt_char_${activeCharId}_${key}`;
    }
  }
  return key;
}

export function deleteCharacterStorage(charId: string) {
  const prefix = `vtt_char_${charId}_`;
  
  // Clean memory storage
  Object.keys(memoryStorage).forEach((k) => {
    if (k.startsWith(prefix)) {
      delete memoryStorage[k];
    }
  });

  // Clean window.localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
  } catch (e) {}

  // Trigger cloud sync to overwrite and remove them from cloud payload
  const user = auth.currentUser;
  if (user) {
    debouncedCloudSave(user.uid, 'character');
  }
}

// Keep track of keys loaded so we don't accidentally overwrite newer cloud data with stale in-memory local data on first auth load
let cloudDataLoaded = false;

// Filter mapping setting keys to document types
function getDocTypeForKey(key: string): 'character' | 'preferences' | 'tabletop' | null {
  if (key.startsWith('vtt_')) {
    return 'character';
  } else if (key.startsWith('setting_')) {
    return 'preferences';
  } else if (key.startsWith('tabletop_')) {
    return 'tabletop';
  }
  return null;
}

function cleanLargeDataUrls(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && obj.length > 51200) { // 50KB limit to preserve document transaction limits
      return "(image_stored_locally_only)";
    }
    if (obj.length > 153600) { // 150KB cutoff to prevent massive blobs
      return "(payload_truncated_locally_stored_only)";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanLargeDataUrls);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      cleaned[key] = cleanLargeDataUrls(val);
    }
    return cleaned;
  }
  return obj;
}

function restoreLargeDataUrls(cloudObj: any, localObj: any): any {
  if (cloudObj === null || cloudObj === undefined) return cloudObj;
  
  if (typeof cloudObj === 'string') {
    if ((cloudObj.includes('(image_stored_locally_only)') || cloudObj.includes('(payload_truncated_locally_stored_only)')) && typeof localObj === 'string') {
      return localObj;
    }
    return cloudObj;
  }
  
  if (Array.isArray(cloudObj)) {
    return cloudObj.map((item, index) => {
      const localItem = Array.isArray(localObj) ? localObj[index] : null;
      return restoreLargeDataUrls(item, localItem);
    });
  }
  
  if (typeof cloudObj === 'object') {
    const restored: Record<string, any> = {};
    for (const [key, val] of Object.entries(cloudObj)) {
      const localVal = (localObj && typeof localObj === 'object') ? localObj[key] : null;
      restored[key] = restoreLargeDataUrls(val, localVal);
    }
    return restored;
  }
  
  return cloudObj;
}

function mergeRestoredValue(key: string, cloudVal: any, localValStr: string | null): string {
  if (localValStr === null) {
    return typeof cloudVal === 'string' ? cloudVal : JSON.stringify(cloudVal);
  }
  
  if (typeof cloudVal === 'string') {
    if ((cloudVal.includes('(image_stored_locally_only)') || cloudVal.includes('(payload_truncated_locally_stored_only)')) && localValStr.startsWith('data:')) {
      return localValStr;
    }
    return cloudVal;
  }

  try {
    const localObj = JSON.parse(localValStr);
    const restoredObj = restoreLargeDataUrls(cloudVal, localObj);
    return JSON.stringify(restoredObj);
  } catch (e) {
    return typeof cloudVal === 'string' ? cloudVal : JSON.stringify(cloudVal);
  }
}

// Function to collect and sync all keys of a specific type from local memory/localStorage to Firestore
async function syncCurrentTypeToCloud(userId: string, type: 'character' | 'preferences' | 'tabletop') {
  const payload: Record<string, any> = {};
  const prefix = type === 'character' ? 'vtt_' : type === 'preferences' ? 'setting_' : 'tabletop_';

  // 1. Gather keys from in-memory fallback
  Object.entries(memoryStorage).forEach(([k, v]) => {
    if (k.startsWith(prefix)) {
      try {
        payload[k] = JSON.parse(v);
      } catch {
        payload[k] = v;
      }
    }
  });

  // 2. Gather keys from localStorage if available
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const v = window.localStorage.getItem(k);
          if (v !== null) {
            try {
              payload[k] = JSON.parse(v);
            } catch {
              payload[k] = v;
            }
          }
        }
      }
    }
  } catch (e) {}

  // If payload is empty, provide some default values for characters so Firestore stays populated
  if (Object.keys(payload).length === 0) {
    if (type === 'character') {
      payload['vtt_healing_potions'] = 3;
      payload['vtt_elixir_life'] = 1;
      payload['vtt_star_dust'] = 2;
    } else {
      return; // Do not write completely empty documents for empty sections
    }
  }

  const docRef = doc(db, 'users', userId, 'settings', type);
  try {
    const cleanedPayload = cleanLargeDataUrls(payload);
    await setDoc(docRef, {
      userId,
      type,
      payload: cleanedPayload,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[Cloud Save Failed] category: ${type}`, err);
  }
}

// Debounce map for writes to avoid hammering Firebase
const debounceTimers: Record<string, any> = {};

function debouncedCloudSave(userId: string, type: 'character' | 'preferences' | 'tabletop') {
  if (debounceTimers[type]) {
    clearTimeout(debounceTimers[type]);
  }
  debounceTimers[type] = setTimeout(() => {
    delete debounceTimers[type];
    syncCurrentTypeToCloud(userId, type).catch(console.error);
  }, 1200); // 1.2s debounce
}

export const safeStorage = {
  getItem(key: string): string | null {
    const nsKey = getNamespacedKey(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(nsKey);
      }
    } catch (e) {
      // SecurityError or undefined
    }
    return memoryStorage[nsKey] !== undefined ? memoryStorage[nsKey] : null;
  },

  setItem(key: string, value: string): void {
    const nsKey = getNamespacedKey(key);
    // 1. Save to fallbacks/local state
    memoryStorage[nsKey] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(nsKey, value);
      }
    } catch (e) {}

    // 2. Sync to Firestore in real-time if logged in
    const user = auth.currentUser;
    if (user) {
      const type = getDocTypeForKey(nsKey);
      if (type) {
        debouncedCloudSave(user.uid, type);
      }
    }
  },

  removeItem(key: string): void {
    const nsKey = getNamespacedKey(key);
    delete memoryStorage[nsKey];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(nsKey);
      }
    } catch (e) {}

    const user = auth.currentUser;
    if (user) {
      const type = getDocTypeForKey(nsKey);
      if (type) {
        debouncedCloudSave(user.uid, type);
      }
    }
  }
};

// Listen globally to authentication actions
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const docIds: ('character' | 'preferences' | 'tabletop')[] = ['character', 'preferences', 'tabletop'];
      
      for (const docId of docIds) {
        const docRef = doc(db, 'users', user.uid, 'settings', docId);
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data && data.payload) {
              Object.entries(data.payload).forEach(([k, v]) => {
                const localValStr = safeStorage.getItem(k);
                const valStr = mergeRestoredValue(k, v, localValStr);
                
                memoryStorage[k] = valStr;
                try {
                  if (window.localStorage) {
                    window.localStorage.setItem(k, valStr);
                  }
                } catch (e) {}
              });
            }
          } else {
            // First time login - upload their current guest progress as initial cloud data
            await syncCurrentTypeToCloud(user.uid, docId);
          }
        } catch (err) {
          console.error(`[Firebase Settings Restore Error] document: ${docId}`, err);
        }
      }
      
      cloudDataLoaded = true;
      // Trigger a system-wide re-render
      window.dispatchEvent(new Event('tabletop-state-update'));
      window.dispatchEvent(new Event('storage'));
    } else {
      // Clear tracking state on logout
      cloudDataLoaded = false;
    }
  });
}
