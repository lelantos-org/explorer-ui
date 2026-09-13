import { SOURCE_URL, WALLET_URL } from "@/app/links";
import ExternalLink from "@/ui/ExternalLink";
import GithubIcon from "@/ui/icons/GithubIcon";
import "./Footer.css";

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
      {/* The glyphs repeat the words beside them, so they are ornament. Left
          audible they read as "no cookies cookie no tracking eye no accounts
          bust in silhouette". */}
      <span className="ftr__note muted">
        no cookies <span aria-hidden="true">🍪</span> · no tracking{" "}
        <span aria-hidden="true">👁️</span> · no accounts <span aria-hidden="true">👤</span>
      </span>
      <span className="ftr__sep" aria-hidden="true" />
      <ExternalLink variant="plain" className="ftr__link" href={WALLET_URL}>
        wallet
      </ExternalLink>
      <span className="ftr__sep" aria-hidden="true" />
      {/* Which build is on screen — the first thing worth knowing about a bug
          report, and unanswerable from a hashed asset filename. */}
      <span className="ftr__ver num muted" title="build commit">
        {__COMMIT__}
      </span>
      <span className="ftr__sep" aria-hidden="true" />
      <ExternalLink
        variant="plain"
        className="ftr__link"
        href={SOURCE_URL}
        aria-label="Lelantos on GitHub"
      >
        <GithubIcon />
      </ExternalLink>
    </footer>
  );
}
