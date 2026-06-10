// Shown automatically by Next during /app route transitions (while the server
// component renders). Gives an immediate branded "loading" cue on navigation.
export default function AppLoading() {
  return (
    <div className="route-loading">
      <div className="route-loading__mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/ciq-mark.svg" width={34} height={34} alt="" />
      </div>
      <div className="route-loading__bar">
        <span />
      </div>
      <div className="route-loading__label">Loading…</div>
    </div>
  );
}
