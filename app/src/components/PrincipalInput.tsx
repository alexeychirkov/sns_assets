import { useState } from "react";
import { Principal } from "@dfinity/principal";

interface Props {
  onSearch: (principal: Principal) => void;
  disabled: boolean;
  initialValue?: string;
}

export function PrincipalInput({ onSearch, disabled, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const text = value.trim();
    if (!text) {
      setError("Enter a principal");
      return;
    }
    try {
      const p = Principal.fromText(text);
      onSearch(p);
    } catch {
      setError("Invalid principal");
    }
  }

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <div className="input-row">
        <input
          className={`principal-input${error ? " input-error" : ""}`}
          type="text"
          placeholder="xxxxx-xxxxx-xxxxx-xxxxx-cai"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
        />
        <button className="search-btn" type="submit" disabled={disabled}>
          {disabled ? "Scanning…" : "Scan"}
        </button>
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </form>
  );
}
