import type { Metadata } from "next";
import PublicFormPage, { generateMetadata as baseGenerateMetadata } from "../page";

type LocalePageProps = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams?: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: LocalePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const search = await searchParams;
  return baseGenerateMetadata({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({ lang: search?.lang || locale, locale }),
  });
}

export default async function PublicFormLocalePage({ params, searchParams }: LocalePageProps) {
  const { slug, locale } = await params;
  const search = await searchParams;
  return PublicFormPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({ lang: search?.lang || locale, locale }),
  });
}
