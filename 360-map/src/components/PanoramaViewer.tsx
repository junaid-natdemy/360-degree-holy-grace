import { useEffect, useRef } from 'react'
import 'pannellum/build/pannellum.css'
import 'pannellum/build/pannellum.js'
import type { PannellumViewer } from '../types/pannellum'

export interface PanoramaViewerProps {
  /** Path to an equirectangular panorama, relative to the site root. */
  panorama: string
  className?: string
}

export default function PanoramaViewer({
  panorama,
  className,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<PannellumViewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !window.pannellum) {
      return
    }

    const viewer = window.pannellum.viewer(container, {
      type: 'equirectangular',
      panorama,
      autoLoad: true,
      compass: true,
      showFullscreenCtrl: true,
      showZoomCtrl: true,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
    })

    viewerRef.current = viewer

    return () => {
      viewerRef.current = null
      viewer.destroy()
    }
  }, [panorama])

  return <div ref={containerRef} className={className} />
}
