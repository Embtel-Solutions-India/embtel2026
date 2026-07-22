const slugify = require('slugify');

// Turns a title into a URL-safe slug. `unique` disambiguates collisions
// by checking against a Mongoose model and appending -2, -3, ... as needed.
function makeSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true });
}

async function uniqueSlug(Model, text, currentId = null) {
  const base = makeSlug(text);
  let slug = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (currentId) query._id = { $ne: currentId };
    const existing = await Model.findOne(query).select('_id').lean();
    if (!existing) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

module.exports = { makeSlug, uniqueSlug };
