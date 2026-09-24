# Appearance modes
Vortix supports Light, Dark and System appearance preferences. The selection is stored under `vortix-theme` in browser local storage. System mode follows `prefers-color-scheme` and updates when the operating-system preference changes. The bootstrap script in `app/layout.tsx` applies the selected theme before body rendering to avoid a visible colour flash.
