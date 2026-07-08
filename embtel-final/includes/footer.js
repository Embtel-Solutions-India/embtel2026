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
      <a href="web-development.html">Web Development</a>
      <a href="digital-marketing.html">Digital Marketing</a>
      <a href="business-automation.html">Business Automation</a>
      <a href="ai-integrations.html">AI Integrations</a>
      <a href="analytics-dashboards.html">Analytics & Dashboards</a>
      <a href="seo-geo.html">SEO & GEO</a>
      <a href="cybersecurity.html">Cybersecurity</a>
      <a href="e-commerce.html">E-Commerce</a>
    </div>
    <div class="f-col">
      <h4>Industries</h4>
      <a href="accounting-firm-industry.html">Accounting Firm</a>
      <a href="cleaning-industry.html">Cleaning Industry</a>
      <a href="cyber-security-industry.html">Cyber Security</a>
      <a href="healthcare-industry.html">Healthcare</a>
      <a href="home-services-industry.html">Home Services</a>
      <a href="immigration-firm-industry.html">Immigration Firm</a>
      <a href="it-industry.html">IT Industry</a>
      <a href="law-industry.html">Law Industry</a>
      <a href="retail-industry.html">Retail Industry</a>
    </div>
    <div class="f-col">
      <h4>Company</h4>
      <a href="about.html">About Us</a>
      <a href="work.html">Case Studies</a>
      <a href="process.html">Our Process</a>
      <a href="contact.html">Contact</a>
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
  if(pp) pp.addEventListener('click', function(){ window.location.href='privacy-policy.html'; });
  if(tos) tos.addEventListener('click', function(){ window.location.href='terms-of-service.html'; });
})();

/* Active nav link highlight (runs after header injection above) */
(function(){
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var map = {'index.html':'home','':'home','about.html':'about','services.html':'services','work.html':'work','process.html':'process','blog.html':'blog','contact.html':'contact'};
  var page = map[path] || 'home';
  var el = document.querySelector('.nav-links a[data-page="' + page + '"]');
  if (el) { el.style.color = '#fff'; el.style.fontWeight = '600'; }
})();

/* Elfsight WhatsApp Chat — loaded on every page */
(function(){
  var div = document.createElement('div');
  div.className = 'elfsight-app-19ff2c59-ec86-44cf-a7a1-29208dffa251';
  div.setAttribute('data-elfsight-app-lazy', '');
  document.body.appendChild(div);

  var s = document.createElement('script');
  s.src = 'https://elfsightcdn.com/platform.js';
  s.async = true;
  document.body.appendChild(s);
})();
