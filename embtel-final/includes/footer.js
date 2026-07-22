/* ─────────────────────────────────────────────────────────────
   SHARED FOOTER  (footer + WhatsApp float)
   Edit this file to update the footer on EVERY page at once.
   ───────────────────────────────────────────────────────────── */
document.getElementById('site-footer').innerHTML = `
<footer>
  <div class="footer-in">
    <div>
      <div class="f-logo"><img src="images/logo.png" alt="embtel solutions" style="height:48px;width:auto;"></div>
      <p class="f-desc">Embtel Solutions Ltd.
 delivers tailored web design, development, and digital marketing services focused on client success. We prioritize customer satisfaction through expert support and guidance at every stage.</p>
    </div>
    <div class="f-col">
      <h4>Services</h4>
      <a href="/web-development">Web Development</a>
      <a href="/digital-marketing">Digital Marketing</a>
      <a href="/business-automation">Business Automation</a>
      <a href="/ai-integrations">AI Integrations</a>
      <a href="/analytics-dashboards">Analytics & Dashboards</a>
      <a href="/seo-geo">SEO & GEO</a>
      <a href="/cybersecurity">Cybersecurity</a>
      <a href="/e-commerce">E-Commerce</a>
    </div>
    <div class="f-col">
      <h4>Industries</h4>
      <a href="/accounting-firm-industry">Accounting Firm</a>
      <a href="/cleaning-industry">Cleaning Industry</a>
      <a href="/cyber-security-industry">Cyber Security</a>
      <a href="/healthcare-industry">Healthcare</a>
      <a href="/home-services-industry">Home Services</a>
      <a href="/immigration-firm-industry">Immigration Firm</a>
      <a href="/it-industry">IT Industry</a>
      <a href="/law-industry">Law Industry</a>
      <a href="/retail-industry">Retail Industry</a>
    </div>
    <div class="f-col">
      <h4>Company</h4>
      <a href="/about">About Us</a>
      <a href="/work">Case Studies</a>
      <a href="/process">Our Process</a>
      <a href="${BLOG_URL}">Blog</a>
      <a href="/contact">Contact</a>
    </div>
    <div class="f-col">
      <h4>Contact US</h4>
      <a href="mailto:info@embtelsolutions.com">info@embtelsolutions.com</a>
      <a href="tel:+15109627900">+1 (510) 962-7900</a>
      <div class="f-social">
        <a href="https://www.facebook.com/embtelsolutionsinc" target="_blank" rel="noopener" aria-label="Facebook" class="f-soc f-fb">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>
        <a href="https://instagram.com/embtelsolutions" target="_blank" rel="noopener" aria-label="Instagram" class="f-soc f-ig">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/embtel-solutions-inc-2/" target="_blank" rel="noopener" aria-label="LinkedIn" class="f-soc f-li">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
        <a href="https://twitter.com/embtelsolutions" target="_blank" rel="noopener" aria-label="X (Twitter)" class="f-soc f-x">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
      </div>
    </div>
  </div>
  <div class="footer-bot">
    <span>Copyright 2026 Embtel Solutions- All Rights Reserved. Designed by Embtel Solutions, Inc. </span>
    <span class="footer-legal"><span class="fl-pp">Privacy Policy</span> · <span class="fl-tos">Terms of Service</span></span>
  </div>
</footer>

<style>
.f-social{display:flex;gap:18px;margin-top:16px;flex-wrap:wrap;align-items:center}
.f-soc{display:inline-flex;align-items:center;justify-content:center;color:#C4C4D1;transition:all .2s}
.f-soc svg{display:block;width:20px;height:20px}
.f-soc:hover{transform:translateY(-2px)}
.f-soc.f-fb:hover{color:#1877F2}
.f-soc.f-ig:hover{color:#E4405F}
.f-soc.f-li:hover{color:#0A66C2}
.f-soc.f-x:hover{color:#fff}
.footer-legal{margin-right:90px}.footer-legal span{color:#a0a0b0;cursor:pointer;transition:color .2s}
.footer-legal span:hover{color:#fff;text-decoration:underline}
.footer-in{grid-template-columns:2fr 1fr 1fr 1fr 1fr !important;gap:48px}
@media(max-width:960px){.footer-in{grid-template-columns:1fr !important}}
</style>
`;

/* Legal link navigation */
(function(){
  var pp = document.querySelector('#site-footer .fl-pp');
  var tos = document.querySelector('#site-footer .fl-tos');
  if(pp) pp.addEventListener('click', function(){ window.location.href='/privacy-policy'; });
  if(tos) tos.addEventListener('click', function(){ window.location.href='/terms-of-service'; });
})();

/* Active nav link highlight (runs after header injection above) */
(function(){
  var path = window.location.pathname.split('/').pop() || '';
  var map = {'':'home','index':'home','about':'about','services':'services','work':'work','process':'process','blog':'blog','blog-details':'blog','contact':'contact'};
  var page = map[path] || 'home';
  var el = document.querySelector('.nav-links a[data-page="' + page + '"]');
  if (el) { el.style.color = '#fff'; el.style.fontWeight = '600'; }
})();

/* Elfsight WhatsApp Chat — loaded on every page */
(function(){
  var div = document.createElement('div');
  div.className = 'elfsight-app-19ff2c59-ec86-44cf-a7a1-29208dffa251';
  document.body.appendChild(div);

  var s = document.createElement('script');
  s.src = 'https://elfsightcdn.com/platform.js';
  s.async = true;
  document.body.appendChild(s);
})();

/* Self-hosted WhatsApp float (fallback — hides itself if Elfsight renders) */
(function(){
  var wrap = document.createElement('div');
  wrap.id = 'wa-fallback';
  wrap.innerHTML = `
    <a href="https://wa.me/15109627900?text=Hi%20Embtel%20Solutions%2C%20I%27d%20like%20to%20know%20more%20about%20your%20services." target="_blank" rel="noopener" aria-label="Chat on WhatsApp" class="waf-bubble">
      <svg viewBox="0 0 32 32" width="30" height="30" fill="#fff"><path d="M16.004 3C9.383 3 4 8.383 4 15.004c0 2.117.553 4.185 1.604 6.008L4 29l8.184-1.576a11.94 11.94 0 0 0 3.82.627h.001C22.625 28.05 28 22.667 28 16.046 28 8.383 22.625 3 16.004 3zm0 21.988h-.001a9.94 9.94 0 0 1-3.505-.643l-.251-.096-4.858.936.99-4.735-.164-.26a9.93 9.93 0 0 1-1.559-5.186c0-5.514 4.486-10 10.001-10 5.514 0 10 4.486 10 10s-4.486 9.984-10.653 9.984zm5.487-7.474c-.301-.15-1.781-.879-2.057-.979-.276-.101-.477-.15-.677.15-.201.301-.777.979-.953 1.18-.175.2-.351.226-.652.075-.301-.15-1.271-.468-2.42-1.493-.895-.798-1.499-1.784-1.674-2.085-.176-.301-.019-.464.132-.613.135-.135.301-.352.451-.528.151-.176.201-.301.301-.502.101-.2.05-.376-.025-.527-.075-.15-.677-1.63-.927-2.232-.244-.586-.492-.507-.677-.516l-.576-.01c-.2 0-.527.075-.803.376s-1.054 1.03-1.054 2.51 1.079 2.912 1.229 3.113c.15.2 2.123 3.242 5.144 4.546.719.31 1.28.495 1.717.634.722.229 1.379.197 1.898.119.579-.086 1.781-.728 2.032-1.431.251-.703.251-1.305.176-1.431-.075-.125-.276-.2-.577-.351z"/></svg>
    </a>
    <style>
      #wa-fallback{position:fixed;bottom:28px;right:28px;z-index:999}
      #wa-fallback .waf-bubble{background:#25D366;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(37,211,102,.45);transition:transform .25s,box-shadow .25s;text-decoration:none}
      #wa-fallback .waf-bubble:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(37,211,102,.6)}
      @media(max-width:960px){#wa-fallback{bottom:20px;right:20px}}
    </style>`;
  document.body.appendChild(wrap);

  /* Hide fallback if the Elfsight widget actually renders */
  var checks = 0;
  var t = setInterval(function(){
    var el = document.querySelector('.elfsight-app-19ff2c59-ec86-44cf-a7a1-29208dffa251');
    if (el && el.children.length > 0) {
      wrap.style.display = 'none';
      clearInterval(t);
    }
    if (++checks > 20) clearInterval(t);
  }, 500);
})();
