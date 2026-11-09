import { useState } from 'react'
import PanoramaViewer from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/panorama-preview.webp'
const PANORAMA_STANDARD = '/panoramas/panorama.webp'
const PANORAMA_FALLBACK = '/panoramas/pano-4096.jpg'

function App() {
  const [imageReady, setImageReady] = useState(false)

  return (
    <main className="panorama-page">
      <PanoramaViewer
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        standard={PANORAMA_STANDARD}
        fallback={PANORAMA_FALLBACK}
        onReady={() => setImageReady(true)}
      />
      <p className="panorama-hint">
        Drag to rotate · Pinch or scroll to zoom · Use fullscreen to explore
      </p>
      <WelcomeScreen imageReady={imageReady} />
    </main>
  )
}

export default App
