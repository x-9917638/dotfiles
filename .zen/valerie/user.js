/* START: internal custom pref to test for syntax errors
 * [NOTE] Not all syntax errors cause parsing to abort i.e. reaching the last debug pref
 * no longer necessarily means that all prefs have been applied. Check the console right
 * after startup for any warnings/error messages related to non-applied prefs
 * [1] https://blog.mozilla.org/nnethercote/2018/03/09/a-new-preferences-parser-for-firefox/ ***/
user_pref("_user.js.parrot", "START: Meowwww");

// Startup
user_pref("browser.aboutConfig.showWarning", false);
user_pref("browser.startup.page", 3);
user_pref("browser.startup.homepage", "about:home");
user_pref("browser.newtabpage.enabled", true);
user_pref("browser.newtabpage.activity-stream.showSponsored", false);
user_pref("browser.newtabpage.activity-stream.showSponsoredTopSites", false);
user_pref("browser.newtabpage.activity-stream.default.sites", "");

// Geolocation
user_pref("geo.provider.use_geoclue", false);

// Locale
user_pref("intl.accept_languages", "en-US, en");
user_pref("javascript.use_us_english_locale", true);

// Recommendations
user_pref("extensions.getAddons.showPane", false);
user_pref("extensions.htmlaboutaddons.recommendations.enabled", false);
user_pref("browser.discovery.enabled", false);

// Telemetry
user_pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
user_pref("browser.newtabpage.activity-stream.telemetry", false);
user_pref("datareporting.policy.dataSubmissionEnabled", false);
user_pref("datareporting.healthreport.uploadEnabled", false);
user_pref("toolkit.telemetry.enabled", false); // [Default: false]
user_pref("toolkit.telemetry.unified", false);
user_pref("toolkit.telemetry.server", "data:,");
user_pref("toolkit.telemetry.archive.enabled", false);
user_pref("toolkit.telemetry.newProfilePing.enabled", false);
user_pref("toolkit.telemetry.shutdownPingSender.enabled", false);
user_pref("toolkit.telemetry.updatePing.enabled", false);
user_pref("toolkit.telemetry.bhrPing.enabled", false); // [bhr", Background Hang Reporter])
user_pref("toolkit.telemetry.firstShutdownPing.enabled", false);
user_pref("toolkit.telemetry.coverage.opt-out", true);
user_pref("toolkit.coverage.opt-out", true);
user_pref("toolkit.coverage.endpoint.base", "");

// Studies
user_pref("app.shield.optoutstudies.enabled", false);
user_pref("app.normandy.enabled", false);
user_pref("app.normandy.api_url", "");

// Crashes
user_pref("breakpad.reportURL", "");
user_pref("browser.tabs.crashReporting.sendReport", false);

// Safe Browsing
user_pref("browser.safebrowsing.malware.enabled", false);
user_pref("browser.safebrowsing.phishing.enabled", false);
user_pref("browser.safebrowsing.blockedURIs.enabled", false);
user_pref("browser.safebrowsing.provider.google4.gethashURL", "");
user_pref("browser.safebrowsing.provider.google4.updateURL", "");
user_pref("browser.safebrowsing.provider.google.gethashURL", "");
user_pref("browser.safebrowsing.provider.google.updateURL", "");
user_pref("browser.safebrowsing.provider.google4.dataSharingURL", "");
user_pref("browser.safebrowsing.downloads.enabled", false);
user_pref("browser.safebrowsing.downloads.remote.enabled", false);
user_pref("browser.safebrowsing.downloads.remote.url", "");
user_pref("browser.safebrowsing.downloads.remote.block_potentially_unwanted", false);
user_pref("browser.safebrowsing.downloads.remote.block_uncommon", false);
user_pref("browser.safebrowsing.allowOverride", true);

// Network
user_pref("network.prefetch-next", false);
user_pref("network.dns.disablePrefetch", true);
user_pref("network.dns.disablePrefetchFromHTTPS", true);
user_pref("network.predictor.enabled", false);
user_pref("network.http.speculative-parallel-limit", 0);
user_pref("browser.places.speculativeConnect.enabled", false);
user_pref("network.gio.supported-protocols", "");
user_pref("network.file.disable_unc_paths", true);
user_pref("permissions.manager.defaultsUrl", "");
user_pref("network.IDN_show_punycode", true);
user_pref("captivedetect.canonicalURL", "");
user_pref("network.captive-portal-service.enabled", false);
user_pref("network.connectivity-service.enabled", false);

// Search Bar: Suggestions, Autofill, Forms
user_pref("browser.urlbar.speculativeConnect.enabled", false);
user_pref("browser.urlbar.quicksuggest.enabled", false);
user_pref("browser.urlbar.suggest.quicksuggest.nonsponsored", false);
user_pref("browser.urlbar.suggest.quicksuggest.sponsored", false);
user_pref("browser.search.suggest.enabled", false);
user_pref("browser.urlbar.suggest.searches", false);
user_pref("browser.urlbar.trending.featureGate", false);
user_pref("browser.urlbar.addons.featureGate", false);
user_pref("browser.urlbar.mdn.featureGate", false);
user_pref("browser.urlbar.yelp.featureGate", false);
user_pref("browser.formfill.enable", false);
user_pref("extensions.formautofill.addresses.enabled", false);
user_pref("extensions.formautofill.creditCards.enabled", false);

// Passwords
user_pref("signon.rememberSignons", false);
user_pref("signon.autofillForms", false);
user_pref("signon.formlessCapture.enabled", false);
user_pref("network.auth.subresource-http-auth-allow", 1);

// Memory
user_pref("browser.sessionstore.privacy_level", 2);
user_pref("browser.pagethumbnails.capturing_disabled", true);
user_pref("browser.download.start_downloads_in_tmp_dir", true);
user_pref("browser.helperApps.deleteTempFileOnExit", true);

// HTTPS
user_pref("security.tls.enable_0rtt_data", false);
user_pref("security.OCSP.require", true);
user_pref("browser.xul.error_pages.expert_bad_cert", true);
user_pref("security.cert_pinning.enforcement_level", 2);
user_pref("security.remote_settings.crlite_filters.enabled", true);
user_pref("security.pki.crlite_mode", 2);
user_pref("dom.security.https_only_mode", true);
user_pref("dom.security.https_only_mode_send_http_background_request", false);

// Header
user_pref("network.http.referer.XOriginTrimmingPolicy", 2);

// Audio/Video
user_pref("media.peerconnection.enabled", false);
user_pref("webgl.disabled", true);

// Downloads
user_pref("browser.download.useDownloadDir", false);
user_pref("browser.download.manager.addToRecentDocs", false);
user_pref("browser.download.always_ask_before_handling_new_types", true);

// Cookies
user_pref("browser.contentblocking.category", "strict");

// UI
user_pref("dom.popup_allowed_events", "click dblclick mousedown pointerdown");
user_pref("pdfjs.enableScripting", false);
user_pref("privacy.userContext.enabled", true);
user_pref("privacy.userContext.ui.enabled", true);
user_pref("dom.forms.autocomplete.formautofill", true);
user_pref("browser.tabs.allow_transparent_browser", true);
user_pref("widget.transparent-windows", true);
user_pref("zen.widget.linux.transparency", true);
user_pref("browser.uiCustomization.state", '{"placements":{"widget-overflow-fixed-list":[],"unified-extensions-area":[],"nav-bar":["back-button","forward-button","stop-reload-button","customizableui-special-spring1","vertical-spacer","urlbar-container","customizableui-special-spring2","unified-extensions-button"],"toolbar-menubar":["menubar-items"],"TabsToolbar":["tabbrowser-tabs"],"vertical-tabs":[],"PersonalToolbar":[],"zen-sidebar-top-buttons":["zen-toggle-compact-mode"],"zen-sidebar-foot-buttons":["downloads-button","zen-workspaces-button","zen-create-new-button"]},"seen":["developer-button","screenshot-button"],"dirtyAreaCache":["nav-bar","vertical-tabs","zen-sidebar-foot-buttons","PersonalToolbar","toolbar-menubar","TabsToolbar","zen-sidebar-top-buttons"],"currentVersion":23,"newElementCount":2}');
user_pref("browser.urlbar.placeholderName", "Meow :3");

// Extensions
user_pref("extensions.enabledScopes", 5);
user_pref("extensions.postDownloadThirdPartyPrompt", true);

// RFP
user_pref("browser.display.use_system_colors", false);
user_pref("privacy.resistFingerprinting", false);
user_pref("privacy.window.maxInnerWidth", 1600);
user_pref("privacy.window.maxInnerHeight", 900);
user_pref("privacy.resistFingerprinting.letterboxing", false);
user_pref("privacy.resistFingerprinting.block_mozAddonManager", true);
user_pref("privacy.spoof_english", 1);
user_pref("browser.link.open_newwindow.restriction", 0);

// Shutdown
user_pref("privacy.sanitize.sanitizeOnShutdown", true);
user_pref("privacy.clearOnShutdown.cookies", true);
user_pref("privacy.clearOnShutdown.offlineApps", true);
user_pref("privacy.clearOnShutdown_v2.cookiesAndStorage", true);
user_pref("privacy.clearOnShutdown_v2.formdata", true);
user_pref("privacy.clearOnShutdown_v2.browsingHistoryAndDownloads", false);
user_pref("privacy.clearOnShutdown_v2.downloads", true);
user_pref("privacy.sanitize.timeSpan", 0);