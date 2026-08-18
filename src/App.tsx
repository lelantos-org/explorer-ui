import Footer from "./components/layout/Footer";
import StatusDot from "./components/layout/StatusDot";
import Home from "./pages/Home";

export default function App() {
  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr__left">
          <span className="brand">LELANTOS</span>
          <span className="brand__sub muted">explorer</span>
        </div>
        <div className="hdr__right">
          <a className="lnk" href="/swagger-ui" target="_blank" rel="noreferrer">
            api
          </a>
          <StatusDot />
        </div>
      </header>
      <main className="main">
        <Home />
      </main>
      <Footer />
    </div>
  );
}
