import { Component, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10">
            <AlertCircle size={24} className="text-error" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-text-main">页面出现了问题</h3>
            <p className="mt-1 text-xs text-text-main/50">{this.state.error?.message || '发生了未知错误'}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-active"
          >
            <RotateCcw size={12} />
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
