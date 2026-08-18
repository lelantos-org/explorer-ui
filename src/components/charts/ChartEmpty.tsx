interface Props {
  /** Why there is nothing to draw, when the reason is more specific than the
   *  range simply being quiet. */
  children?: React.ReactNode;
}

/** What a chart shows instead of an empty pair of axes. */
export default function ChartEmpty({ children = "no data" }: Props) {
  return <div className="empty">{children}</div>;
}
