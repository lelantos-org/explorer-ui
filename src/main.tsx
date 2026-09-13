// Global styles first: tokens and the reset have to precede every component
// stylesheet, which each component imports for itself.
import "@/styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { ApiProvider } from "@/api";
import App from "@/app/App";
import ErrorBoundary from "@/app/ErrorBoundary";

const root = document.getElementById("root");
if (!root) {
  // index.html and this file have to agree on the mount point; when they do
  // not, React's own message is about a null argument several frames away.
  throw new Error('no #root element in the document — index.html is missing <div id="root">');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ApiProvider>
        <App />
      </ApiProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
