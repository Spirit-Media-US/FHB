import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

// Honor SANITY_USE_CDN env var to allow prod deploys to bypass the
// Sanity CDN — which can serve a ~60s-stale view of the dataset right
// after a publish. deploy-live.sh sets this to 'false' so the build
// fetches the just-published post on the first try. All other contexts
// keep the CDN for speed.
const USE_CDN = process.env.SANITY_USE_CDN !== 'false';

// PREVIEW_DRAFTS=true makes the default sanityClient render Sanity drafts
// overlaid on published docs (drafts win when both exist). Used by the dev
// branch build so editors can preview unpublished content at dev URLs.
// Production builds (main) leave this unset and only see published docs.
const PREVIEW_DRAFTS = process.env.PREVIEW_DRAFTS === 'true';
const SANITY_TOKEN = process.env.SANITY_TOKEN || process.env.SANITY_API_TOKEN || '';

export const sanityClient = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	apiVersion: '2024-01-01',
	useCdn: PREVIEW_DRAFTS ? false : USE_CDN,
	...(PREVIEW_DRAFTS ? { perspective: 'drafts' as const, token: SANITY_TOKEN } : {}),
});

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
