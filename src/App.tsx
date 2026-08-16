import GithubIcon from "./components/icons/GithubIcon";
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
      <footer className="ftr">
        <span className="ftr__brand">Lelantos</span>
        <span className="ftr__sep" aria-hidden="true" />
        <span className="muted">no cookies 🍪 · no tracking 👁️ · no accounts 👤</span>
        <span className="ftr__sep" aria-hidden="true" />
        <a
          className="ftr__link"
          href="https://github.com/lelantos-org"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Lelantos on GitHub"
        >
          <GithubIcon />
        </a>
      </footer>
    </div>
  );
}
