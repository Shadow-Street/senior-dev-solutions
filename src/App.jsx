import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { SubscriptionProvider } from "@/components/context/SubscriptionProvider"
import { AuthProvider } from "@/components/context/AuthContext"
import { BrowserRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      <AuthProvider>
        <SubscriptionProvider>
          <Pages />
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </Router>
  )
}

export default App 