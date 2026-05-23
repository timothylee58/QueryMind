"use client";

import { CheckCircleIcon, DatabaseIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { validateConnection } from "@/app/actions/validate-connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DbConnectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (connectionString: string) => void;
};

export function DbConnectModal({
  open,
  onOpenChange,
  onConnected,
}: DbConnectModalProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await validateConnection(value.trim());
      if (result.success) {
        onConnected(value.trim());
        onOpenChange(false);
      } else {
        setError(result.error ?? "Connection failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-primary" />
            Connect Database
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="conn-string"
              className="text-sm font-medium text-muted-foreground"
            >
              Postgres Connection String
            </label>
            <input
              id="conn-string"
              type="password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="postgresql://user:password@host:5432/dbname"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !value.trim()}
          >
            {loading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : null}
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectedBadge() {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 border-emerald-500/50 text-emerald-500 text-xs"
    >
      <CheckCircleIcon className="size-3" />
      Connected
    </Badge>
  );
}
