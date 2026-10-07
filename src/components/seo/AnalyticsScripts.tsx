// src/components/seo/AnalyticsScripts.tsx
//
// Site-wide (not per-page) SEO/analytics tags: Google Search Console verification,
// GA4, and Meta (Facebook) Pixel. Mounted once in App.tsx so it's present on every
// page without every page's own PageSeo needing to know about it.

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useSeoSettings } from "../../context/SeoContext";
import { trackMetaPageView } from "../../utils/metaPixel";

export default function AnalyticsScripts() {
  const { seo } = useSeoSettings();
  const location = useLocation();
  const isFirstRender = useRef(true);

  // Track PageView on route navigation for Meta Pixel
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (seo.metaPixelId) {
      trackMetaPageView();
    }
  }, [location.pathname, location.search, seo.metaPixelId]);

  if (!seo.googleSiteVerification && !seo.gaMeasurementId && !seo.metaPixelId) {
    return null;
  }

  return (
    <Helmet>
      {seo.googleSiteVerification && (
        <meta name="google-site-verification" content={seo.googleSiteVerification} />
      )}
      {seo.gaMeasurementId && (
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${seo.gaMeasurementId}`} />
      )}
      {seo.gaMeasurementId && (
        <script>{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${seo.gaMeasurementId}');
        `}</script>
      )}
      {seo.metaPixelId && (
        <script>{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${seo.metaPixelId}');
          fbq('track', 'PageView');
        `}</script>
      )}
      {seo.metaPixelId && (
        <noscript>{`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${seo.metaPixelId}&ev=PageView&noscript=1" />`}</noscript>
      )}
    </Helmet>
  );
}

