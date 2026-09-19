import { getRequestConfig } from "next-intl/server";
import { resolveLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = resolveLocale(requested ?? undefined);

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
