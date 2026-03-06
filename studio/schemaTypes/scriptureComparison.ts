export default {
  name: 'scriptureComparison',
  title: 'Scripture Comparisons',
  type: 'document',
  fields: [
    { name: 'reference', title: 'Scripture Reference', type: 'string', description: 'e.g. John 3:16', validation: (Rule: any) => Rule.required() },
    { name: 'traditional', title: 'Traditional Translation', type: 'text', validation: (Rule: any) => Rule.required() },
    { name: 'fhb', title: 'Father\'s Heart Bible Translation', type: 'text', validation: (Rule: any) => Rule.required() },
    { name: 'note', title: 'Explanatory Note', type: 'text', description: 'Optional note explaining the translation choice' },
    { name: 'featured', title: 'Featured on Homepage', type: 'boolean', initialValue: false },
    { name: 'order', title: 'Display Order', type: 'number' },
  ],
  preview: {
    select: { title: 'reference', subtitle: 'fhb' },
  },
}
