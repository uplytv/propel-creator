import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ExternalLink, ArrowDown, ArrowUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const sb = supabase as unknown as any;

const BG_PRESETS = [
  { name: 'Royal', value: '#0A0E27' },
  { name: 'Midnight', value: '#0A0A0A' },
  { name: 'Crimson', value: '#1A0808' },
  { name: 'Forest', value: '#0A1A14' },
  { name: 'Sand', value: '#1A1612' },
];

const SOCIAL_FIELDS = [
  'instagram', 'tiktok', 'spotify', 'apple_music', 'soundcloud', 'youtube', 'x', 'threads', 'bandcamp',
];

const ALL_SECTIONS = ['hero', 'social', 'music', 'shows', 'remixes', 'djsets', 'about'];

export default function ArtistPageEditorAdvanced() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slugAvailable, setSlugAvailable] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle');
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!id) return;
    sb.from('artist_profiles').select('*').eq('user_id', id).maybeSingle().then(({ data }: any) => {
      setProfile(data ?? { user_id: id, page_theme: { background_color: '#0A0E27', accent_color: '#3D7CFF', accent_color_2: '#B025FF', text_color: '#FFFFFF', show_powered_by: true }, social_links: {}, section_order: ALL_SECTIONS, section_visibility: { hero: true, social: true, music: true, shows: true, remixes: true, djsets: true, about: true } });
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-6 text-white">Loading…</div>;
  if (!user || user.id !== id) return <div className="p-6 text-white">Not authorized.</div>;
  if (!profile) return <div className="p-6 text-white">Profile not found.</div>;

  const update = (patch: any) => setProfile((p: any) => ({ ...p, ...patch }));
  const updateTheme = (patch: any) => update({ page_theme: { ...(profile.page_theme || {}), ...patch } });
  const updateSocial = (k: string, v: string) => update({ social_links: { ...(profile.social_links || {}), [k]: v || null } });
  const updateVisibility = (k: string, v: boolean) => update({ section_visibility: { ...(profile.section_visibility || {}), [k]: v } });

  const moveSection = (idx: number, dir: -1 | 1) => {
    const order = [...(profile.section_order || ALL_SECTIONS)];
    const swap = idx + dir;
    if (swap <= 0 || swap >= order.length) return; // hero is pinned at 0
    [order[idx], order[swap]] = [order[swap], order[idx]];
    update({ section_order: order });
  };

  const checkSlug = async (slug: string) => {
    if (!slug) return setSlugAvailable('idle');
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(slug)) return setSlugAvailable('invalid');
    setSlugAvailable('checking');
    const { data } = await sb.from('artist_profiles').select('id, user_id').eq('vanity_slug', slug).maybeSingle();
    if (!data || data.user_id === user.id) setSlugAvailable('ok');
    else setSlugAvailable('taken');
  };

  const save = async () => {
    const wasPublishedBefore = !!profile.id && profile.page_published;
    const hadSlugBefore = !!profile.id && !!profile.vanity_slug;
    const payload = {
      user_id: user.id,
      vanity_slug: profile.vanity_slug || null,
      page_theme: profile.page_theme || {},
      hero_image_url: profile.hero_image_url || null,
      hero_logo_url: profile.hero_logo_url || null,
      tagline: profile.tagline || null,
      about_md: profile.about_md || null,
      section_order: profile.section_order || ALL_SECTIONS,
      section_visibility: profile.section_visibility || {},
      page_published: !!profile.page_published,
      seo_title: profile.seo_title || null,
      seo_description: profile.seo_description || null,
      seo_og_image: profile.seo_og_image || null,
      social_links: profile.social_links || {},
    };
    const { error } = profile.id
      ? await sb.from('artist_profiles').update(payload).eq('id', profile.id)
      : await sb.from('artist_profiles').insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Saved');
    if (!hadSlugBefore && profile.vanity_slug) setShowCelebration(true);
  };

  const uploadImage = async (file: File, field: 'hero_image_url' | 'hero_logo_url' | 'seo_og_image') => {
    if (!user) return;
    const path = `${user.id}/${field}-${Date.now()}-${file.name}`;
    const { error } = await sb.storage.from('content-media').upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data: pub } = sb.storage.from('content-media').getPublicUrl(path);
    update({ [field]: pub.publicUrl });
  };

  const publicUrl = profile.vanity_slug ? `${window.location.origin}/@${profile.vanity_slug}` : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="grid lg:grid-cols-2">
        <div className="p-6 max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Artist page editor</h1>
            <p className="text-sm text-white/60">Customize your public landing page.</p>
          </div>

          <Accordion type="multiple" defaultValue={['url', 'hero', 'theme', 'sections', 'social', 'about', 'seo', 'publish', 'share']} className="space-y-2">
            <AccordionItem value="url" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Vanity URL</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-white/60 text-sm whitespace-nowrap">uply.tv/@</span>
                  <Input
                    value={profile.vanity_slug || ''}
                    onChange={(e) => { update({ vanity_slug: e.target.value.toLowerCase() }); checkSlug(e.target.value.toLowerCase()); }}
                    placeholder="yourhandle"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="text-xs">
                  {slugAvailable === 'checking' && <span className="text-white/50">Checking…</span>}
                  {slugAvailable === 'ok' && <span className="text-green-400">✓ Available</span>}
                  {slugAvailable === 'taken' && <span className="text-red-400">Taken</span>}
                  {slugAvailable === 'invalid' && <span className="text-red-400">Invalid format (lowercase letters, numbers, _ and -, 3–30 chars)</span>}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hero" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Hero</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <Label>Hero image</Label>
                <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'hero_image_url')} />
                {profile.hero_image_url && <img src={profile.hero_image_url} alt="" loading="lazy" className="max-h-40 rounded" />}
                <Label>Hero logo (PNG/SVG)</Label>
                <Input type="file" accept="image/png,image/svg+xml" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'hero_logo_url')} />
                {profile.hero_logo_url && <img src={profile.hero_logo_url} alt="" loading="lazy" className="max-h-20" />}
                <Label>Tagline</Label>
                <Input maxLength={120} value={profile.tagline || ''} onChange={(e) => update({ tagline: e.target.value })} placeholder="Short tagline" className="bg-white/5 border-white/10" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="theme" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Theme</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <Label>Background color</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {BG_PRESETS.map((p) => (
                      <button key={p.value} type="button" onClick={() => updateTheme({ background_color: p.value })} className="w-10 h-10 rounded-full border-2" style={{ background: p.value, borderColor: profile.page_theme?.background_color === p.value ? '#fff' : 'transparent' }} title={p.name} />
                    ))}
                    <Input value={profile.page_theme?.background_color || ''} onChange={(e) => updateTheme({ background_color: e.target.value })} placeholder="#0A0E27" className="w-32 bg-white/5 border-white/10" />
                  </div>
                </div>
                <div>
                  <Label>Accent color</Label>
                  <Input type="color" value={profile.page_theme?.accent_color || '#3D7CFF'} onChange={(e) => updateTheme({ accent_color: e.target.value })} className="w-20 h-10 mt-2" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Show "Powered by UPLY"</Label>
                  <Switch checked={profile.page_theme?.show_powered_by !== false} onCheckedChange={(v) => updateTheme({ show_powered_by: v })} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sections" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Sections</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {(profile.section_order || ALL_SECTIONS).map((s: string, idx: number) => (
                  <div key={s} className="flex items-center justify-between p-2 rounded border border-white/10">
                    <span className="capitalize">{s}{s === 'hero' && <span className="ml-2 text-xs text-white/40">(pinned)</span>}</span>
                    <div className="flex items-center gap-2">
                      <Switch checked={profile.section_visibility?.[s] !== false} onCheckedChange={(v) => updateVisibility(s, v)} disabled={s === 'hero'} />
                      <button type="button" disabled={s === 'hero' || idx <= 1} onClick={() => moveSection(idx, -1)} className="p-1 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                      <button type="button" disabled={s === 'hero' || idx >= (profile.section_order?.length ?? ALL_SECTIONS.length) - 1} onClick={() => moveSection(idx, 1)} className="p-1 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="social" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Social links</AccordionTrigger>
              <AccordionContent className="space-y-2">
                {SOCIAL_FIELDS.map((f) => (
                  <div key={f}>
                    <Label className="capitalize">{f.replace('_', ' ')}</Label>
                    <Input value={profile.social_links?.[f] || ''} onChange={(e) => updateSocial(f, e.target.value)} placeholder={`https://...`} className="bg-white/5 border-white/10 mt-1" />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="about" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">About</AccordionTrigger>
              <AccordionContent>
                <Textarea rows={6} value={profile.about_md || ''} onChange={(e) => update({ about_md: e.target.value })} placeholder="Markdown supported" className="bg-white/5 border-white/10" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="seo" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">SEO</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div><Label>Title</Label><Input value={profile.seo_title || ''} onChange={(e) => update({ seo_title: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>Description</Label><Textarea rows={2} value={profile.seo_description || ''} onChange={(e) => update({ seo_description: e.target.value })} className="bg-white/5 border-white/10 mt-1" /></div>
                <div><Label>OG image</Label><Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'seo_og_image')} className="mt-1" />{profile.seo_og_image && <img src={profile.seo_og_image} alt="" loading="lazy" className="max-h-32 rounded mt-2" />}</div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="publish" className="border border-white/10 rounded-lg px-4">
              <AccordionTrigger className="text-base">Publish</AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/70">When ON, your page is live{profile.vanity_slug ? ` at uply.tv/@${profile.vanity_slug}` : ''}. When OFF, visitors see a Coming soon placeholder.</div>
                  <Switch checked={!!profile.page_published} onCheckedChange={(v) => update({ page_published: v })} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {publicUrl && (
              <AccordionItem value="share" className="border border-white/10 rounded-lg px-4">
                <AccordionTrigger className="text-base">Share</AccordionTrigger>
                <AccordionContent className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => window.open(publicUrl, '_blank')}><ExternalLink className="w-4 h-4 mr-2" />View public page</Button>
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied'); }}><Copy className="w-4 h-4 mr-2" />Copy link</Button>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          <div className="sticky bottom-0 bg-[#0A0A0A] py-4">
            <Button onClick={save} className="w-full" style={{ background: 'linear-gradient(90deg, #3D7CFF, #B025FF)' }}>Save changes</Button>
          </div>
        </div>

        <div className="hidden lg:block sticky top-0 h-screen border-l border-white/10">
          {profile.vanity_slug ? (
            <iframe src={`/@${profile.vanity_slug}?preview=1`} className="w-full h-full" title="Preview" />
          ) : (
            <div className="flex items-center justify-center h-full text-white/40">Set a vanity URL to preview</div>
          )}
        </div>
      </div>

      {showCelebration && publicUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setShowCelebration(false)}>
          <div className="max-w-md w-full bg-[#1A1A1A] rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Your page is live!</h2>
            <p className="text-white/70 mb-6 break-all">{publicUrl}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Copied'); }}>Copy link</Button>
              <Button variant="outline" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}`, '_blank')}>Twitter</Button>
              <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(publicUrl)}`, '_blank')}>WhatsApp</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
