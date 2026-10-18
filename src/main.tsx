import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { safeStorage } from './storage';

// Global Sweep Function to hide or restore title tooltips based on hover_text setting
function sweepTitles() {
  const isHoverOn = safeStorage.getItem('setting_hover_text') === 'on';
  
  if (isHoverOn) {
    // Restore original titles from data-original-title
    const elements = document.querySelectorAll('[data-original-title]');
    elements.forEach((el) => {
      const original = el.getAttribute('data-original-title');
      if (original) {
        el.setAttribute('title', original);
      }
    });
  } else {
    // Suppress all active title attributes to prevent browser hover tooltips
    const elements = document.querySelectorAll('[title]');
    elements.forEach((el) => {
      const currentTitle = el.getAttribute('title');
      if (currentTitle) {
        el.setAttribute('data-original-title', currentTitle);
        el.removeAttribute('title');
      }
    });
  }
}

// Global Event Listener to suppress native browser hover text 'title' tooltips
// if the hover text setting is not explicitly enabled ('on'). We default to 'off'.
const handleHoverIntercept = (e: Event) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const closestWithTitle = target.closest('[title], [data-original-title]') as HTMLElement | null;
  if (closestWithTitle) {
    const originalTitle = closestWithTitle.getAttribute('data-original-title');
    const currentTitle = closestWithTitle.getAttribute('title');
    
    // Store original title if we haven't yet
    if (currentTitle && !originalTitle) {
      closestWithTitle.setAttribute('data-original-title', currentTitle);
    }

    const isHoverOn = safeStorage.getItem('setting_hover_text') === 'on';

    if (isHoverOn) {
      const stored = originalTitle || currentTitle;
      if (stored && closestWithTitle.getAttribute('title') !== stored) {
        closestWithTitle.setAttribute('title', stored);
      }
    } else {
      closestWithTitle.removeAttribute('title');
    }
  }
};

document.addEventListener('mouseover', handleHoverIntercept, { capture: true, passive: true });
document.addEventListener('mousemove', handleHoverIntercept, { capture: true, passive: true });

// Listen for storage / custom updates to perform global sweeps instantly
window.addEventListener('storage', sweepTitles);
window.addEventListener('tabletop-state-update', sweepTitles);

// Initial sweep when DOM is loaded
if (typeof document !== 'undefined') {
  sweepTitles();
  // Set up a tiny MutationObserver to scrub dynamic additions too when hover text is OFF
  const observer = new MutationObserver(() => {
    if (safeStorage.getItem('setting_hover_text') !== 'on') {
      sweepTitles();
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['title']
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

