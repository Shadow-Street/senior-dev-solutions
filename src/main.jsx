import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

import { GoogleOAuthProvider } from '@react-oauth/google';

// Google sign-in is optional: without a client id the provider (and Google's
// script) is skipped and the Login page offers email sign-in only. Anything
// else that uses @react-oauth/google must apply the same VITE_GOOGLE_CLIENT_ID
// check, or it throws outside the provider.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
    googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
            <App />
        </GoogleOAuthProvider>
    ) : (
        <App />
    )
) 