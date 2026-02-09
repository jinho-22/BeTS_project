import { Component } from 'react';

/**
 * React Error Boundary
 * 렌더링 중 에러 발생 시 흰 화면 대신 복구 UI를 표시합니다.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] 에러 발생:', error);
    console.error('[ErrorBoundary] 컴포넌트 스택:', errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-2xl mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              일시적인 오류가 발생했습니다. 아래 버튼을 눌러 복구하거나 페이지를 새로고침 해주세요.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  오류 상세 정보
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error.message || String(this.state.error)}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
