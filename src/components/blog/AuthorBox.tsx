import Image from 'next/image';
import Link from 'next/link';
import type { PostAuthor } from '@/lib/content/posts';

export function AuthorBox({ author }: { author: PostAuthor }) {
  return (
    <section className="bd-author" aria-labelledby="post-about-author">
      {author.avatar && <Image src={author.avatar} alt="" width={64} height={64} className="rounded-full" />}
      <div>
        <h2 id="post-about-author">
          About <Link href={`/authors/${author.slug}`}>{author.name}</Link>
        </h2>
        {author.jobTitle && <p className="bd-author-role">{author.jobTitle}</p>}
        {author.bio && <p>{author.bio}</p>}
      </div>
    </section>
  );
}
