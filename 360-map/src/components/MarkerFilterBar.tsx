import React, { useState, useMemo } from 'react'
import {
  type CampusBuilding,
  type BuildingCategory,
  CATEGORY_CONFIG,
  getCategoryDetails,
} from '../types/marker'

interface MarkerFilterBarProps {
  markers: CampusBuilding[]
  selectedCategory: BuildingCategory | 'all'
  onSelectCategory: (cat: BuildingCategory | 'all') => void
  onSelectMarker: (marker: CampusBuilding) => void
  isDrawerOpen: boolean
  onToggleDrawer: () => void
  onOpenNewBuilding: () => void
  onExportMarkers: () => void
  onImportMarkers: () => void
}

export const MarkerFilterBar: React.FC<MarkerFilterBarProps> = ({
  markers,
  selectedCategory,
  onSelectCategory,
  onSelectMarker,
  isDrawerOpen,
  onToggleDrawer,
  onOpenNewBuilding,
  onExportMarkers,
  onImportMarkers,
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
      const matchesStages = m.stages?.some(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          String(s.stageNumber) === query.trim() ||
          `stage ${s.stageNumber}`.includes(query) ||
          s.floor?.toLowerCase().includes(query)
      )

      return matchesName || matchesDesc || matchesStages
    })
  }, [markers, selectedCategory, searchQuery])

  return (
    <div className="campus-filter-container">
      <div className="campus-filter-header">
        {/* Search Bar */}
        <div className="campus-search-box">
          <span className="search-icon">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search building, stage (e.g. Stage 4), floor..."
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

        {/* Action Buttons: Add Building & Manage Drawer */}
        <div className="campus-toolbar-actions">
          <button
            className="btn-action btn-action--primary-highlight"
            onClick={onOpenNewBuilding}
            title="Add a new building and place on 360 map"
          >
            ➕ New Building
          </button>
          <button
            className={`btn-action ${isDrawerOpen ? 'btn-action--active' : ''}`}
            onClick={onToggleDrawer}
            title="Open Developer Building & Stage Manager"
          >
            🛠️ Buildings ({markers.length})
          </button>
          <button
            className="btn-action btn-action--secondary"
            onClick={onExportMarkers}
            title="Export all buildings and stages as JSON"
          >
            📋 Export
          </button>
          <button
            className="btn-action btn-action--secondary"
            onClick={onImportMarkers}
            title="Import custom markers from JSON"
          >
            📥 Import
          </button>
        </div>
      </div>

      {/* Empty State Banner if no markers exist */}
      {markers.length === 0 && (
        <div className="empty-markers-banner">
          <span>
            📍 <strong>No buildings added yet:</strong> Click <strong>"➕ New Building"</strong> to type a name and drop a marker on the 360° map!
          </span>
        </div>
      )}

      {/* Category Pills */}
      <div className="campus-category-pills">
        <button
          className={`category-pill ${selectedCategory === 'all' ? 'category-pill--active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          All Locations ({markers.length})
        </button>

        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const count = markers.filter((m) => m.category === key).length
          if (count === 0 && selectedCategory !== key) return null
          return (
            <button
              key={key}
              className={`category-pill ${selectedCategory === key ? 'category-pill--active' : ''}`}
              onClick={() => onSelectCategory(key)}
            >
              <span
                className="category-pill-icon"
                style={{ color: cfg.color }}
                dangerouslySetInnerHTML={{ __html: cfg.iconSvg }}
              />
              <span className="category-pill-label">{cfg.label}</span>
              <span className="category-pill-count">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Search Autocomplete / Quick Dropdown */}
      {isOpenList && searchQuery && (
        <div className="campus-search-results">
          {filteredMarkers.length === 0 ? (
            <div className="search-no-results">No locations found for "{searchQuery}"</div>
          ) : (
            filteredMarkers.map((m) => {
              const catDetails = getCategoryDetails(m.category)
              const stagesCount = m.stages?.length || 0
              const stagesText = m.stages?.map((s) => `#${s.stageNumber}`).join(', ')
              return (
                <div
                  key={m.id}
                  className="search-result-item"
                  onClick={() => {
                    onSelectMarker(m)
                    setIsOpenList(false)
                  }}
                >
                  <div className="search-result-info">
                    <span className="search-result-name">
                      <span
                        className="search-result-cat-icon"
                        style={{ color: catDetails.color }}
                        dangerouslySetInnerHTML={{ __html: catDetails.iconSvg }}
                      />
                      {m.name}
                    </span>
                    {stagesCount > 0 && (
                      <span className="search-result-badge">
                        Stages: {stagesText}
                      </span>
                    )}
                  </div>
                  {stagesCount > 0 && (
                    <small className="search-result-floor">
                      {m.stages.map((s) => s.floor ? `Stage ${s.stageNumber}: ${s.floor}` : '').filter(Boolean).join(' · ')}
                    </small>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
