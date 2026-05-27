import { useState } from "react";
import { loadVault, saveVault, type VaultData } from "@/lib/storage";

export function useVault() {
  const [data, setData] = useState<VaultData>(() => loadVault());

  function updateVault(updater: (current: VaultData) => VaultData) {
    setData((current) => {
      const next = updater(current);
      saveVault(next);
      return next;
    });
  }

  function reloadVault() {
    setData(loadVault());
  }

  return { data, updateVault, reloadVault };
}
