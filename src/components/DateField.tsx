"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate, maskDate, parseDate } from "@/lib/date";

type Props = {
  /** data em ISO (yyyy-mm-dd), "" quando vazia ou incompleta */
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
};

/** Campo de data sempre em dd/mm/aaaa, independente do idioma do navegador. */
export function DateField({ value, onChange, required, className }: Props) {
  const [text, setText] = useState(() => formatDate(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const invalid = text !== "" && parseDate(text) === null;
    ref.current?.setCustomValidity(invalid ? "Use uma data válida no formato dd/mm/aaaa." : "");
  }, [text]);

  return (
    <input
      ref={ref}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      maxLength={10}
      value={text}
      required={required}
      onChange={(e) => {
        const masked = maskDate(e.target.value);
        setText(masked);
        onChange(parseDate(masked) ?? "");
      }}
    />
  );
}
