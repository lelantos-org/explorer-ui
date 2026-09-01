import Footer from "./components/layout/Footer";
import Home from "./pages/Home";

export default function App() {
  return (
    <div className="app">
      {/* The header precedes the content on every load, and the filter bar
          below it is a further six controls before the first figure. */}
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="hdr">
        <div className="hdr__left">
          <span className="brand">LELANTOS</span>
          <span className="brand__sub muted">explorer</span>
        </div>
      </header>
      {/* tabIndex so the skip link moves focus here rather than only
          scrolling, which would leave the next Tab back in the header. */}
      <main className="main" id="main" tabIndex={-1}>
        <Home />
      </main>
      <Footer />
    </div>
  );
}
