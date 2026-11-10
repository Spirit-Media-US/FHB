import { toCsv } from '../../lib/translation-progress';

export const GET = () =>
	new Response(toCsv(), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
