import "./Wordmark.css";

/**
 * The brand lockup: the Merkle mark, then the name.
 *
 * The mark is the same drawing as public/icon.svg — a root and two leaves, with
 * the edges rising from the leaves and stopping short of the root: the tree is
 * public, which leaf is yours is not. Inline rather than an <img> so it takes
 * `currentColor` and follows the accent through a theme change, which a linked
 * file cannot do.
 *
 * `aria-hidden` on the svg because the word beside it already says LELANTOS —
 * announced, it would read as "Lelantos Lelantos".
 *
 * A link to `/`, the way back to the main page. A plain anchor rather than
 * client-side navigation: there is no router, and a full load of `/` is also
 * what clears the filters this page keeps in the query string. Named for where
 * it goes, since the visible name alone gives no hint that it navigates.
 */
export default function Wordmark() {
  return (
    <a href="/" className="brand" aria-label="Lelantos Explorer home">
      <svg
        className="brand__mark"
        viewBox="0 0 32 32"
        width="20"
        height="20"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="16" cy="6.5" r="4" fill="currentColor" />
        <circle cx="6.5" cy="25.5" r="4" fill="currentColor" />
        <circle cx="25.5" cy="25.5" r="4" fill="currentColor" />
        <path
          d="M9 21 L12.4 14.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <path
          d="M23 21 L19.6 14.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="brand__name">LELANTOS</span>
    </a>
  );
}
