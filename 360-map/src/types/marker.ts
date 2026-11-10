export type BuildingCategory =
  | 'academic'
  | 'auditorium'
  | 'stage_complex'
  | 'outdoor'
  | 'administrative'
  | 'bike_parking'
  | 'car_parking'
  | 'vip_parking'
  | 'commercial'
  | 'gate'
  | string

export interface CampusStage {
  stageNumber: number
  name: string
  floor?: string // e.g. "Ground Floor", "1st Floor", "3rd Floor", etc.
}

export interface CampusBuilding {
  id: string
  name: string
  category: BuildingCategory
  pitch: number // spherical coordinate degrees
  yaw: number // spherical coordinate degrees
  description?: string
  stages: CampusStage[]
}

// Alias for backwards compatibility if needed
export type CampusMarker = CampusBuilding
export type MarkerCategory = BuildingCategory

export const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; badgeClass: string }
> = {
  academic: { label: 'Academic Block', icon: '🏢', badgeClass: 'cat-academic' },
  auditorium: { label: 'Auditorium', icon: '🎭', badgeClass: 'cat-auditorium' },
  stage_complex: { label: 'Stage Complex', icon: '🎪', badgeClass: 'cat-stage' },
  outdoor: { label: 'Outdoor / Ground', icon: '🌿', badgeClass: 'cat-outdoor' },
  administrative: { label: 'Hostel / Admin', icon: '🏛️', badgeClass: 'cat-admin' },
  bike_parking: { label: 'Bike Parking', icon: '🏍️', badgeClass: 'cat-parking' },
  car_parking: { label: 'Car Parking', icon: '🚗', badgeClass: 'cat-parking' },
  vip_parking: { label: 'VIP Parking', icon: '⭐', badgeClass: 'cat-vip' },
  commercial: { label: 'Stall / Canteen', icon: '🍔', badgeClass: 'cat-stall' },
  gate: { label: 'Gate / Entrance', icon: '🚪', badgeClass: 'cat-gate' },
}

export function getCategoryDetails(category: string) {
  return (
    CATEGORY_CONFIG[category] || {
      label: category || 'Building',
      icon: '📍',
      badgeClass: 'cat-default',
    }
  )
}
