import { useEffect } from 'react';

interface MetaOpts {
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  ogType?: string;
  jsonLd?: Record<string, any> | null;
}

function upsert(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => k !== 'content' && el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (attrs.content) el.setAttribute('content', attrs.content);
}

export function usePageMeta({ title, description, ogImage, ogType = 'profile', jsonLd }: MetaOpts) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;
    if (description) {
      upsert('meta[name="description"]', { name: 'description', content: description });
      upsert('meta[property="og:description"]', { property: 'og:description', content: description });
      upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    }
    if (title) {
      upsert('meta[property="og:title"]', { property: 'og:title', content: title });
      upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    }
    if (ogImage) {
      upsert('meta[property="og:image"]', { property: 'og:image', content: ogImage });
      upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });
    }
    upsert('meta[property="og:type"]', { property: 'og:type', content: ogType });
    upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });

    let ldEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      ldEl = document.createElement('script');
      ldEl.type = 'application/ld+json';
      ldEl.text = JSON.stringify(jsonLd);
      ldEl.dataset.artistPage = '1';
      document.head.appendChild(ldEl);
    }
    return () => {
      document.title = prevTitle;
      if (ldEl) ldEl.remove();
    };
  }, [title, description, ogImage, ogType, jsonLd && JSON.stringify(jsonLd)]);
}
