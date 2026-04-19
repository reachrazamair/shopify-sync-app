export function NotConnectedState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 px-4">
      <div className="rounded-xl border border-dashed bg-card p-10 flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
        </span>
        <div>
          <p className="font-semibold text-base">No store connected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click the indicator in the nav bar to connect your Shopify store and start syncing orders.
          </p>
        </div>
      </div>
    </div>
  );
}
