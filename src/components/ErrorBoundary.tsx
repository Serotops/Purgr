import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
          <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
          <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Purgr encountered an unexpected error. Your system was not affected.
          </p>
          <pre className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 mb-4 max-w-lg overflow-auto max-h-32">
            {this.state.error?.message}
          </pre>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reload App
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
