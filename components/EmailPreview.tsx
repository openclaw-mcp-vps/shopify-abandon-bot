import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmailPreview({
  variant,
  subject,
  body
}: {
  variant: "A" | "B";
  subject: string;
  body: string;
}) {
  return (
    <Card className="h-full border-zinc-700 bg-zinc-900/80">
      <CardHeader className="space-y-3">
        <Badge className="w-fit border-sky-500/50 bg-sky-500/10 text-sky-300">
          Variant {variant}
        </Badge>
        <CardTitle className="text-base">{subject}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{body}</p>
      </CardContent>
    </Card>
  );
}
