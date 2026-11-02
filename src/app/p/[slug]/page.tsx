import { SitePage, siteMetadata } from "./site-page";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ template?: string }> };

export const generateMetadata = async ({ params }: Params) => siteMetadata((await params).slug, true);

export default async function BrandedSite({ params, searchParams }: Params) {
  return <SitePage slug={(await params).slug} branded template={(await searchParams).template} />;
}
