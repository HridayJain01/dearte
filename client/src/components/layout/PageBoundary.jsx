import { Component, Suspense } from 'react';
import { LoadingBlock, PageError } from '../ui/Primitives';

// Pages are lazy chunks: a spinner while one loads, and a way out if it can't.
// It also catches a page that throws while rendering. Either way the panel says
// which of those happened (see describeError) instead of a white screen, and
// `resetKey` (the pathname) clears it once the buyer navigates somewhere else.
export class PageBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[page error]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      // A reload also picks up fresh chunk names after a deploy.
      return <PageError error={this.state.error} onRetry={() => window.location.reload()} />;
    }
    return (
      <Suspense fallback={<div className="page-shell py-10"><LoadingBlock label="Loading view..." /></div>}>
        {this.props.children}
      </Suspense>
    );
  }
}
