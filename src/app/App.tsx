import { useState } from "react";
import Footer from "@/app/layout/Footer";
import Header from "@/app/layout/Header";
import type { IndexerState } from "@/data/indexerState";
import Home from "@/pages/home/Home";
import "./App.css";

export default function App() {
  // Owned by Home, whose queries are what the header's chip reports on; held
  // here only because the header is where a reader looks for it.
  const [indexer, setIndexer] = useState<IndexerState>("connecting");

  return (
    <div className="app">
      {/* The header precedes the content on every load, and the filter bar
          below it is a further six controls before the first figure. */}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header indexer={indexer} />
      {/* tabIndex so the skip link moves focus here rather than only
          scrolling, which would leave the next Tab back in the header. */}
      <main className="main" id="main" tabIndex={-1}>
        <Home onIndexerState={setIndexer} />
      </main>
      <Footer />
    </div>
  );
}
