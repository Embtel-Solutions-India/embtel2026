// Placeholder until Task 8 renders pages from the `pages` collection.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="container-site flex min-h-[60vh] items-center justify-center">
      <h1 className="font-display text-2xl font-semibold text-white">{slug}</h1>
    </div>
  );
}
