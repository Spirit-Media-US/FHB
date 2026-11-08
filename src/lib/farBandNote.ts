// Far-band order-form line (Kevin 2026-11-08 "1 A"): far-band buyers keep the same print price, and
// are LED to the free /read reader and the $7.49 eBook; print stays available below.
// Links are existing paths, not invented: /read/ (the reader, community app) and /print/#ebook (the
// direct eBook purchase section whose button posts to /ebook-checkout). Copy rules: "our Father" never
// "God" as a name for Him, and no mention of any retailer.
export const FAR_NOTE_READ_HREF = '/read/';
export const FAR_NOTE_EBOOK_HREF = '/print/#ebook';
export const FAR_NOTE_EBOOK_PRICE = '$7.49';
export const FAR_NOTE = {
	before: '',
	readText: 'Read it free online now',
	middle: ', or get ',
	ebookText: `the eBook for ${FAR_NOTE_EBOOK_PRICE}`,
	after: ' — instant, no shipping.',
};
export const farNoteText = (): string =>
	`${FAR_NOTE.readText}${FAR_NOTE.middle}${FAR_NOTE.ebookText}${FAR_NOTE.after}`;
