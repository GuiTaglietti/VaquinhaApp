// src/services/legal.ts
import api from "@/lib/api";

export type LegalDocKey = "terms" | "privacy" | "fees";

export type LegalDoc = {
  key: LegalDocKey;
  title: string;
  version: string;
  updated_at?: string;
  content_html?: string;
  content_md?: string;
};

const titles: Record<LegalDocKey, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  fees: "Taxas e Condições",
};

const placeholders: Record<LegalDocKey, string> = {
  terms:
    "## Termos de Uso\n\nConteúdo não disponível no momento. Entre em contato com o suporte.",
  privacy:
    "## Política de Privacidade\n\nConteúdo não disponível no momento.",
  fees:
    "## Taxas e Condições\n\nTaxa de manutenção: 4,99%.\nTaxa fixa por doação: R$ 0,49.\nTaxa por saque: R$ 4,50.",
};

function fallback(key: LegalDocKey): LegalDoc {
  return {
    key,
    title: titles[key],
    version: "local-fallback",
    content_md: placeholders[key],
  };
}

export async function getLegalDoc(
  key: LegalDocKey,
  lang = "pt-BR"
): Promise<LegalDoc> {
  try {
    const { data } = await api.get("/public/legal", {
      params: { doc: key, lang },
      withCredentials: false,
    });

    return {
      key,
      title: data.title,
      version: data.version,
      updated_at: data.updated_at,
      content_html: data.content_html,
      content_md: data.content_md,
    };
  } catch {
    return fallback(key);
  }
}
