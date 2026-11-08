import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/api/integrations';
import { advisorApi } from '@/lib/advisorApi';
import { apiErrorMessage } from '@/lib/withdrawalsApi';
import { advisorKeys, useMyAdvisor } from './useAdvisorData';
import { EXPERTISE_OPTIONS, MAX_EXPERTISE, MAX_EXPERTISE_LENGTH } from './expertise';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Edit the public advisor profile: display name, bio, expertise and photo.
 * The SEBI registration number is shown read-only: it is what the reviewer
 * verified, so only support can change it after approval (the server enforces
 * this too).
 *
 * Prop-less on purpose: it is opened with `?edit=profile` and reads/refreshes
 * the same cached advisor record as the dashboard.
 */
export default function AdvisorProfileEditor() {
  const [params, setParams] = useSearchParams();
  const open = params.get('edit') === 'profile';
  const { data: advisor } = useMyAdvisor();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ display_name: '', bio: '', specialization: [], profile_image_url: null });
  // Set only when the photo changes: the stored one is sent back as a key or not at all.
  const [newImage, setNewImage] = useState(undefined); // undefined = unchanged, null = removed, string = new key
  const [custom, setCustom] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !advisor) return;
    setForm({
      display_name: advisor.display_name || '',
      bio: advisor.bio || '',
      specialization: Array.isArray(advisor.specialization) ? advisor.specialization : [],
      profile_image_url: advisor.profile_image_url || null,
    });
    setNewImage(undefined);
  }, [open, advisor]);

  const close = () => setParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete('edit');
    return next;
  }, { replace: true });

  const toggle = (label) => setForm((prev) => {
    const has = prev.specialization.includes(label);
    if (!has && prev.specialization.length >= MAX_EXPERTISE) {
      toast.error(`Choose at most ${MAX_EXPERTISE} areas of expertise.`);
      return prev;
    }
    return { ...prev, specialization: has ? prev.specialization.filter((x) => x !== label) : [...prev.specialization, label] };
  });

  const addCustom = () => {
    const label = custom.trim();
    if (!label) return;
    if (label.length > MAX_EXPERTISE_LENGTH) { toast.error(`Keep each label under ${MAX_EXPERTISE_LENGTH} characters.`); return; }
    if (!form.specialization.some((x) => x.toLowerCase() === label.toLowerCase())) toggle(label);
    setCustom('');
  };

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) { toast.error('Please choose a JPG, PNG, GIF or WebP image.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { toast.error('The image must be 5 MB or smaller.'); return; }
    setUploading(true);
    try {
      const { file_url, key } = await UploadFile({ file });
      setForm((prev) => ({ ...prev, profile_image_url: file_url }));
      setNewImage(key);
    } catch {
      toast.error('Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.display_name.trim().length < 2) { toast.error('Enter your display name.'); return; }
    if (form.bio.trim().length < 10) { toast.error('Write a bio of at least 10 characters.'); return; }
    setSaving(true);
    try {
      const { advisor: saved } = await advisorApi.updateMe({
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        specialization: form.specialization,
        ...(newImage !== undefined ? { profile_image_url: newImage } : {}),
      });
      queryClient.setQueryData(advisorKeys.me, saved);
      toast.success('Profile updated.');
      close();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (!advisor) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) close(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit public profile</DialogTitle>
          <DialogDescription>This is what investors see on your advisor page.</DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-5" noValidate>
          <div className="flex items-center gap-4">
            {form.profile_image_url ? (
              <img src={form.profile_image_url} alt="Your profile" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold" aria-hidden="true">
                {(form.display_name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="advisor-photo" className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Change photo'}
              </Label>
              <input id="advisor-photo" type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={onPhoto} disabled={uploading} />
              {form.profile_image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setForm((p) => ({ ...p, profile_image_url: null })); setNewImage(null); }}>Remove photo</Button>
              )}
              <p className="text-xs text-muted-foreground">Square image, max 5 MB.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="advisor-display-name">Display name</Label>
            <Input id="advisor-display-name" value={form.display_name} maxLength={100} onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))} />
          </div>

          <div>
            <Label htmlFor="advisor-sebi">SEBI registration number</Label>
            <div className="relative">
              <Input id="advisor-sebi" value={advisor.sebi_registration_number || ''} readOnly disabled className="bg-surface-2 cursor-not-allowed" />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Verified at approval. Contact support to change it.</p>
          </div>

          <div>
            <Label htmlFor="advisor-bio">Bio</Label>
            <Textarea id="advisor-bio" rows={4} value={form.bio} maxLength={2000} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Areas of expertise</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Areas of expertise">
              {[...EXPERTISE_OPTIONS, ...form.specialization.filter((x) => !EXPERTISE_OPTIONS.includes(x))].map((label) => {
                const on = form.specialization.includes(label);
                return <Button key={label} type="button" size="sm" variant={on ? 'default' : 'outline'} aria-pressed={on} onClick={() => toggle(label)}>{label}</Button>;
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Input aria-label="Add another area of expertise" placeholder="Add another" value={custom} maxLength={MAX_EXPERTISE_LENGTH} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
              <Button type="button" variant="outline" onClick={addCustom}>Add</Button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={close} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : 'Save profile'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
