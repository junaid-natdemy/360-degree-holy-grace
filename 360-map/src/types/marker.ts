export type MarkerCategory =
  | 'building_with_stages'
  | 'building'
  | 'area_with_stages'
  | 'area'

export interface CampusMarker {
  id: string
  name: string
  category: MarkerCategory
  pitch: number // in degrees
  yaw: number // in degrees
  stages?: number[]
  floorInfo?: string
  description?: string
  badgeLabel?: string
}

