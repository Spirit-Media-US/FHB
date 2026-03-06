export default {
  name: 'page',
  title: 'Pages',
  type: 'document',
  fields: [
    {
      name: 'slug',
      title: 'Page Slug',
      type: 'string',
      description: 'e.g. about, partner, contact',
      validation: (Rule: any) => Rule.required(),
      options: {
        list: [
          { title: 'Homepage', value: 'home' },
          { title: 'About', value: 'about' },
          { title: 'Partner', value: 'partner' },
          { title: 'Contact', value: 'contact' },
          { title: 'Sample / Preface', value: 'sample' },
        ],
      },
    },
    { name: 'title', title: 'Page Title', type: 'string' },
    { name: 'metaDescription', title: 'Meta Description', type: 'text' },
    { name: 'heroHeadline', title: 'Hero Headline', type: 'string' },
    { name: 'heroSubheading', title: 'Hero Subheading', type: 'text' },
    { name: 'heroImage', title: 'Hero Image', type: 'image', options: { hotspot: true } },
    { name: 'body', title: 'Body Content', type: 'array', of: [{ type: 'block' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug' },
  },
}
