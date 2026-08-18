import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  message: string | null;
}

/**
 * Last resort for a render that throws.
 *
 * Data failures never reach here — every query hook keeps its error in `Async`
 * and the card renders it in place, which leaves the rest of the page usable.
 * This catches the other kind: a bug in a component, which React responds to by
 * unmounting the whole tree. Without a boundary that is a blank page with the
 * reason only in the console.
 *
 * A class because `componentDidCatch` has no hook equivalent.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : "something went wrong" };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack is the part that says *where*, and it is lost by the
    // time the message reaches the state above.
    console.error("render failed", error, info.componentStack);
  }

  override render() {
    if (this.state.message === null) return this.props.children;
    return (
      <div className="err err--fatal" role="alert">
        <strong>! the page failed to render</strong>
        <div className="muted mono">{this.state.message}</div>
        <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
          reload
        </button>
      </div>
    );
  }
}
