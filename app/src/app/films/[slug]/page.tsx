import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmDetailView } from "@/components/site/FilmDetailView";
import { JsonLd } from "@/components/site/JsonLd";
import { resolveSiteUrl } from "@/config/env";
import { filmsCopy } from "@/config/films";
import { contactConfig } from "@/config/site";
import { getFilm, getFilmNeighbors, listFilms } from "@/data/films";
import { breadcrumbLd, videoLd } from "@/lib/structured";
import { getSiteSettings } from "@/settings/read";

interface Props {
  params: Promise<{ slug: string }>;
}

/** 새로 발행된 작품은 처음 열릴 때 만들어지고(dynamicParams), 발행·취소·삭제 때 캐시가 갱신된다. 최대 5분 안에는 반드시 새 내용을 읽는다 */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await listFilms()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await getFilm((await params).slug);
  if (!film) return {};
  return {
    title: film.seoTitle || film.title,
    description: film.seoDescription || film.summary || undefined,
    ...(film.poster.src ? { openGraph: { images: [{ url: film.poster.src, alt: film.poster.alt }] } } : {}),
  };
}

/** FILMS-D 작품 상세 (SCREEN-SPEC §5.15). 존재하지 않거나 공개 전인 작품은 404. */
export default async function FilmDetailPage({ params }: Props) {
  const film = await getFilm((await params).slug);
  if (!film) notFound();
  const { newer, older } = await getFilmNeighbors(film.slug);
  const origin = resolveSiteUrl(process.env).url.origin;
  const settings = await getSiteSettings();
  return (
    <>
      <JsonLd data={videoLd(origin, film)} />
      <JsonLd data={breadcrumbLd(origin, [{ name: "Films", path: "/films" }, { name: film.title, path: `/films/${film.slug}` }])} />
      <FilmDetailView film={film} newer={newer} older={older} email={settings["contact.email"] ?? contactConfig.email} copy={filmsCopy(settings)} />
    </>
  );
}
