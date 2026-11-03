import { SitePage, siteMetadata } from "../site-page";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ template?: string }> };

export const generateMetadata = async ({ params }: Params) => siteMetadata((await params).slug, false);

// Unbranded: no agent, brokerage or studio contact details, for MLS virtual-tour links.
export default async function UnbrandedSite({ params, searchParams }: Params) {
  return <SitePage slug={(await params).slug} branded={false} template={(await searchParams).template} />;
}
