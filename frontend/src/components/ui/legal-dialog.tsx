import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { LegalDocKey, LegalDoc } from "@/services/legal";
import { getLegalDoc } from "@/services/legal";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: LegalDocKey | null;
};

function formatDateBR(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return null;
  }
}

export function LegalDialog({ open, onOpenChange, doc }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LegalDoc | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    setLoading(true);
    getLegalDoc(doc)
      .then(setData)
      .finally(() => setLoading(false));
  }, [open, doc]);

  const updatedAtBR = formatDateBR(data?.updated_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-hidden">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl">
            {data?.title || "Documento"}
          </DialogTitle>

          {(data?.version || updatedAtBR) && (
            <div className="text-xs text-muted-foreground">
              {data?.version ? <>v{data.version}</> : null}
              {data?.version && updatedAtBR ? <span> • </span> : null}
              {updatedAtBR ? <>Atualizado em {updatedAtBR}</> : null}
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <ScrollArea className="h-[65vh] pr-4">
            {data?.content_html ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert legal-prose"
                dangerouslySetInnerHTML={{ __html: data.content_html }}
              />
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert legal-prose">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {data?.content_md}
                </pre>
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
