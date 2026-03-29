import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary, GlobalErrorHandler } from "./components/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GlobalErrorHandler>
        <App />
      </GlobalErrorHandler>
    </ErrorBoundary>
  </React.StrictMode>,
);
