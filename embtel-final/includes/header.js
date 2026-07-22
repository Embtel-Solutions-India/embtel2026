/* ─────────────────────────────────────────────────────────────
   SHARED HEADER  (nav + mobile menu)
   Edit this file to update the header on EVERY page at once.
   ───────────────────────────────────────────────────────────── */
// The Blog page lives on this site (blog.html) and fetches published posts
// from the blog-admin backend's public API, deployed separately on Render.
// Locally (same server/port) this could be a relative '/api/public' path —
// but since embtel-final and blog-admin are hosted on different domains in
// production, this must be the full cross-origin URL.
var BLOG_URL = '/blog';
var BLOG_API_BASE = 'https://embtelsolutions.com/api/public';

document.getElementById('site-header').innerHTML = `
<nav>
  <div class="nav-blur"></div>
  <div class="nav-in">
    <a class="logo" href="/"><img src="images/logo.png" alt="embtel solutions" style="height:48px;width:auto;"></a>
    <ul class="nav-links">
      <li><a href="/" data-page="home">Home</a></li>
      <li><a href="/about" data-page="about">About</a></li>
      <li class="has-drop">
        <a href="/services" data-page="services">Services <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="vertical-align:middle;margin-left:2px"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <div class="nav-drop">
          <a href="/web-development" class="nd-item"><span class="nd-text"><strong>Web Development</strong><small>Websites, apps & landing pages</small></span></a>
          <a href="/digital-marketing" class="nd-item"><span class="nd-text"><strong>Digital Marketing</strong><small>SEO, content & growth strategy</small></span></a>
          <a href="/business-automation" class="nd-item"><span class="nd-text"><strong>Business Automation</strong><small>Workflows, CRM & billing automation</small></span></a>
          <a href="/ai-integrations" class="nd-item"><span class="nd-text"><strong>AI Integrations</strong><small>Chatbots, document AI & LLM workflows</small></span></a>
          <a href="/analytics-dashboards" class="nd-item"><span class="nd-text"><strong>Analytics & Dashboards</strong><small>Real-time data & custom dashboards</small></span></a>
          <a href="/seo-geo" class="nd-item"><span class="nd-text"><strong>SEO & GEO</strong><small>Paid ads, geo targeting & retargeting</small></span></a>
          <a href="/cybersecurity" class="nd-item"><span class="nd-text"><strong>Cybersecurity</strong><small>Security audits, compliance & protection</small></span></a>
          <a href="/e-commerce" class="nd-item"><span class="nd-text"><strong>E-Commerce</strong><small>Online stores, marketplaces & payments</small></span></a>
        </div>
      </li>
      <li class="has-drop">
        <a href="/industries" data-page="industries">Industries <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="vertical-align:middle;margin-left:2px"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <div class="nav-drop">
          <a href="/accounting-firm-industry" class="nd-item"><span class="nd-text"><strong>Accounting Firm</strong><small>Financial services & bookkeeping solutions</small></span></a>
          <a href="/cleaning-industry" class="nd-item"><span class="nd-text"><strong>Cleaning Industry</strong><small>Commercial & residential cleaning services</small></span></a>
          <a href="/cyber-security-industry" class="nd-item"><span class="nd-text"><strong>Cyber Security</strong><small>Protect your digital assets & data</small></span></a>
          <a href="/healthcare-industry" class="nd-item"><span class="nd-text"><strong>Healthcare</strong><small>Medical practices & health tech solutions</small></span></a>
          <a href="/home-services-industry" class="nd-item"><span class="nd-text"><strong>Home Services</strong><small>Home improvement & maintenance services</small></span></a>
          <a href="/immigration-firm-industry" class="nd-item"><span class="nd-text"><strong>Immigration Firm</strong><small>Visa & immigration legal services</small></span></a>
          <a href="/it-industry" class="nd-item"><span class="nd-text"><strong>IT Industry</strong><small>Technology & software solutions</small></span></a>
          <a href="/law-industry" class="nd-item"><span class="nd-text"><strong>Law Industry</strong><small>Legal firms & attorney services</small></span></a>
          <a href="/retail-industry" class="nd-item"><span class="nd-text"><strong>Retail Industry</strong><small>E-commerce & retail business solutions</small></span></a>
        </div>
      </li>
      <li><a href="/work" data-page="work">Work</a></li>
      <li><a href="/process" data-page="process">Process</a></li>
      <li><a href="${BLOG_URL}" data-page="blog">Blog</a></li>
      <li><a href="/contact" data-page="contact">Contact</a></li>
    </ul>
    <a class="nav-btn" href="https://api.leadconnectorhq.com/widget/booking/847QsLhZnPZ1OAGTTcNi?utm_source=google&utm_medium=organic">Get Started</a>
    <button class="hamburger" onclick="toggleMenu()" aria-label="Menu">
      <div class="hb"></div><div class="hb"></div><div class="hb"></div>
    </button>
  </div>
</nav>

<div class="mobile-menu" id="mob">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/services">Services</a>
  <a href="/web-development" class="mob-sub">Web Development</a>
  <a href="/digital-marketing" class="mob-sub">Digital Marketing</a>
  <a href="/business-automation" class="mob-sub">Business Automation</a>
  <a href="/ai-integrations" class="mob-sub">AI Integrations</a>
  <a href="/analytics-dashboards" class="mob-sub">Analytics & Dashboards</a>
  <a href="/seo-geo" class="mob-sub">SEO & GEO</a>
  <a href="/cybersecurity" class="mob-sub">Cybersecurity</a>
  <a href="/e-commerce" class="mob-sub">E-Commerce</a>
  <a href="/industries">Industries</a>
  <a href="/accounting-firm-industry" class="mob-sub">Accounting Firm</a>
  <a href="/cleaning-industry" class="mob-sub">Cleaning Industry</a>
  <a href="/cyber-security-industry" class="mob-sub">Cyber Security</a>
  <a href="/healthcare-industry" class="mob-sub">Healthcare</a>
  <a href="/home-services-industry" class="mob-sub">Home Services</a>
  <a href="/immigration-firm-industry" class="mob-sub">Immigration Firm</a>
  <a href="/it-industry" class="mob-sub">IT Industry</a>
  <a href="/law-industry" class="mob-sub">Law Industry</a>
  <a href="/retail-industry" class="mob-sub">Retail Industry</a>
  <a href="/work">Work</a>
  <a href="/process">Process</a>
  <a href="${BLOG_URL}">Blog</a>
  <a href="/contact">Contact</a>
</div>

<style>
.has-drop{position:relative}
.has-drop::before{content:'';position:absolute;bottom:-8px;left:0;right:0;height:8px;z-index:1002}
.nav-drop{position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(-4px);background:rgba(13,13,16,.97);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;min-width:580px;display:grid;grid-template-columns:1fr 1fr;gap:6px;opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.4);will-change:opacity,transform}
.has-drop:hover .nav-drop{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.has-drop > a{position:relative;z-index:1001}
.nav-drop::before{content:'';position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:12px;height:6px;background:rgba(13,13,16,.97);clip-path:polygon(50% 0%,0% 100%,100% 100%)}
.nd-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;color:#C4C4D1;transition:background .15s ease;text-decoration:none}
.nd-item:hover{background:rgba(255,255,255,.08)}
.nd-text strong{display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:2px}
.nd-text small{font-size:11.5px;color:#6B6B78;line-height:1.3}
#mob.mobile-menu{display:none;position:fixed;inset:68px 0 0;background:rgba(9,9,11,.97);backdrop-filter:blur(20px);z-index:998;flex-direction:column;align-items:center;justify-content:flex-start;padding:36px 0 100px;overflow-y:auto;gap:6px}
#mob.mobile-menu.open{display:flex}
#mob.mobile-menu a{font-family:'Manrope',sans-serif;font-size:26px;font-weight:700;color:#fff;padding:8px 24px;border-radius:8px;transition:all .15s;text-decoration:none}
#mob.mobile-menu a:hover{color:var(--teal)}
#mob.mobile-menu .mob-sub{font-size:17px;font-weight:600;color:#9898A6;padding:6px 24px 6px 48px;position:relative}
#mob.mobile-menu .mob-sub::before{content:'';position:absolute;left:26px;top:50%;transform:translateY(-50%);width:8px;height:2px;background:#6B6B78;border-radius:1px}
@media(max-width:960px){.nav-in{padding:0 20px}.footer-bot{flex-direction:column;gap:10px;text-align:center}}
</style>
<script>
(function(){
  var path = window.location.pathname.split('/').pop() || '';
  var map = {
    '':'home','index':'home','about':'about','services':'services',
    'work':'work','process':'process','blog':'blog','blog-details':'blog','contact':'contact',
    'web-development':'services','digital-marketing':'services','business-automation':'services',
    'ai-integrations':'services','analytics-dashboards':'services','seo-geo':'services','cybersecurity':'services','e-commerce':'services',
    'industries':'industries','accounting-firm-industry':'industries','cleaning-industry':'industries',
    'cyber-security-industry':'industries','healthcare-industry':'industries','home-services-industry':'industries',
    'immigration-firm-industry':'industries','it-industry':'industries','law-industry':'industries',
    'retail-industry':'industries'
  };
  var page = map[path] || 'home';
  var el = document.querySelector('.nav-links a[data-page="' + page + '"]');
  if (el) { 
    el.style.color = '#fff'; 
    el.style.fontWeight = '600'; 
  }
})();
</script>
`;
