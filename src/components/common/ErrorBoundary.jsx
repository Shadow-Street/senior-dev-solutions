import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to error reporting service if available
    if (window.errorLogger) {
      window.errorLogger.logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const { fallback, showDetails = true } = this.props;

      // If custom fallback provided, use it
      if (fallback) {
        return fallback({ error, errorInfo, reset: this.handleReset });
      }

      // Auto-retry for first 2 errors
      if (errorCount <= 2) {
        setTimeout(() => {
          this.handleReset();
        }, 1000);

        return (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-600">Recovering from error... Attempt {errorCount}/2</p>
            </div>
          </div>
        );
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-2xl w-full">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-900 font-bold text-lg">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="space-y-4">
                <p className="text-red-800">
                  We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
                </p>

                {showDetails && error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-red-900 hover:text-red-700">
                      Technical Details (Click to expand)
                    </summary>
                    <div className="mt-2 p-3 bg-red-100 rounded-md overflow-auto max-h-48">
                      <p className="text-xs font-mono text-red-900 whitespace-pre-wrap">
                        {error.toString()}
                      </p>
                      {errorInfo && (
                        <p className="text-xs font-mono text-red-800 mt-2 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </p>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={this.handleReset}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;