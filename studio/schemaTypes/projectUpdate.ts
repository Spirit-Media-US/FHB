export default {
  name: 'projectUpdate',
  title: 'Project Updates',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: (Rule: any) => Rule.required() },
    { name: 'date', title: 'Date', type: 'date' },
    { name: 'summary', title: 'Summary', type: 'text' },
    { name: 'body', title: 'Full Content', type: 'array', of: [{ type: 'block' }] },
    { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
    { name: 'published', title: 'Published', type: 'boolean', initialValue: false },
  ],
  preview: {
    select: { title: 'title', subtitle: 'date' },
  },
}
