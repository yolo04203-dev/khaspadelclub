import { lazy, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

function ChunkErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Failed to load page</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        This can happen on slow connections or after an app update. Please reload to try again.
      </p>
      <Button onClick={() => window.location.reload()} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Reload
      </Button>
    </div>
  );
}

export function lazyWithRetry(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch(() =>
      new Promise<{ default: ComponentType<any> }>((resolve) =>
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(() => resolve({ default: ChunkErrorFallback }));
        }, 1500)
      )
    )
  );
}
