import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
  }

  return (
    <Button variant="outline" size="sm" type="button" onClick={copyValue} disabled={!value}>
      {isCopied ? <Check /> : <Copy />}
      <span>{isCopied ? "Copied" : label}</span>
    </Button>
  );
}
