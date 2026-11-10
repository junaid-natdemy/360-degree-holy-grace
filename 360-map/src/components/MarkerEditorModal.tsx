import React, { useState, useEffect } from 'react'
import type { CampusMarker, MarkerCategory } from '../types/marker'

interface MarkerEditorModalProps {
  marker: Partial<CampusMarker> | null
  isOpen: boolean
  onClose: () => void
  onSave: (marker: CampusMarker) => void
  onDelete?: (markerId: string) => void
}

export const MarkerEditorModal: React.FC<MarkerEditorModalProps> = ({
  marker,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(marker?.id)

  const [name, setName] = useState(marker?.name || '')
  const [category, setCategory] = useState<MarkerCategory>(
    marker?.category || 'building_with_stages'
  )
  const [stagesText, setStagesText] = useState(
    marker?.stages ? marker.stages.join(', ') : ''
  )
  const [floorInfo, setFloorInfo] = useState(marker?.floorInfo || '')
  const [description, setDescription] = useState(marker?.description || '')
  const [pitch, setPitch] = useState<number>(
    typeof marker?.pitch === 'number' ? marker.pitch : 0
  )
  const [yaw, setYaw] = useState<number>(
    typeof marker?.yaw === 'number' ? marker.yaw : 0
  )

  useEffect(() => {
    if (marker) {
      setName(marker.name || '')
      setCategory(marker.category || 'building_with_stages')
      setStagesText(marker.stages ? marker.stages.join(', ') : '')
      setFloorInfo(marker.floorInfo || '')
      setDescription(marker.description || '')
      setPitch(typeof marker.pitch === 'number' ? marker.pitch : 0)
      setYaw(typeof marker.yaw === 'number' ? marker.yaw : 0)
    }
  }, [marker])

  if (!isOpen || !marker) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    // Parse stage numbers
    const stages = stagesText
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    const updatedMarker: CampusMarker = {
      id: marker.id || `custom-${Date.now()}`,
      name: name.trim(),
      category,
      pitch: Number(pitch),
      yaw: Number(yaw),
      stages: (category === 'building_with_stages' || category === 'area_with_stages') ? stages : undefined,
      floorInfo: floorInfo.trim() || undefined,
      description: description.trim() || undefined,
      badgeLabel: (category === 'building_with_stages' || category === 'area_with_stages') && stages.length > 0
        ? `Stage${stages.length > 1 ? 's' : ''} ${stages.join(', ')}`
        : name.trim(),
    }

    onSave(updatedMarker)
    onClose()
  }

  return (
    <div className="marker-modal-backdrop" onClick={onClose}>
      <div className="marker-editor-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="marker-editor-header">
          <h3>{isEditing ? '✏️ Edit Campus Marker' : '📍 Mark New Campus Location'}</h3>
          <button className="marker-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="marker-editor-form">
          <div className="form-group">
            <label>Name of Building / Area:</label>
            <input
              type="text"
              required
              placeholder="e.g. Ephatha Block, Main Stage, VIP Parking"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Marker Category / Type:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MarkerCategory)}
            >
              <option value="building_with_stages">🏢 Building with Stages</option>
              <option value="building">🏛️ Building (No Stages)</option>
              <option value="area_with_stages">🎪 Area with Stages (Ground, Canopy, Outdoor)</option>
              <option value="area">📍 Area / Facility (Parking, Entrance, Green Room, Stalls)</option>
            </select>
          </div>

          {(category === 'building_with_stages' || category === 'area_with_stages') && (
            <div className="form-group">
              <label>Stage Numbers (comma separated):</label>
              <input
                type="text"
                placeholder="e.g. 1, 3, 4, 5"
                value={stagesText}
                onChange={(e) => setStagesText(e.target.value)}
              />
              <small className="form-hint">Type stage numbers separated by commas.</small>
            </div>
          )}

          <div className="form-group">
            <label>Floor & Room Details:</label>
            <textarea
              rows={2}
              placeholder="e.g. Stage 01 — 3rd floor (Auditorium), Stages 03–05 — 2nd floor"
              value={floorInfo}
              onChange={(e) => setFloorInfo(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description / Notes:</label>
            <textarea
              rows={2}
              placeholder="e.g. Main entrance, dressing room, official media room"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Pitch (°):</label>
              <input
                type="number"
                step="0.01"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Yaw (°):</label>
              <input
                type="number"
                step="0.01"
                value={yaw}
                onChange={(e) => setYaw(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="marker-editor-actions">
            {isEditing && onDelete && marker.id && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  if (confirm(`Delete marker "${name}"?`)) {
                    onDelete(marker.id!)
                    onClose()
                  }
                }}
              >
                🗑️ Delete
              </button>
            )}
            <div className="marker-editor-actions-right">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                💾 Save Marker
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

