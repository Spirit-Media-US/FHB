import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

// Honor SANITY_USE_CDN env var to allow prod deploys to bypass the
// Sanity CDN — which can serve a ~60s-stale view of the dataset right
// after a publish. deploy-live.sh sets this to 'false' so the build
// fetches the just-published post on the first try. All other contexts
// keep the CDN for speed.
const USE_CDN = process.env.SANITY_USE_CDN !== 'false';

export const sanityClient = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	useCdn: USE_CDN,
	apiVersion: '2024-01-01',
});

const SANITY_TOKEN =
	process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN || '';

export const previewClient = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	useCdn: false,
	apiVersion: '2024-01-01',
	token: SANITY_TOKEN,
	perspective: 'drafts',
});

const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source: any) {
	return builder.image(source);
}
