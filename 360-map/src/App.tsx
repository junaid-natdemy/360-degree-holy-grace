import { useState } from 'react'
import PanoramaViewer from './components/PanoramaViewer'
import { WelcomeScreen } from './components/WelcomeScreen'
import './App.css'

const PANORAMA_PREVIEW = '/panoramas/pano-preview.jpg'
const PANORAMA_STANDARD = '/panoramas/pano-4096.jpg'
const PANORAMA_HIGH_RES = '/panoramas/pano-8192.jpg'

function App() {
  const [imageReady, setImageReady] = useState(false)

  return (
    <main className="panorama-page">
      <PanoramaViewer
        className="panorama-viewer"
        preview={PANORAMA_PREVIEW}
        standard={PANORAMA_STANDARD}
        highRes={PANORAMA_HIGH_RES}
        onReady={() => setImageReady(true)}
      />
      <p className="panorama-hint">
        Drag to rotate · Scroll to zoom · Use the fullscreen button to explore
      </p>
      <WelcomeScreen imageReady={imageReady} />
    </main>
  )
}

export default App
