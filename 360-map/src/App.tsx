import { useState } from 'react'
import PanoramaViewer from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/pano-preview.jpg'
const PANORAMA_MOBILE = '/panoramas/pano-2048.jpg'
const PANORAMA_STANDARD = '/panoramas/pano-4096.jpg'
const PANORAMA_HIGH_RES = '/panoramas/pano-8192.jpg'

function App() {
  const [imageReady, setImageReady] = useState(false)

  return (
    <main className="panorama-page">
      <PanoramaViewer
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        mobile={PANORAMA_MOBILE}
        standard={PANORAMA_STANDARD}
        highRes={PANORAMA_HIGH_RES}
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
