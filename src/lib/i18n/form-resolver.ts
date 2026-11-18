import type { CollectionFormDetail, FormFieldItem } from "../../types/form-builder";
import {
  DEFAULT_LANGUAGE,
  getLanguageConfig,
  SUPPORTED_LANGUAGES,
} from "./config.ts";
import type { LanguageConfig } from "./config.ts";
import { getDictionary } from "./dictionaries.ts";
import type { FormDictionary } from "./dictionaries.ts";

export interface FormTranslationItem {
  id?: string;
  formId?: string;
  language: string;
  title: string;
  description?: string | null;
  headerPrompt: string;
  thankYouMessage?: string | null;
  consentText?: string | null;
  videoInstructions?: string | null;
  fieldTranslationsJson?: string | null;
  isPublished?: boolean;
}

export interface FieldTranslationData {
  label?: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ id: string; label: string }>;
}

export interface LocalizedFormResult {
  form: CollectionFormDetail;
  activeLanguage: LanguageConfig;
  availableLanguages: LanguageConfig[];
  dictionary: FormDictionary;
  isTranslated: boolean;
  direction: "ltr" | "rtl";
}

/**
 * Resolves a collection form with its translated overlay for a given language.
 * Guarantees that all field IDs, validation rules, and underlying submission mappings
 * remain completely identical across all languages.
 */
export function resolveLocalizedForm(
  baseForm: CollectionFormDetail,
  requestedLanguage?: string | null,
  translations: FormTranslationItem[] = []
): LocalizedFormResult {
  const formDefaultLang = (baseForm as any).defaultLanguage || DEFAULT_LANGUAGE;
  const requested = requestedLanguage?.toLowerCase().split("-")[0].trim() || formDefaultLang;

  // 1. Gather all available languages for this form
  const availableLangCodes = new Set<string>([formDefaultLang]);
  translations.forEach((t) => {
    if (t.isPublished !== false) {
      availableLangCodes.add(t.language.toLowerCase().trim());
    }
  });

  const availableLanguages: LanguageConfig[] = Array.from(availableLangCodes).map((code) =>
    getLanguageConfig(code)
  );

  // 2. Check if a translation exists for the requested language
  let activeLangCode = formDefaultLang;
  let matchingTranslation: FormTranslationItem | undefined = undefined;

  if (requested && requested !== formDefaultLang) {
    matchingTranslation = translations.find(
      (t) => t.language.toLowerCase() === requested && t.isPublished !== false
    );
    if (matchingTranslation) {
      activeLangCode = requested;
    }
  }

  const activeLanguage = getLanguageConfig(activeLangCode);
  const dictionary = getDictionary(activeLangCode);
  const isTranslated = !!matchingTranslation;

  // 3. Build localized form fields with overlay while preserving exact IDs
  let fieldTranslations: Record<string, FieldTranslationData> = {};
  if (matchingTranslation?.fieldTranslationsJson) {
    try {
      fieldTranslations = JSON.parse(matchingTranslation.fieldTranslationsJson);
    } catch {
      fieldTranslations = {};
    }
  }

  const localizedFields: FormFieldItem[] = (baseForm.fields || []).map((field) => {
    const fieldKey = field.id || "";
    const translation = fieldKey ? fieldTranslations[fieldKey] : undefined;
    if (!translation) return field;

    let localizedOptions = field.optionsJson;
    if (translation.options && Array.isArray(translation.options)) {
      try {
        localizedOptions = JSON.stringify(translation.options);
      } catch {
        // preserve original
      }
    }

    return {
      ...field,
      label: translation.label || field.label,
      description: translation.description !== undefined ? translation.description : field.description,
      placeholder: translation.placeholder !== undefined ? translation.placeholder : field.placeholder,
      helpText: translation.helpText !== undefined ? translation.helpText : field.helpText,
      optionsJson: localizedOptions,
    };
  });

  // 4. Build localized form
  const localizedForm: CollectionFormDetail = {
    ...baseForm,
    title: matchingTranslation?.title || baseForm.title,
    description:
      matchingTranslation?.description !== undefined
        ? matchingTranslation.description
        : baseForm.description,
    headerPrompt: matchingTranslation?.headerPrompt || baseForm.headerPrompt,
    thankYouMessage:
      matchingTranslation?.thankYouMessage !== undefined
        ? matchingTranslation.thankYouMessage
        : baseForm.thankYouMessage,
    consentText:
      matchingTranslation?.consentText ||
      baseForm.consentText ||
      "",
    videoInstructions:
      matchingTranslation?.videoInstructions !== undefined
        ? matchingTranslation.videoInstructions
        : baseForm.videoInstructions,
    fields: localizedFields,
  };

  return {
    form: localizedForm,
    activeLanguage,
    availableLanguages,
    dictionary,
    isTranslated,
    direction: activeLanguage.dir,
  };
}
