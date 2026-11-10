import React, { useState, useMemo } from 'react'
import type { CampusMarker, MarkerCategory } from '../types/marker'

interface MarkerFilterBarProps {
  markers: CampusMarker[]
  selectedCategory: MarkerCategory | 'all'
  onSelectCategory: (cat: MarkerCategory | 'all') => void
  onSelectMarker: (marker: CampusMarker) => void
  isMarkingMode: boolean
  onToggleMarkingMode: () => void
  onExportMarkers: () => void
}

export const MarkerFilterBar: React.FC<MarkerFilterBarProps> = ({
  markers,
  selectedCategory,
  onSelectCategory,
  onSelectMarker,
  isMarkingMode,
  onToggleMarkingMode,
  onExportMarkers,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenList, setIsOpenList] = useState(false)

  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      const matchesCategory =
        selectedCategory === 'all' || m.category === selectedCategory

      if (!matchesCategory) return false

      if (!searchQuery.trim()) return true

      const query = searchQuery.toLowerCase()
      const matchesName = m.name.toLowerCase().includes(query)
      const matchesDesc = m.description?.toLowerCase().includes(query)
      const matchesFloor = m.floorInfo?.toLowerCase().includes(query)
      const matchesStages = m.stages?.some(
        (s) =>
          `stage ${s}`.includes(query) ||
          String(s) === query.trim() ||
          String(s).padStart(2, '0') === query.trim()
      )

      return matchesName || matchesDesc || matchesFloor || matchesStages
    })
  }, [markers, selectedCategory, searchQuery])

  return (
    <div className="campus-filter-container">
      <div className="campus-filter-header">
        {/* Search Bar */}
        <div className="campus-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search building, stage (e.g. Stage 04), parking..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpenList(true)
            }}
            onFocus={() => setIsOpenList(true)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery('')
                setIsOpenList(false)
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Buttons: Marking Mode & Export */}
        <div className="campus-toolbar-actions">
          <button
            className={`btn-action ${isMarkingMode ? 'btn-action--active' : ''}`}
            onClick={onToggleMarkingMode}
            title={isMarkingMode ? 'Click on panorama to place a marker' : 'Turn on Marking Tool'}
          >
            {isMarkingMode ? '🎯 Marking: ON' : '✏️ Mark Campus'}
          </button>
          <button
            className="btn-action btn-action--secondary"
            onClick={onExportMarkers}
            title="Export custom markers as JSON"
          >
            📋 Export
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="campus-category-pills">
        <button
          className={`category-pill ${selectedCategory === 'all' ? 'category-pill--active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          All Locations ({markers.length})
        </button>
        <button
          className={`category-pill category-pill--building-stages ${
            selectedCategory === 'building_with_stages' ? 'category-pill--active' : ''
          }`}
          onClick={() => onSelectCategory('building_with_stages')}
        >
          🏢 Buildings with Stages (
          {markers.filter((m) => m.category === 'building_with_stages').length})
        </button>
        <button
          className={`category-pill category-pill--building ${
            selectedCategory === 'building' ? 'category-pill--active' : ''
          }`}
          onClick={() => onSelectCategory('building')}
        >
          🏛️ Buildings ({markers.filter((m) => m.category === 'building').length})
        </button>
        <button
          className={`category-pill category-pill--area-stages ${
            selectedCategory === 'area_with_stages' ? 'category-pill--active' : ''
          }`}
          onClick={() => onSelectCategory('area_with_stages')}
        >
          🎪 Areas with Stages (
          {markers.filter((m) => m.category === 'area_with_stages').length})
        </button>
        <button
          className={`category-pill category-pill--area ${
            selectedCategory === 'area' ? 'category-pill--active' : ''
          }`}
          onClick={() => onSelectCategory('area')}
        >
          📍 Areas & Parking ({markers.filter((m) => m.category === 'area').length})
        </button>
      </div>

      {/* Search Autocomplete / Quick Dropdown */}
      {isOpenList && searchQuery && (
        <div className="campus-search-results">
          {filteredMarkers.length === 0 ? (
            <div className="search-no-results">No locations found for "{searchQuery}"</div>
          ) : (
            filteredMarkers.map((m) => (
              <div
                key={m.id}
                className="search-result-item"
                onClick={() => {
                  onSelectMarker(m)
                  setIsOpenList(false)
                }}
              >
                <div className="search-result-info">
                  <span className="search-result-name">{m.name}</span>
                  {m.badgeLabel && <span className="search-result-badge">{m.badgeLabel}</span>}
                </div>
                {m.floorInfo && <small className="search-result-floor">{m.floorInfo}</small>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

