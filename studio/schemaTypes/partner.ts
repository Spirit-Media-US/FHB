export default {
  name: 'partner',
  title: 'Partners',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'organization', title: 'Organization', type: 'string' },
    { name: 'quote', title: 'Endorsement Quote', type: 'text' },
    { name: 'photo', title: 'Photo', type: 'image', options: { hotspot: true } },
    { name: 'featured', title: 'Feature on Site', type: 'boolean', initialValue: false },
    { name: 'order', title: 'Display Order', type: 'number' },
  ],
  preview: {
    select: { title: 'name', subtitle: 'organization', media: 'photo' },
  },
}
