import PanoramaViewer from './components/PanoramaViewer'
import './App.css'

function App() {
  return (
    <main className="panorama-page">
      <PanoramaViewer
        className="panorama-viewer"
        panorama="/PANO_0001-0043.jpg"
      />
      <p className="panorama-hint">
        Drag to rotate · Scroll to zoom · Use the fullscreen button to explore
      </p>
    </main>
  )
}

export default App
