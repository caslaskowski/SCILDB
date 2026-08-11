import { useEffect } from 'react'
import Layout from './components/Layout'
import { useRoute } from './lib/router'
import About from './pages/About'
import Cases from './pages/Cases'
import Contributors from './pages/Contributors'
import Home from './pages/Home'
import Justices from './pages/Justices'
import Methodology from './pages/Methodology'
import { trackPage } from './utils/analytics'

function App() {
  const route = useRoute()

  useEffect(() => {
    trackPage(route)
  }, [route])

  return (
    <Layout>
      {route === '/' && <Home />}
      {route === '/cases' && <Cases />}
      {route === '/justices' && <Justices />}
      {route === '/about' && <About />}
      {route === '/methodology' && <Methodology />}
      {route === '/contributors' && <Contributors />}
    </Layout>
  )
}

export default App