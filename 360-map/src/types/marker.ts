export type BuildingCategory =
  | 'academic'
  | 'auditorium'
  | 'stage_complex'
  | 'green_room'
  | 'outdoor'
  | 'administrative'
  | 'bike_parking'
  | 'car_parking'
  | 'vip_parking'
  | 'commercial'
  | 'gate'
  | string

export interface CampusStage {
  stageNumber?: number | string // Optional: number (1, 2) or text (e.g. "Main") or omit for unnumbered stages
  name: string
  floor?: string // e.g. "Ground Floor", "1st Floor", "3rd Floor", etc.
  category?: string
  tags?: string[]
}

export interface CampusBuilding {
  id: string
  name: string
  stageBadgeLabel?: string // Primary festival showcase label (e.g. "Stages 15 to 28", "Main Stage", "Green Room")
  shortName?: string // Concise label for mobile and dense zoom-out views
  category: BuildingCategory
  pitch: number // spherical coordinate degrees
  yaw: number // spherical coordinate degrees
  description?: string
  stages: CampusStage[]
}

// Alias for backwards compatibility if needed
export type CampusMarker = CampusBuilding
export type MarkerCategory = BuildingCategory

export interface CategoryDetail {
  label: string
  color: string
  badgeClass: string
  iconSvg: string
}

export const CATEGORY_CONFIG: Record<string, CategoryDetail> = {
  academic: {
    label: 'Academic Block',
    color: '#6366f1',
    badgeClass: 'cat-academic',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16"/><path d="M4 10h16"/><path d="M6 18h4"/><path d="M14 18h4"/><path d="M6 14h4"/><path d="M14 14h4"/><path d="M2 10l10-7 10 7"/></svg>',
  },
  auditorium: {
    label: 'Auditorium',
    color: '#a855f7',
    badgeClass: 'cat-auditorium',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h6"/><path d="M9 14h6"/><path d="M9 18h6"/></svg>',
  },
  stage_complex: {
    label: 'Stage Complex',
    color: '#f59e0b',
    badgeClass: 'cat-stage',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  },
  green_room: {
    label: 'Green Room',
    color: '#10b981',
    badgeClass: 'cat-greenroom',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  },
  outdoor: {
    label: 'Outdoor / Ground',
    color: '#10b981',
    badgeClass: 'cat-outdoor',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  },
  administrative: {
    label: 'Hostel / Admin',
    color: '#0284c7',
    badgeClass: 'cat-admin',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="6" y1="18" x2="6" y2="10"/><line x1="10" y1="18" x2="10" y2="10"/><line x1="14" y1="18" x2="14" y2="10"/><line x1="18" y1="18" x2="18" y2="10"/><polygon points="12 3 2 9 22 9"/></svg>',
  },
  bike_parking: {
    label: 'Bike Parking',
    color: '#06b6d4',
    badgeClass: 'cat-parking',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>',
  },
  car_parking: {
    label: 'Car Parking',
    color: '#3b82f6',
    badgeClass: 'cat-parking',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>',
  },
  vip_parking: {
    label: 'VIP Parking',
    color: '#f43f5e',
    badgeClass: 'cat-vip',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  },
  commercial: {
    label: 'Stall / Canteen',
    color: '#ea580c',
    badgeClass: 'cat-stall',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  },
  gate: {
    label: 'Gate / Entrance',
    color: '#64748b',
    badgeClass: 'cat-gate',
    iconSvg:
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  },
}

const DEFAULT_CATEGORY_DETAIL: CategoryDetail = {
  label: 'Location',
  color: '#3b82f6',
  badgeClass: 'cat-default',
  iconSvg:
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
}

export function getCategoryDetails(category: string): CategoryDetail {
  return CATEGORY_CONFIG[category] || {
    ...DEFAULT_CATEGORY_DETAIL,
    label: category || 'Building',
  }
}
