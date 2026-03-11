import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';

export const sanityClient = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	useCdn: true,
	apiVersion: '2024-01-01',
});

const builder = createImageUrlBuilder(sanityClient);
export function urlFor(source: any) {
	return builder.image(source);
}
