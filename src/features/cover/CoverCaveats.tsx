import "./CoverCaveats.css";

/**
 * What k does not tell you.
 *
 * k is a ceiling, not a measurement, and nothing in the numbers says so — this
 * is the only place it is said in full sentences rather than as a caption
 * fragment.
 */
export default function CoverCaveats() {
  return (
    <div className="caveats">
      <span className="lbl">what k does not tell you</span>
      <p>
        k counts <em>withdrawals</em>, not people. One person withdrawing the same amount ten times
        counts ten times — so k is an upper bound on the size of your crowd, never a measurement of
        it. Read it as <strong>at most this many, and possibly far fewer</strong>.
      </p>
      <p>
        It is also per <span className="num caveats__term">publicAssetId</span>. One token
        registered under several ids does not pool its cover — withdrawals under different ids share
        no anonymity set.
      </p>
    </div>
  );
}
