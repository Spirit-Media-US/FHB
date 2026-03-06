export default {
  name: 'scripture',
  title: 'Scripture Passages',
  type: 'document',
  fields: [
    { name: 'reference', title: 'Reference', type: 'string', description: 'e.g. John 3:16', validation: (Rule: any) => Rule.required() },
    { name: 'book', title: 'Book', type: 'string' },
    { name: 'chapter', title: 'Chapter', type: 'number' },
    { name: 'verse', title: 'Verse(s)', type: 'string' },
    { name: 'traditionalText', title: 'Traditional Translation', type: 'text' },
    { name: 'fhbText', title: "Father's Heart Bible Translation", type: 'text', validation: (Rule: any) => Rule.required() },
    { name: 'translationNote', title: 'Translation Note', type: 'text', description: 'Why this rendering — for reader context' },
    { name: 'featured', title: 'Feature on Homepage', type: 'boolean', initialValue: false },
    { name: 'order', title: 'Display Order', type: 'number' },
  ],
  preview: {
    select: { title: 'reference', subtitle: 'fhbText' },
  },
}
