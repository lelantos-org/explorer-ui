import { useEffect, useState } from "react";
import Home from "./pages/Home";
import { useApi } from "./api";

function StatusDot() {
  const api = useApi();
  const [up, setUp] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      api
        .health()
        .then((ok) => alive && setUp(ok))
        .catch(() => alive && setUp(false));
    check();
    const id = setInterval(check, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [api]);
  const cls = up === null ? "dot dot--idle" : up ? "dot dot--ok" : "dot dot--err";
  const label = up === null ? "···" : up ? "live" : "down";
  return (
    <span className="status">
      <span className={cls} /> <span className="muted mono">{label}</span>
    </span>
  );
}

export default function App() {
  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr__left">
          <span className="brand">::lelantos</span>
          <span className="brand__sub muted">explorer</span>
        </div>
        <div className="hdr__right">
          <a className="lnk" href="/swagger-ui" target="_blank" rel="noreferrer">api</a>
          <StatusDot />
        </div>
      </header>
      <main className="main">
        <Home />
      </main>
      <footer className="ftr muted">
        <span>// no cookies · no tracking · no accounts</span>
      </footer>
    </div>
  );
}
