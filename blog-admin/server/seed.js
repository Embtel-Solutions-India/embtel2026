// Seeds a fresh database with a default admin user and a couple of sample
// records so the panel isn't empty on first login. Safe to re-run — it skips
// records that already exist instead of duplicating them.
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('./config/env');
const User = require('./models/User');
const Category = require('./models/Category');
const Tag = require('./models/Tag');
const Blog = require('./models/Blog');
const Settings = require('./models/Settings');
const { makeSlug } = require('./utils/slugify');
const estimateReadingTime = require('./utils/readingTime');

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`[seed] Connected to ${mongoose.connection.name}`);

  let admin = await User.findOne({ email: env.seedAdmin.email.toLowerCase() });
  if (!admin) {
    admin = await User.create({
      name: env.seedAdmin.name,
      email: env.seedAdmin.email.toLowerCase(),
      password: env.seedAdmin.password,
      role: 'admin',
    });
    console.log(`[seed] Created admin user: ${admin.email}`);
  } else {
    console.log(`[seed] Admin user already exists: ${admin.email}`);
  }

  let category = await Category.findOne({ slug: 'general' });
  if (!category) {
    category = await Category.create({
      name: 'General',
      slug: 'general',
      description: 'General posts and announcements.',
    });
    console.log('[seed] Created category: General');
  }

  let tag = await Tag.findOne({ slug: 'welcome' });
  if (!tag) {
    tag = await Tag.create({ name: 'Welcome', slug: 'welcome' });
    console.log('[seed] Created tag: Welcome');
  }

  const sampleTitle = 'Welcome to your new Blog Admin Panel';
  let sampleBlog = await Blog.findOne({ slug: makeSlug(sampleTitle) });
  if (!sampleBlog) {
    const content = `
      <p>This is a sample published post created by the seed script. Edit or delete it from
      <strong>Blogs</strong> in the admin sidebar.</p>
      <p>From here you can create new posts with a rich text editor, organize them into
      categories and tags, manage comments, upload media, and configure SEO settings.</p>`;

    sampleBlog = await Blog.create({
      title: sampleTitle,
      slug: makeSlug(sampleTitle),
      shortDescription: 'A quick tour of what this admin panel can do for your blog.',
      content,
      category: category._id,
      tags: [tag._id],
      author: admin._id,
      status: 'published',
      publishedAt: new Date(),
      readingTime: estimateReadingTime(content),
      featured: true,
      pinned: true,
      seo: {
        metaTitle: sampleTitle,
        metaDescription: 'A quick tour of what this admin panel can do for your blog.',
        keywords: ['blog', 'admin', 'getting started'],
      },
    });
    console.log(`[seed] Created sample blog: ${sampleBlog.title}`);
  }

  const settingsExists = await Settings.findOne({ key: 'site' });
  if (!settingsExists) {
    await Settings.create({ key: 'site', siteName: 'My Blog' });
    console.log('[seed] Created default settings document');
  }

  console.log('\n[seed] Done. Default admin login:');
  console.log(`  Email:    ${env.seedAdmin.email}`);
  console.log(`  Password: ${env.seedAdmin.password}`);
  console.log('  (change this immediately in production — see README)\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
