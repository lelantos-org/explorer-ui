import GithubIcon from "../icons/GithubIcon";

/** The wallet app, hard-coded like the GitHub link beside it: this is the
 *  project's own wallet, not a per-deployment service. */
const WALLET_URL = "https://app.lelantos.xyz";

/**
 * The site footer, mirroring webapp-ui's: brand, the privacy note, a link to
 * the other half of the project, the build on screen, and the source.
 *
 * The two apps carry the same row in opposite directions — the wallet links
 * here, this links there — so a reader who lands on either can reach the other.
 */
export default function Footer() {
  return (
    <footer className="ftr">
      <span className="ftr__brand">Lelantos</span>
      <span className="ftr__sep" aria-hidden="true" />
      <span className="ftr__note muted">no cookies 🍪 · no tracking 👁️ · no accounts 👤</span>
      <span className="ftr__sep" aria-hidden="true" />
      <a className="ftr__link" href={WALLET_URL} target="_blank" rel="noopener noreferrer">
        wallet
      </a>
      <span className="ftr__sep" aria-hidden="true" />
      {/* Which build is on screen — the first thing worth knowing about a bug
          report, and unanswerable from a hashed asset filename. */}
      <span className="ftr__ver mono muted" title="build commit">
        {__COMMIT__}
      </span>
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
  );
}
