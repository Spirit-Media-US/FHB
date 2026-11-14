// Per-edition Look Inside manifests, fetched by LookInside.astro the first time a viewer opens
// (perf 2uw: 85 inlined copies were ~700KB of /print's HTML). Same item shape the component used
// to inline: { src, label, w, h, n }.
import data from '../../../data/lookinside.json';

const ASSETS = 'https://assets.spiritmediapublishing.com/FHB/print/lookinside';
type Page = { file: string; label: string; w: number; h: number };
type Entry = { dir?: string; pages: Page[] };

export function getStaticPaths() {
	return Object.keys(data).map((slug) => ({ params: { slug } }));
}

export function GET({ params }: { params: { slug: string } }) {
	const entry = (data as Record<string, Entry>)[params.slug];
	const dir = entry?.dir ?? params.slug;
	const items = (entry?.pages ?? []).map((p, i) => ({
		src: `${ASSETS}/${dir}/${p.file}`,
		label: p.label,
		w: p.w,
		h: p.h,
		n: i + 1,
	}));
	return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
}
