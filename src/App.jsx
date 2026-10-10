import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "sonner"
import { SubscriptionProvider } from "@/components/context/SubscriptionProvider"
import { AuthProvider } from "@/components/context/AuthContext"
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from '@/store'

function App() {
  return (
    // Redux wraps the router so the store outlives navigation, and sits
    // outside AuthProvider, which mirrors the session into it.
    <ReduxProvider store={store}>
      <Router>
        <AuthProvider>
        <SubscriptionProvider>
          <Pages />
          {/* Sonner's Toaster, mounted at the root.

              Every `toast(...)` call in this app comes from sonner, but the
              Toaster here used to be the shadcn one, which only renders toasts
              raised through its own useToast() hook — nothing does. Sonner's
              Toaster lived inside Layout, so any page rendered outside the app
              shell (login, register, forgot password) raised toasts into the
              void: signing in with the wrong password reported the failure to
              the console and showed the person nothing at all. */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: "sonner-toast",
              style: {
                borderRadius: "12px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: "500",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                border: "none",
              },
            }}
            richColors={false}
          />
          </SubscriptionProvider>
        </AuthProvider>
      </Router>
    </ReduxProvider>
  )
}

export default App 