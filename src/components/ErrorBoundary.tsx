import React, { Component, ErrorInfo, ReactNode } from "react";
import { RotateCcw, Home, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);

    // If it's a dynamic module import failure, attempt safe reload if not recently reloaded
    const msg = error?.message || "";
    if (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("net::ERR_NETWORK_CHANGED")
    ) {
      const reloadKey = "error_boundary_module_reload_time";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        console.warn("[ErrorBoundary] Dynamic import error caught. Reloading page in 500ms...");
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    this.props.onReset?.();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || "An unexpected error occurred.";
      const isNetworkOrModuleError =
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("Loading chunk") ||
        errorMessage.includes("net::ERR_NETWORK_CHANGED") ||
        errorMessage.includes("NetworkError");

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isNetworkOrModuleError
                  ? "Connection Interrupted"
                  : "Unable to Load This Section"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNetworkOrModuleError
                  ? "A momentary network change or interrupted connection prevented this page from loading. Reloading will restore it immediately."
                  : "Something went wrong while rendering this section. You can refresh the page or return to the storefront."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </button>
            </div>

            {/* Collapsible Technical Details */}
            {this.state.error && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <span>{this.state.showDetails ? "Hide technical details" : "Show technical details"}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-left overflow-x-auto max-h-36 scrollbar-thin">
                    <p className="text-[11px] font-mono text-rose-600 font-semibold break-all">
                      {errorMessage}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-[10px] font-mono text-slate-500 mt-1.5 whitespace-pre-wrap">
                        {this.state.error.stack.split("\n").slice(0, 4).join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

