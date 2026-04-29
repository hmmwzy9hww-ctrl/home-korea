// Helper hook: resolve a city id → localized display name in current language.
// Falls back to the legacy i18n dictionary key (`city.<id>`) if the city isn't
// in the cities table — keeps backwards compatibility with hardcoded ids.
import { useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useCities, cityLabel, findCity } from "@/lib/citiesStore";

export function useCityName() {
  const { lang, t } = useI18n();
  const cities = useCities();
  return useCallback(
    (cityId: string | undefined | null): string => {
      if (!cityId) return "";
      const city = findCity(cities, cityId);
      if (city) return cityLabel(city, lang);
      // Legacy fallback for any id not in the table.
      const legacy = t(`city.${cityId}`);
      return legacy === `city.${cityId}` ? cityId : legacy;
    },
    [cities, lang, t],
  );
}

export function useCityEmoji() {
  const cities = useCities();
  return useCallback(
    (cityId: string | undefined | null): string => {
      if (!cityId) return "📍";
      return findCity(cities, cityId)?.emoji ?? "📍";
    },
    [cities],
  );
}
