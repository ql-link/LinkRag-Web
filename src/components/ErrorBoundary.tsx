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

/**
 * Error Boundary component that catches rendering errors in its children.
 * Displays a fallback UI with a retry button when an error occurs.
 *
 * Note: ts-expect-error comments are needed because React 19 doesn't ship
 * @types/react and the bundled types don't fully support class component APIs.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // @ts-expect-error React 19 class component typing
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  render() {
    // @ts-expect-error React 19 class component typing
    if (this.state.hasError) {
      // @ts-expect-error React 19 class component typing
      if (this.props.fallback) {
        // @ts-expect-error React 19 class component typing
        return this.props.fallback;
      }

      return (
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-text-main dark:text-[#e0e0e0]">页面出现了问题</h3>
            <p className="mt-1 text-xs text-text-main/50 dark:text-[#858585]">
              {/* @ts-expect-error React 19 class component typing */}
              {this.state.error?.message || '发生了未知错误'}
            </p>
          </div>
          <button
            // @ts-expect-error React 19 class component typing
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors bg-text-main text-white hover:opacity-90 dark:bg-[#094771] dark:hover:bg-[#0a5280]"
          >
            <RotateCcw size={12} />
            重试
          </button>
        </div>
      );
    }

    // @ts-expect-error React 19 class component typing
    return this.props.children;
  }
}
