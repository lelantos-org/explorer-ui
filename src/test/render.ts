import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";

/**
 * A tree's server-rendered HTML, for assertions on its text.
 *
 * React separates adjacent text nodes with an empty comment, which would
 * otherwise split every interpolated phrase — "k = <!-- -->42" — so a test
 * asking for "k = 42" would miss it.
 */
export const renderHtml = (node: ReactNode): string =>
  renderToString(node).replaceAll("<!-- -->", "");
