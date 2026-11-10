import React from 'react'
import { type CampusBuilding, getCategoryDetails } from '../types/marker'

interface MarkerDetailModalProps {
  marker: CampusBuilding | null
  onClose: () => void
  onEdit?: (marker: CampusBuilding) => void
  onFocus?: (marker: CampusBuilding) => void
}

export const MarkerDetailModal: React.FC<MarkerDetailModalProps> = ({
  marker,
  onClose,
  onEdit,
  onFocus,
}) => {
  if (!marker) return null

  const catDetails = getCategoryDetails(marker.category)
  const stages = marker.stages || []

  return (
    <div className="marker-modal-backdrop" onClick={onClose}>
      <div className="marker-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="marker-modal-header">
          <div className="marker-modal-title-row">
            <span className={`marker-category-pill ${catDetails.badgeClass}`}>
              {catDetails.icon} {catDetails.label}
            </span>
            <button className="marker-modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="marker-modal-title">{marker.name}</h2>
          {stages.length > 0 && (
            <span className="marker-modal-subbadge">
              Hosts {stages.length} {stages.length === 1 ? 'Competition Stage' : 'Competition Stages'}
            </span>
          )}
        </div>

        <div className="marker-modal-body">
          {stages.length > 0 && (
            <div className="marker-modal-section">
              <h4 className="marker-modal-section-title">Competition Stages:</h4>
              <div className="marker-stages-grid">
                {stages.map((stg, i) => (
                  <div key={i} className="marker-stage-card">
                    <div className="marker-stage-top-row">
                      {stg.stageNumber ? (
                        <span className="marker-stage-num">
                          {/^\d+$/.test(String(stg.stageNumber))
                            ? `Stage ${stg.stageNumber}`
                            : String(stg.stageNumber)}
                        </span>
                      ) : null}
                      <span className="marker-stage-name">{stg.name}</span>
                    </div>
                    {stg.floor && (
                      <span className="marker-stage-floor-badge">📍 {stg.floor}</span>
                    )}
                  </div>
                ))}
              </div>
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
              ✏️ Edit in Manager
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
