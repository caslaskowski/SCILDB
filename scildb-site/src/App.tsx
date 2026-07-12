import Layout from './components/Layout'
import { useRoute } from './lib/router'
import About from './pages/About'
import Cases from './pages/Cases'
import Home from './pages/Home'
import Justices from './pages/Justices'

function App() {
  const route = useRoute()
  return (
    <Layout>
      {route === '/' && <Home />}
      {route === '/cases' && <Cases />}
      {route === '/justices' && <Justices />}
      {route === '/about' && <About />}
    </Layout>
  )
}

export default App
