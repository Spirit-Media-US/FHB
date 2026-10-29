// Global Bible Month video (YouTube Short, 9:16). Used by src/pages/global-bible-month.astro.
// Hand-edited; NOT generated (unlike globalBibleMonth.ts). While GBM_VIDEO_ID is empty the page
// shows the poster only, with no play button. Paste the 11-character YouTube ID to activate
// the click-to-play facade: no other change needed.
export const GBM_VIDEO_ID = 'WZ3jxbpypms';

const SANITY = 'https://cdn.sanity.io/images/rusi1hyi/production';
export const GBM_POSTER = {
	src1x: `${SANITY}/398173e1ce83b2a32b1bc940c607050a42d8b416-360x640.webp`,
	src2x: `${SANITY}/c92d25d3d9b5fc05d60bebdb1455e957d8492fdc-720x1280.webp`,
	width: 360,
	height: 640,
	alt: "Three smiling people from different nations holding Father's Heart Bible beside a globe, with the words Celebrating Global Bible Month",
};

// VideoObject for the Short above (pattern of film-schema.ts, unit 6h). Values measured 2026-10-29
// from YouTube oEmbed + the shorts page (uploadDate 2026-10-28T16:48:37-07:00, lengthSeconds 13;
// source file 12.52s). Emitted only while GBM_VIDEO_ID is set. Name/description are YouTube's own.
export const gbmVideoNode = GBM_VIDEO_ID
	? {
			'@type': 'VideoObject',
			name: "Global Bible Month: One Word for the World | Father's Heart Bible™ #Shorts",
			description:
				"Global Bible Month is November. The Father's Heart Bible™ in Divine Voice™ Color is free to read now, adding one language a day to reach 80 by December 1.",
			thumbnailUrl: `https://i.ytimg.com/vi/${GBM_VIDEO_ID}/hqdefault.jpg`,
			uploadDate: '2026-10-28T16:48:37-07:00',
			duration: 'PT13S',
			contentUrl: `https://www.youtube.com/shorts/${GBM_VIDEO_ID}`,
			embedUrl: `https://www.youtube.com/embed/${GBM_VIDEO_ID}`,
			publisher: {
				'@type': 'Organization',
				name: "Father's Heart Bible",
				url: 'https://fathersheartbible.com/',
			},
		}
	: null;
