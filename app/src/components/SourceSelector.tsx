import type { SourceMode } from "../lib/types";

interface Props {
  value: SourceMode;
  onChange: (mode: SourceMode) => void;
  disabled: boolean;
}

const OPTIONS: {
  value: SourceMode;
  label: string;
  desc: string;
}[] = [
  {
    value: "both",
    label: "Оба источника",
    desc: "Канистра + Агрегатор",
  },
  {
    value: "canister",
    label: "Только канистра",
    desc: "list_deployed_snses",
  },
  {
    value: "aggregator",
    label: "Только агрегатор",
    desc: "HTTP REST API",
  },
];

export function SourceSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="source-selector">
      <span className="source-selector-label">Источник SNS проектов</span>
      <div className="source-options">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={[
              "source-option",
              value === opt.value ? "source-option-active" : "",
              disabled ? "source-option-disabled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              type="radio"
              name="source-mode"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              disabled={disabled}
            />
            <div className="source-option-text">
              <span className="source-option-label">{opt.label}</span>
              <span className="source-option-desc">{opt.desc}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
