import { describe, expect, it } from "vitest";
import { formatDate, maskDate, parseDate } from "./date";

describe("formatDate", () => {
  it("converte ISO para dd/mm/yyyy", () => {
    expect(formatDate("2025-06-01")).toBe("01/06/2025");
    expect(formatDate("2025-06-01T10:00:00Z")).toBe("01/06/2025");
  });
  it("usa o fallback para vazio ou inválido", () => {
    expect(formatDate(null, "—")).toBe("—");
    expect(formatDate("", "—")).toBe("—");
    expect(formatDate("junho")).toBe("");
  });
});

describe("parseDate", () => {
  it("converte dd/mm/yyyy para ISO", () => {
    expect(parseDate("01/06/2025")).toBe("2025-06-01");
    expect(parseDate("29/02/2024")).toBe("2024-02-29");
  });
  it("rejeita datas inexistentes ou incompletas", () => {
    expect(parseDate("31/02/2025")).toBeNull();
    expect(parseDate("29/02/2025")).toBeNull();
    expect(parseDate("01/13/2025")).toBeNull();
    expect(parseDate("1/6/2025")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("maskDate", () => {
  it("insere as barras durante a digitação", () => {
    expect(maskDate("0")).toBe("0");
    expect(maskDate("010")).toBe("01/0");
    expect(maskDate("01062025")).toBe("01/06/2025");
    expect(maskDate("01/06/2025")).toBe("01/06/2025");
  });
  it("ignora letras e excesso de dígitos", () => {
    expect(maskDate("ab01062025999")).toBe("01/06/2025");
  });
});
