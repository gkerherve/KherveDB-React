(function() {
    var REJECT = /^(reject all|reject|reject all cookies|reject non-essential|reject non-essential cookies|reject optional cookies|deny all|decline|decline all|refuse|refuse all|deny|only necessary|necessary only|use necessary cookies only|allow necessary cookies only|essential cookies only|only essential cookies|continue without accepting|tout refuser|refuser)$/i;
    var IDS = ['onetrust-reject-all-handler', 'CybotCookiebotDialogBodyButtonDecline', 'truste-consent-required',
               'cookieChoiceDismiss'];  // Blogger notice has only 'Got it'
    var SEL = '[data-testid=uc-deny-all-button], button[data-action=deny], .cmpboxbtnno';
    var HIDE = '#onetrust-consent-sdk,#onetrust-banner-sdk,.onetrust-pc-dark-filter,#CybotCookiebotDialog,' +
               '#usercentrics-root,#cookieChoiceInfo,.cc-window,.cookie-banner,#cookie-banner,.cookie-notice,#cookie-notice,.cmp-container,#truste-consent-track';
    function run() {
        try {
            for (var i = 0; i < IDS.length; i++) {
                var b = document.getElementById(IDS[i]);
                if (b && b.offsetParent !== null) { b.click(); return true; }
            }
            // Search the page and any shadow roots (e.g. Usercentrics)
            var roots = [document];
            document.querySelectorAll('*').forEach(function(e) { if (e.shadowRoot) roots.push(e.shadowRoot); });
            for (var r = 0; r < roots.length; r++) {
                var d = roots[r].querySelector(SEL);
                if (d) { d.click(); return true; }
                var els = roots[r].querySelectorAll('button, [role=button], input[type=button], input[type=submit], a');
                for (var j = 0; j < els.length; j++) {
                    var t = (els[j].innerText || els[j].value || '').trim().replace(/\s+/g, ' ');
                    if (t.length < 50 && REJECT.test(t) && els[j].getClientRects().length) { els[j].click(); return true; }
                }
            }
        } catch (e) {}
        return false;
    }
    function hide() {
        try {
            if (document.getElementById('kdb-cookie-css') || !document.head) return;
            var s = document.createElement('style');
            s.id = 'kdb-cookie-css';
            s.textContent = HIDE + '{display:none !important;} body{overflow:auto !important;}';
            document.head.appendChild(s);
        } catch (e) {}
    }
    // Banners with no reject button (TrustArc) are hidden straight away
    function hideNow() {
        if (!document.head) { setTimeout(hideNow, 50); return; }
        var s = document.createElement('style');
        s.textContent = '#truste-consent-track,.truste_overlay,.truste_box_overlay,#truste-consent-content' +
                        '{display:none !important;} html,body{overflow:auto !important;}';
        document.head.appendChild(s);
    }
    hideNow();
    var tries = 0;
    var timer = setInterval(function() {
        tries++;
        if (run() || tries > 40) { clearInterval(timer); if (tries > 40) hide(); }
    }, 500);
})();
