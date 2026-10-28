// Global Bible Month video (YouTube Short, 9:16). Used by src/pages/global-bible-month.astro.
// Hand-edited; NOT generated (unlike globalBibleMonth.ts). While GBM_VIDEO_ID is empty the page
// shows the poster only, with no play button. Paste the 11-character YouTube ID to activate
// the click-to-play facade: no other change needed.
export const GBM_VIDEO_ID = '';

const SANITY = 'https://cdn.sanity.io/images/rusi1hyi/production';
export const GBM_POSTER = {
	src1x: `${SANITY}/398173e1ce83b2a32b1bc940c607050a42d8b416-360x640.webp`,
	src2x: `${SANITY}/c92d25d3d9b5fc05d60bebdb1455e957d8492fdc-720x1280.webp`,
	width: 360,
	height: 640,
	alt: "Three smiling people from different nations holding Father's Heart Bible beside a globe, with the words Celebrating Global Bible Month",
};
