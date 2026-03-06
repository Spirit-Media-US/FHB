export default {
  name: 'partnerInquiry',
  title: 'Partnership Tiers',
  type: 'document',
  fields: [
    { name: 'title', title: 'Tier Title', type: 'string', validation: (Rule: any) => Rule.required() },
    { name: 'description', title: 'Description', type: 'text' },
    { name: 'benefits', title: 'Benefits', type: 'array', of: [{ type: 'string' }] },
    { name: 'order', title: 'Display Order', type: 'number' },
  ],
  preview: {
    select: { title: 'title' },
  },
}
