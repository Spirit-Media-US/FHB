import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { media } from 'sanity-plugin-media';
import { schemaTypes } from './studio/schemaTypes';

export default defineConfig({
	name: 'fathers-heart-bible',
	title: "Father's Heart Bible",
	projectId: 'rusi1hyi',
	dataset: 'production',
	basePath: '/studio',
	plugins: [structureTool(), visionTool(), media()],
	schema: { types: schemaTypes },
});
