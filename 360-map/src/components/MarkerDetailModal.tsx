import React from 'react'
import { type CampusBuilding, getCategoryDetails } from '../types/marker'

interface MarkerDetailModalProps {
  marker: CampusBuilding | null
  onClose: () => void
  onFocus?: (marker: CampusBuilding) => void
}

export const MarkerDetailModal: React.FC<MarkerDetailModalProps> = ({
  marker,
  onClose,
}) => {
  if (!marker) return null

  // User requirement: NO modal for parking, entrance, stalls, no-stage buildings, exit
  const isExcludedCategory =
    marker.category === 'bike_parking' ||
    marker.category === 'car_parking' ||
    marker.category === 'vip_parking' ||
    marker.category === 'gate' ||
    marker.category === 'commercial'

  const stages = marker.stages || []
  const hasStages = stages.length > 0
  const isStageVenue =
    !isExcludedCategory &&
    (hasStages ||
      Boolean(marker.stageBadgeLabel) ||
      marker.category === 'green_room' ||
      marker.category === 'auditorium' ||
      marker.category === 'stage_complex')

  if (!isStageVenue) return null

  const catDetails = getCategoryDetails(marker.category)

  return (
    <div className="marker-modal-backdrop" onClick={onClose}>
      <div className="marker-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="marker-modal-header">
          <div className="marker-modal-top-bar">
            <span
              className="marker-modal-category-tag"
              style={{ '--tag-color': catDetails.color } as React.CSSProperties}
            >
              <span
                className="marker-modal-cat-icon"
                dangerouslySetInnerHTML={{ __html: catDetails.iconSvg }}
              />
              {isStageVenue ? 'Festival Stage Venue' : catDetails.label}
            </span>
            <button
              className="marker-modal-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <h2 className="marker-modal-title">{marker.name}</h2>

          {isStageVenue && (
            <div className="marker-modal-stage-banner">
              <span className="marker-modal-stage-pill">🎪 {marker.stageBadgeLabel}</span>
              {hasStages && (
                <span className="marker-modal-stage-count">
                  {stages.length} {stages.length === 1 ? 'Venue / Stage' : 'Competition Stages'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="marker-modal-body">
          {hasStages ? (
            <div className="marker-modal-stages-section">
              <div className="marker-modal-section-header">
                <span className="marker-modal-section-title">
                  {stages.length > 1 ? 'Hosted Stages & Rooms' : 'Stage Location'}
                </span>
                <span className="marker-modal-section-count">({stages.length})</span>
              </div>

              <div className="marker-stages-list">
                {stages.map((stg, i) => {
                  const isGreenRoom = stg.category === 'green_room' || /green room/i.test(stg.name)
                  const stageNumDisplay =
                    stg.stageNumber !== undefined && stg.stageNumber !== null
                      ? /^\d+$/.test(String(stg.stageNumber))
                        ? stg.stageNumber === 0
                          ? 'Main Stage'
                          : `Stage ${stg.stageNumber}`
                        : String(stg.stageNumber)
                      : isGreenRoom
                      ? 'Green Room'
                      : null

                  return (
                    <div
                      key={i}
                      className={`marker-stage-row ${isGreenRoom ? 'marker-stage-row--greenroom' : ''}`}
                    >
                      <div className="marker-stage-info-col">
                        {stageNumDisplay && (
                          <span
                            className={`marker-stage-badge ${isGreenRoom ? 'marker-stage-badge--greenroom' : ''}`}
                          >
                            {stageNumDisplay}
                          </span>
                        )}
                        <span className="marker-stage-title">{stg.name}</span>
                      </div>
                      {stg.floor && (
                        <span className="marker-stage-floor-tag">
                          📍 {stg.floor}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="marker-modal-empty-notice">
              <p>Campus facility located at Holy Grace Campus.</p>
            </div>
          )}
        </div>

        {/* Action / Dismiss */}
        <div className="marker-modal-footer">
          <button className="marker-modal-dismiss-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
