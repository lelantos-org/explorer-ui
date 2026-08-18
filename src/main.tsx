import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApiProvider } from "./api";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import "./styles/index.css";

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
