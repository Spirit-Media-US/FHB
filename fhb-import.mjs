import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'rusi1hyi',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

const PASSAGES = [
  {
    reference: 'John 3:16',
    book: 'John', chapter: 3, verse: '16',
    traditionalText: 'For God so loved the world that He gave His only Son, that whoever believes in Him shall not perish but have eternal life.',
    fhbText: 'For our Father so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life.',
    translationNote: 'The Greek word translated "God" here is the same God Jesus consistently addressed as Father. This rendering makes explicit what the text has always communicated — it was our Father who so loved the world.',
    featured: true,
    order: 1,
  },
  {
    reference: 'John 14:6',
    book: 'John', chapter: 14, verse: '6',
    traditionalText: 'Jesus answered, "I am the way and the truth and the life. No one comes to God except through me."',
    fhbText: 'Jesus answered, "I am the way and the truth and the life. No one comes to the Father except through me."',
    translationNote: "Jesus' own words name the destination as 'the Father' — not merely God in abstract, but a Father to be known and come home to.",
    featured: true,
    order: 2,
  },
]

async function run() {
  console.log('Seeding FHB scripture passages...')
  for (const p of PASSAGES) {
    await client.create({ _type: 'scripture', ...p })
    console.log(`  ✓ ${p.reference}`)
  }
  console.log('\nDone.')
}

run()
