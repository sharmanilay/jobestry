import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Jobestry] Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            margin: 16,
          }}>
          <div style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ color: '#7f1d1d', fontSize: 12, marginBottom: 16 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ViewErrorBoundaryProps {
  children: ReactNode;
  viewName: string;
}

export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, State> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[Jobestry] Error in ${this.props.viewName} view:`, error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            margin: 16,
          }}>
          <div style={{ color: '#92400e', fontWeight: 'bold', marginBottom: 8 }}>
            Failed to load {this.props.viewName}
          </div>
          <div style={{ color: '#78350f', fontSize: 12, marginBottom: 16 }}>Please try again</div>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              background: '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
