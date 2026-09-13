import { WALLET_URL } from "@/app/links";
import type { IndexerState } from "@/data/indexerState";
import { useTheme } from "@/hooks/useTheme";
import ExternalLink from "@/ui/ExternalLink";
import IndexerStatus from "./IndexerStatus";
import Wordmark from "./Wordmark";
import "./Header.css";

/** The sticky masthead: the lockup, whether the backend is answering, the way
 *  to the wallet, and the theme. */
export default function Header({ indexer }: { indexer: IndexerState }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="hdr">
      <div className="hdr__left">
        <Wordmark />
        <span className="hdr__sub lbl">explorer</span>
      </div>
      <div className="hdr__right">
        <IndexerStatus state={indexer} />
        <ExternalLink variant="plain" className="chip chip--link" href={WALLET_URL}>
          wallet <span aria-hidden="true">↗</span>
        </ExternalLink>
        {/* Icon-only, so the label carries the whole meaning — and it names the
            destination rather than the current state, because "dark" on a
            button is as easily read as a description of where you are. */}
        <button
          type="button"
          className="chip chip--icon"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
        </button>
      </div>
    </header>
  );
}
