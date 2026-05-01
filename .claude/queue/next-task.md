# Next Task

## Task
Fix pin scaling on zoom for floor plan drawings. When users zoom in/out on level drawings, the penetration pins (markers) should scale correctly -- maintaining their proper positions relative to the drawing and remaining visually usable at all zoom levels. Pins currently use percentage-based coordinates (floorplan_x, floorplan_y on penetrations table) but their visual size/position may not adjust properly when the drawing is zoomed.

## Context
- Penetrations have floorplan_x and floorplan_y (percentage-based coordinates) and floorplan_label
- Level drawings: lib/services/level-drawings.ts, database table: level_drawings
- Penetrations service: lib/services/penetrations.ts
- Pin/drawing UI component: components/floor-plan-pin.tsx (FloorPlanPicker and FloorPlanViewer)
- Drawings are now in a dedicated Drawings tab: app/(dashboard)/jobs/[id]/drawings-tab.tsx
- Worker execution page also has drawing/pin functionality -- must fix there too if affected
- Customer portal drawing view -- must fix there too if affected
- Reference files: CLAUDE_REFERENCE/database-schema.md, CLAUDE_REFERENCE/design-rules.md

## Previous Run
2026-04-30: Completed "Dedicated Drawings tab" task. Created drawings-tab.tsx, added Drawings tab to job detail view, removed drawing code from Structure tab (building-structure.tsx). Commit: 72295fb.
