import { Check, Copy } from "lucide-react";
import { useState } from "react";

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
    <button className="icon-button" type="button" onClick={copyValue} disabled={!value}>
      {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span>{isCopied ? "Copied" : label}</span>
    </button>
  );
}
