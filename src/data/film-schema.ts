// VideoObject for the FHB introduction film (YouTube Ld4_H5XxrLk). Same facts GroupBible.astro
// emits on /bible-for/*; shared here for pages that show the film (home, resources guide).
// Only use on a page that visibly shows this video (Google structured-data guideline).
export const FILM_ID = 'Ld4_H5XxrLk';
export const filmNode = {
	'@type': 'VideoObject',
	name: "Father's Heart Bible — Introduction",
	description:
		"An introduction to Father's Heart Bible — an English translation that reveals God as a loving Father throughout Scripture.",
	thumbnailUrl: `https://i.ytimg.com/vi/${FILM_ID}/hqdefault.jpg`,
	uploadDate: '2026-06-11',
	contentUrl: `https://youtu.be/${FILM_ID}`,
	embedUrl: `https://www.youtube.com/embed/${FILM_ID}`,
	publisher: {
		'@type': 'Organization',
		// Same @id as the home-page Organization so engines merge it (2dg: was an anonymous, unlinked copy).
		'@id': 'https://fathersheartbible.com/#organization',
		name: "Father's Heart Bible",
		url: 'https://fathersheartbible.com/',
	},
};

// Standalone script form (carries its own @context).
export const filmSchema = { '@context': 'https://schema.org', ...filmNode };
