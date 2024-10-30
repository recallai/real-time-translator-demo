import { LanguageCode } from "./language";

// If using Google API keys client-side, you must restrict the key to only work from your domain(s)!
// https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions
const API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_TRANSLATION_API_KEY;

export async function translateText(
    text: string,
    targetLanguage: LanguageCode
): Promise<string> {
    try {
        const response = await fetch(
            `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    q: text,
                    target: targetLanguage,
                }),
            }
        );

        const result = (await response.json()) as TranslationResult;
        return result.data.translations[0].translatedText;
    } catch (error) {
        console.error("Error translating text:", error);
        return "";
    }
}
type TranslationResult = {
    data: {
        translations: {
            translatedText: string;
        }[];
    };
};
