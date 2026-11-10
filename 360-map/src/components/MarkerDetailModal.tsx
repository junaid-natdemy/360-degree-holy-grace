import React from 'react'
import type { CampusMarker } from '../types/marker'

interface MarkerDetailModalProps {
  marker: CampusMarker | null
  onClose: () => void
  onEdit?: (marker: CampusMarker) => void
  onFocus?: (marker: CampusMarker) => void
}

export const MarkerDetailModal: React.FC<MarkerDetailModalProps> = ({
  marker,
  onClose,
  onEdit,
  onFocus,
}) => {
  if (!marker) return null

  const getCategoryBadge = () => {
    switch (marker.category) {
      case 'building_with_stages':
        return { label: '🏢 Building with Stages', className: 'marker-badge--building-stages' }
      case 'building':
        return { label: '🏛️ Campus Building', className: 'marker-badge--building' }
      case 'area_with_stages':
        return { label: '🎪 Outdoor Area with Stages', className: 'marker-badge--area-stages' }
      case 'area':
        return { label: '📍 Campus Area & Facilities', className: 'marker-badge--area' }
    }
  }

  const badge = getCategoryBadge()

  return (
    <div className="marker-modal-backdrop" onClick={onClose}>
      <div className="marker-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="marker-modal-header">
          <div className="marker-modal-title-row">
            <span className={`marker-category-pill ${badge.className}`}>{badge.label}</span>
            <button className="marker-modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="marker-modal-title">{marker.name}</h2>
          {marker.badgeLabel && (
            <span className="marker-modal-subbadge">{marker.badgeLabel}</span>
          )}
        </div>

        <div className="marker-modal-body">
          {marker.stages && marker.stages.length > 0 && (
            <div className="marker-modal-section">
              <h4 className="marker-modal-section-title">Hosted Stages:</h4>
              <div className="marker-stages-grid">
                {marker.stages.map((stg) => (
                  <div key={stg} className="marker-stage-card">
                    <span className="marker-stage-num">Stage {String(stg).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {marker.floorInfo && (
            <div className="marker-modal-section">
              <h4 className="marker-modal-section-title">Floor & Location Details:</h4>
              <p className="marker-modal-text pre-wrap">{marker.floorInfo}</p>
            </div>
          )}

          {marker.description && (
            <div className="marker-modal-section">
              <h4 className="marker-modal-section-title">About this Venue:</h4>
              <p className="marker-modal-text">{marker.description}</p>
            </div>
          )}

          <div className="marker-modal-coords">
            <span>Coordinates: Pitch {marker.pitch.toFixed(1)}° · Yaw {marker.yaw.toFixed(1)}°</span>
          </div>
        </div>

        <div className="marker-modal-actions">
          {onFocus && (
            <button className="btn-primary" onClick={() => onFocus(marker)}>
              🎯 Center in 360 View
            </button>
          )}
          {onEdit && (
            <button className="btn-secondary" onClick={() => onEdit(marker)}>
              ✏️ Edit Marker
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

