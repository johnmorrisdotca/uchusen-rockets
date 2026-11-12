// The flags the demo shows: hata's 4:3 drawings of only the countries the rockets have, so the site carries three small files and not one for every flag. The element's `flags` attribute asks for them.
import cn from "@johnmorrisdotca/hata/flags/cn.4x3";
import ru from "@johnmorrisdotca/hata/flags/ru.4x3";
import us from "@johnmorrisdotca/hata/flags/us.4x3";

const FLAGS: Readonly<Record<string, string>> = { CN: cn, RU: ru, US: us };

/** hata's `flag(code, { shape: "4:3" })` for these three countries; null for any other. */
export const flag = (code: string): Promise<string | null> => Promise.resolve(FLAGS[code.toUpperCase()] ?? null);
