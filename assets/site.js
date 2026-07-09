    // Sticky white header: slides in (with shadow) after you scroll past the top, on every page.
    // Home measures its transparent header; other pages use the same distance via INNER_THRESHOLD.
    (function(){
      var headerMain = document.getElementById('headerMain');
      if(!headerMain) return;
      var headerTop = document.querySelector('.header-top');
      var INNER_THRESHOLD = 340;   // matches the home transparent-header height (~346), so inner pages reveal at the same scroll
      // Inner pages (no transparent header): clone the header into a static bar at the top so it is
      // present on load and scrolls away with the page; the fixed .header-main then slides back in.
      if(!headerTop && document.body.getAttribute('data-page') !== 'home'){
        var flow = headerMain.cloneNode(true);
        flow.removeAttribute('id');
        flow.className = 'header-flow';
        headerMain.parentNode.insertBefore(flow, headerMain.nextSibling);
      }
      function threshold(){ return headerTop ? headerTop.offsetHeight - 8 : INNER_THRESHOLD; }
      var t = threshold();
      function onScroll(){
        if(window.scrollY > t){ headerMain.classList.add('show'); }
        else{ headerMain.classList.remove('show'); }
      }
      window.addEventListener('scroll', onScroll, { passive:true });
      window.addEventListener('resize', function(){ t = threshold(); onScroll(); });
      onScroll();
    })();

    // Launch-list modal: one shared dialog (a second copy of the sign-up form), injected once.
    // Opened by every ".btn" LINK whose text starts with "Join" (all CTAs across the site).
    // The home hero form is a <button type=submit>, not a link, so it stays inline and is never trapped here.
    (function(){
      var X = '<svg viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
      var modal = document.createElement('div');
      modal.className = 'modal'; modal.id = 'launchModal'; modal.hidden = true;
      modal.innerHTML =
        '<div class="modal-overlay" data-modal-close></div>' +
        '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="launchModalTitle">' +
          '<button class="modal-x" type="button" aria-label="Close" data-modal-close>' + X + '</button>' +
          '<span class="eyebrow">Waitlist</span>' +
          '<h2 id="launchModalTitle">Join the <b>waitlist</b></h2>' +
          '<p class="modal-sub">One email when HerdMaster goes live. Free tier at launch, no credit card, no spam.</p>' +
          '<form class="capture" data-capture data-formid="launch-list-modal" novalidate>' +
            '<input type="email" name="email" placeholder="Enter your email" aria-label="Email address" required>' +
            '<input type="text" name="lc_tag" value="Launch List" style="display:none" aria-hidden="true" tabindex="-1">' +
            '<button type="submit" class="btn btn-primary">Join Waitlist</button>' +
          '</form>' +
          '<p class="form-note" data-note aria-live="polite"></p>' +
        '</div>';
      document.body.appendChild(modal);

      var lastFocus = null;
      function open(){
        lastFocus = document.activeElement;
        modal.hidden = false; document.body.classList.add('modal-open');
        var input = modal.querySelector('input'); if(input) input.focus();
      }
      function close(){
        modal.hidden = true; document.body.classList.remove('modal-open');
        var note = modal.querySelector('[data-note]'); if(note) note.textContent = '';
        if(lastFocus && lastFocus.focus) lastFocus.focus();
      }
      document.addEventListener('click', function(e){
        if(!e.target.closest) return;
        if(e.target.closest('[data-modal-close]')){ close(); return; }
        if(modal.contains(e.target)) return;                 // clicks inside the modal card
        var cta = e.target.closest('a.btn');
        if(cta && /^join\b/i.test((cta.textContent || '').trim())){ e.preventDefault(); open(); }
      });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !modal.hidden) close(); });
    })();

    // Mobile menu: shared full-height panel toggled by either header's hamburger
    (function(){
      var toggles = document.querySelectorAll('.nav-toggle');
      function setOpen(open){
        document.body.classList.toggle('menu-open', open);
        toggles.forEach(function(t){ t.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      }
      toggles.forEach(function(t){
        t.addEventListener('click', function(){ setOpen(!document.body.classList.contains('menu-open')); });
      });
      document.querySelectorAll('.mnav a').forEach(function(a){
        a.addEventListener('click', function(){ setOpen(false); });
      });
      window.addEventListener('resize', function(){ if(window.innerWidth > 860) setOpen(false); });
    })();

    // FAQ accordion, one open at a time
    (function(){
      var items = document.querySelectorAll('.faq-item');
      items.forEach(function(item){
        var q = item.querySelector('.faq-q'); var a = item.querySelector('.faq-a');
        q.addEventListener('click', function(){
          var isOpen = item.classList.contains('open');
          items.forEach(function(o){ o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight=null; o.querySelector('.faq-q').setAttribute('aria-expanded','false'); });
          if(!isOpen){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; q.setAttribute('aria-expanded','true'); }
        });
      });
    })();

    // Launch-list capture (mockup, no backend yet)
    (function(){
      document.querySelectorAll('[data-capture]').forEach(function(form){
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var input = form.querySelector('input[type=email]');
          var note = form.parentElement.querySelector('[data-note]');
          var val = (input.value||'').trim();
          var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
          if(note){ note.textContent = ok ? "Thanks, you're on the list. We'll email you when it's live." : "Please enter a valid email address."; }
          if(ok){ input.value=''; }
        });
      });
    })();

    // Scroll reveal
    (function(){
      var els = document.querySelectorAll('.fade');
      if(!('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.add('in'); }); return; }
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold:.12, rootMargin:'0px 0px -40px 0px' });
      els.forEach(function(el){ io.observe(el); });
    })();

    // Equalize hero bubble heights: all bubbles match the tallest (e.g. when a label wraps)
    (function(){
      function equalize(){
        var bs = Array.prototype.slice.call(document.querySelectorAll('.hero-stage .bubble, .hero-stage .as-badge'));
        if(!bs.length) return;
        bs.forEach(function(b){ b.style.minHeight=''; });
        var max=0; bs.forEach(function(b){ var h=b.getBoundingClientRect().height; if(h>max) max=h; });
        bs.forEach(function(b){ b.style.minHeight=max+'px'; });
      }
      equalize();
      window.addEventListener('load', equalize);
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(equalize); }
      var t; window.addEventListener('resize', function(){ clearTimeout(t); t=setTimeout(equalize, 150); });
    })();

    // Hero phone: scroll-link the dashboard so it appears to scroll inside the frame as the page scrolls
    (function(){
      var scroller = document.querySelector('.hero .au-scroll');
      var view = document.querySelector('.hero .au-view');
      if(!scroller || !view) return;
      if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var ticking=false;
      function update(){
        ticking=false;
        if(window.innerWidth <= 860){ scroller.style.transform=''; return; }   // static on mobile
        var maxShift = scroller.scrollHeight - view.clientHeight;
        if(maxShift <= 0){ scroller.style.transform=''; return; }
        var range = Math.max(1, window.innerHeight * 0.9);
        var p = Math.min(1, Math.max(0, window.scrollY / range));
        scroller.style.transform = 'translateY(' + (-maxShift * p).toFixed(1) + 'px)';
      }
      window.addEventListener('scroll', function(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } }, { passive:true });
      window.addEventListener('resize', update);
      update();
    })();

    // Contact form (accessible, mock submit, honeypot). Wire [GHL FORM ENDPOINT] or swap for GHL's native form later.
    (function(){
      var forms = document.querySelectorAll('[data-contact]');
      forms.forEach(function(form){
        // Keep the hidden lc_tag_* fields in sync BEFORE submit, since the
        // tracking script reads FormData in the capture phase (fires before
        // this handler), so values must already be current when clicked.
        var topicSel = form.querySelector('select[name=topic]');
        var topicTag = form.querySelector('input[name=lc_tag_topic]');
        if(topicSel && topicTag){
          topicSel.addEventListener('change', function(){
            topicTag.value = 'Topic: ' + topicSel.value;
          });
        }
        var launchCheck = form.querySelector('input[name=launchopt]');
        var launchTag = form.querySelector('input[name=lc_tag_launchlist]');
        if(launchCheck && launchTag){
          launchCheck.addEventListener('change', function(){
            launchTag.value = launchCheck.checked ? 'Launch List' : '';
          });
        }
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var hp = form.querySelector('.hp input');           // honeypot, must stay empty
          if(hp && hp.value){ return; }
          var status = form.querySelector('[data-status]');
          var email = form.querySelector('input[type=email]');
          var val = (email && email.value || '').trim();
          var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
          if(!ok){ if(status){ status.textContent = 'Please enter a valid email address.'; } if(email){ email.focus(); } return; }
          // TODO: POST to [GHL FORM ENDPOINT], or replace this form with GHL's native CRM form element.
          form.reset();
          if(status){ status.textContent = "Thanks, we'll be in touch."; }
        });
      });
    })();

    // Features hero: scale the fixed 680x600 composition (.fhx-stage) to fit its column width.
    (function(){
      var DESIGN_W = 680, DESIGN_H = 600;
      var frames = document.querySelectorAll('.fhx-frame');
      if(!frames.length) return;
      function fit(frame){
        var stage = frame.querySelector('.fhx-stage'); if(!stage) return;
        if(window.innerWidth <= 700){ stage.style.transform=''; frame.style.height=''; return; }  // mobile: CSS stacks it
        var s = frame.clientWidth / DESIGN_W;
        stage.style.transform = 'scale(' + s + ')';
        frame.style.height = (DESIGN_H * s) + 'px';
      }
      function fitAll(){ frames.forEach(fit); }
      fitAll();
      if(window.ResizeObserver){ var ro = new ResizeObserver(fitAll); frames.forEach(function(f){ ro.observe(f); }); }
      window.addEventListener('resize', fitAll);
      if(document.fonts && document.fonts.ready){ document.fonts.ready.then(fitAll); }
    })();

    // Features: scale the inlined pedigree document (.ped-doc, 1080px design width) to fit its panel.
    (function(){
      var DESIGN_W = 1080;
      var docs = document.querySelectorAll('.fp-doc');
      if(!docs.length) return;
      function fit(box){
        var doc = box.querySelector('.ped-doc'); if(!doc) return;
        var s = box.clientWidth / DESIGN_W;
        doc.style.transform = 'scale(' + s + ')';
        box.style.height = (doc.offsetHeight * s) + 'px';   // offsetHeight = unscaled layout height
      }
      function fitAll(){ docs.forEach(fit); }
      fitAll();
      if(window.ResizeObserver){ var ro = new ResizeObserver(fitAll); docs.forEach(function(b){ ro.observe(b); }); }
      window.addEventListener('resize', fitAll);
    })();

    // Getting Started guide: highlight the table-of-contents link for the section in view.
    (function(){
      var toc = document.querySelector('.guide-toc'); if(!toc) return;
      var links = Array.prototype.slice.call(toc.querySelectorAll('ol a[href^="#"]'));
      var map = {}; links.forEach(function(a){ map[a.getAttribute('href').slice(1)] = a; });
      var secs = Array.prototype.slice.call(document.querySelectorAll('.guide-sec'));
      if(!secs.length || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting){
            links.forEach(function(a){ a.classList.remove('active'); });
            var a = map[en.target.id]; if(a) a.classList.add('active');
          }
        });
      }, { rootMargin:'-45% 0px -50% 0px', threshold:0 });
      secs.forEach(function(s){ io.observe(s); });
    })();

    // Features: scroll-linked parallax removed; feature-page screens are static crops.

    // Features: vertical pill rail switches the pre-stacked screens inside .fs3-phone
    // (crossfade opacity, no reload); the rail label reflects the active screen name.
    (function(){
      var rails = document.querySelectorAll('.fs3-rail');
      if(!rails.length) return;
      Array.prototype.forEach.call(rails, function(rail){
        var nameEl = rail.querySelector('.fs3-rail-name');
        rail.addEventListener('click', function(e){
          var btn = e.target.closest ? e.target.closest('.fs3-pill') : null;
          if(!btn || btn.classList.contains('on')) return;
          var phone = rail.parentElement.querySelector('.fs3-phone'); if(!phone) return;
          var target = phone.querySelector('.au[data-screen="' + btn.getAttribute('data-screen') + '"]');
          if(!target) return;
          rail.querySelectorAll('.fs3-pill').forEach(function(c){ c.classList.remove('on'); });
          btn.classList.add('on');
          phone.querySelectorAll('.au[data-screen]').forEach(function(f){ f.classList.remove('show'); });
          target.classList.add('show');
          if(nameEl) nameEl.textContent = btn.getAttribute('aria-label');
        });
      });
    })();

    // Legal pages: Website vs HerdMaster-app policy tabs (ARIA tablist, arrow-key nav, deep-link aware).
    (function(){
      var groups = document.querySelectorAll('.legal-tabs');
      if(!groups.length) return;
      Array.prototype.forEach.call(groups, function(tabs){
        var buttons = Array.prototype.slice.call(tabs.querySelectorAll('.legal-tab'));
        function activate(btn, focus){
          buttons.forEach(function(b){
            var on = b === btn;
            b.setAttribute('aria-selected', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
            var panel = document.getElementById(b.getAttribute('aria-controls'));
            if(panel) panel.hidden = !on;
          });
          if(focus) btn.focus();
        }
        tabs.addEventListener('click', function(e){
          var btn = e.target.closest ? e.target.closest('.legal-tab') : null;
          if(btn) activate(btn);
        });
        tabs.addEventListener('keydown', function(e){
          var i = buttons.indexOf(document.activeElement);
          if(i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
          e.preventDefault();
          activate(buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length], true);
        });
        // Deep link: if the URL hash points into a non-default panel, open that tab.
        if(location.hash.length > 1){
          var target = document.getElementById(location.hash.slice(1));
          var panel = target && target.closest ? target.closest('.legal-panel') : null;
          if(panel){
            var btn = tabs.querySelector('[aria-controls="' + panel.id + '"]');
            if(btn && btn.getAttribute('aria-selected') !== 'true'){ activate(btn); target.scrollIntoView(); }
          }
        }
      });
    })();

    // Footer: set the copyright year dynamically (avoids a hardcoded year going stale).
    (function(){
      var y = String(new Date().getFullYear());
      Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function(el){ el.textContent = y; });
    })();

    // Speed comparison band (Features #speed): count the two stopwatches up ONCE when the
    // band scrolls into view, then disconnect. Renders the finished state under reduced motion.
    (function(){
      var band = document.querySelector('[data-spd]');
      if(!band) return;
      var R = 54, C = 2*Math.PI*R;
      var hmRing = band.querySelector('[data-spd-ring="hm"]'), ebRing = band.querySelector('[data-spd-ring="eb"]');
      var hmNum  = band.querySelector('[data-spd-num="hm"]'),  ebNum  = band.querySelector('[data-spd-num="eb"]');
      var hmBox  = band.querySelector('[data-spd-status="hm"]'), ebBox = band.querySelector('[data-spd-status="eb"]');
      var HM_T = 1500, EB_T = 2600, HM_FRAC = 45/78;   /* EB is 1.73x longer, matching 45s vs 78s */

      function fmt(s){ var m = Math.floor(s/60), ss = String(s%60); if(ss.length<2) ss = '0'+ss; return m+':'+ss; }
      function paint(hp, ep){
        hmRing.setAttribute('stroke-dashoffset', C - C*HM_FRAC*hp);
        ebRing.setAttribute('stroke-dashoffset', C - C*ep);
        hmNum.textContent = Math.round(45*hp);
        ebNum.textContent = fmt(Math.round(78*ep));
        hmBox.classList.toggle('is-done', hp >= 1);
        ebBox.classList.toggle('is-done', ep >= 1);
      }
      hmRing.setAttribute('stroke-dasharray', C);
      ebRing.setAttribute('stroke-dasharray', C);

      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduce){ paint(1,1); return; }
      paint(0,0);

      function run(){
        var t0 = null;
        requestAnimationFrame(function frame(now){
          if(t0 === null) t0 = now;
          var e = now - t0;
          paint(Math.min(e/HM_T,1), Math.min(e/EB_T,1));
          if(e < EB_T) requestAnimationFrame(frame);
        });
      }

      if(!('IntersectionObserver' in window)){ run(); return; }
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){ if(en.isIntersecting){ run(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(band);
    })();
