import { Principal } from "@dfinity/principal";
import { useState } from "react";
import { resolveNnsPrincipal } from "../lib/contractIndexer";
import { parseContractUrl } from "../lib/parseContractUrl";

interface Props {
  onSearch: (principal: Principal) => void;
  disabled: boolean;
  initialValue?: string;
}

export function PrincipalInput({ onSearch, disabled, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(false);

  const isBusy = disabled || resolving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const text = value.trim();
    if (!text) {
      setError("Enter a principal or a contract URL");
      return;
    }

    // Try URL first
    const contractPrincipal = parseContractUrl(text);
    if (contractPrincipal !== null) {
      setResolving(true);
      try {
        const nnsPrincipal = await resolveNnsPrincipal(contractPrincipal);
        onSearch(nnsPrincipal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve NNS principal");
      } finally {
        setResolving(false);
      }
      return;
    }

    // Fall back to plain principal
    try {
      const p = Principal.fromText(text);
      onSearch(p);
    } catch {
      setError("Invalid principal or contract URL");
    }
  }

  function buttonLabel() {
    if (resolving) return "Resolving…";
    if (disabled) return "Scanning…";
    return "Scan";
  }

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <div className="input-row">
        <input
          className={`principal-input${error ? " input-error" : ""}`}
          type="text"
          placeholder="xxxxx-xxxxx-xxxxx-xxxxx-cai  or  https://…icp0.io/?ref=…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          disabled={isBusy}
          spellCheck={false}
          autoComplete="off"
        />
        <button className="search-btn" type="submit" disabled={isBusy}>
          {buttonLabel()}
        </button>
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </form>
  );
}
