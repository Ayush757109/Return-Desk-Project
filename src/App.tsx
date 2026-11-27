import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import RequestList from './pages/RequestList'
import RequestNew from './pages/RequestNew'
import RequestDetail from './pages/RequestDetail'
import Docs from './pages/Docs'
import { EmptyState } from './components/ui'

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="This page does not exist. Head back to the returns queue."
      actionLabel="Back to queue"
      actionTo="/queue"
    />
  )
}

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="queue" element={<RequestList />} />
          <Route path="new" element={<RequestNew />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="docs" element={<Docs />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}

export default App
