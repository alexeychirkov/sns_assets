import { useState } from "react";
import { Principal } from "@dfinity/principal";

interface Props {
  onSearch: (principal: Principal) => void;
  disabled: boolean;
}

export function PrincipalInput({ onSearch, disabled }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const text = value.trim();
    if (!text) {
      setError("Введите принципал");
      return;
    }
    try {
      const p = Principal.fromText(text);
      onSearch(p);
    } catch {
      setError("Некорректный принципал");
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
          {disabled ? "Сканирую…" : "Поиск"}
        </button>
      </div>
      {error && <p className="input-error-msg">{error}</p>}
    </form>
  );
}
