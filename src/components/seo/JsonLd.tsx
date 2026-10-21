// One schema.org @graph per page. `<` is escaped so content can never close the script tag.
export function JsonLd({ data, nonce }: { data: Record<string, unknown>[]; nonce?: string }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': data }).replace(/</g, '\\u003c');
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: json }} />;
}
