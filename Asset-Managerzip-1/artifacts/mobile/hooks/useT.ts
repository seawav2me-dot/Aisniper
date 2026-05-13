import translations, { Language } from "@/constants/translations";
import { useApp } from "@/context/AppContext";

export function useT() {
  const { user } = useApp();
  const lang: Language = user.language ?? "ar";
  return translations[lang];
}
