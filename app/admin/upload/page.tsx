'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; title: string };
type Kind = 'pdf' | 'image' | 'video' | 'orthomosaic' | 'model' | 'other';

/** Parse a Sketchfab iframe or URL into a clean model URL + human title */
function parseSketchfabInput(input: string): { url: string | null; title: string } {
  if (!input) return { url: null, title: '3D Model' };

  const raw = input.trim();

  // If it’s an iframe, try to grab title and src
  const iframeTitle = raw.match(/<iframe[^>]*\btitle=["']([^"']+)["']/i)?.[1] ?? null;
  const iframeSrc   = raw.match(/<iframe[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? null;

  const candidate = (iframeSrc || raw).trim();

  // Try to normalize to a Sketchfab model URL (not the whole HTML)
  try {
    const u = new URL(candidate);

    // Extract UID and/or slug
    const parts = u.pathname.split('/').filter(Boolean); // e.g. ['3d-models','my-model-abcdef...', 'embed'] or ['models','abcdef...', 'embed']
    const modelsIdx = parts.indexOf('models');
    const is3dModels = parts[0] === '3d-models';

    // Prefer a clean non-embed model URL we can store
    let uid: string | null = null;
    if (modelsIdx >= 0 && parts[modelsIdx + 1]) {
      // /models/{uid}[/embed]
      uid = parts[modelsIdx + 1];
    } else if (is3dModels) {
      // /3d-models/{slug}-{uid}[/embed]
      const last = parts[1] || '';
      const maybeUid = last.split('-').pop() || '';
      if (/^[a-z0-9]{20,}$/i.test(maybeUid)) uid = maybeUid;
    }

    const cleanUrl = uid
      ? `https://sketchfab.com/models/${uid}`
      : u.toString();

    // Derive a human title:
    // 1) iframe title attribute if present
    // 2) slug before "-{uid}" from /3d-models/{slug}-{uid}
    // 3) last path segment (hyphens → spaces)
    let title = iframeTitle ?? '3D Model';
    if (!iframeTitle) {
      if (is3dModels && parts[1]) {
        const slug = parts[1].replace(/-[a-z0-9]{20,}$/i, '');
        if (slug) title = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim();
      } else if (parts.length) {
        const last = parts[parts.length - 1].replace(/-[a-z0-9]{20,}$/i, '');
        if (last && last !== 'embed') {
          title = decodeURIComponent(last).replace(/[-_]+/g, ' ').trim();
        }
      }
    }

    return { url: cleanUrl, title: title || '3D Model' };
  } catch {
    // Not a URL; keep iframe title if we had one
    return { url: null, title: iframeTitle || '3D Model' };
  }
}

export default function UploadPage() {
  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(''); // controlled select

  // Form state
  const [kind, setKind] = useState<Kind>('pdf');          // controlled select
  const [file, setFile] = useState<File | null>(null);    // chosen file
  const [fileKey, setFileKey] = useState<number>(0);      // forces file <input> to remount/reset
  const [sketchfabUrl, setSketchfabUrl] = useState<string>(''); // always a string (controlled)

  // UI state
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  // Load projects for the dropdown
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id,title')
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
      } else {
        setProjects(data || []);
      }
    })();
  }, []);

  // When switching kind, reset the opposite side so components never flip control mode
  useEffect(() => {
    setMsg('');
    if (kind === 'model') {
      // leaving file mode → clear file and remount input
      setFile(null);
      setFileKey((k) => k + 1);
    } else {
      // leaving embed mode → clear embed value
      setSketchfabUrl('');
    }
  }, [kind]);

  // Accept attribute for file input based on kind (UX hint; not a hard validator)
  const accept = useMemo(() => {
    switch (kind) {
      case 'pdf':
        return 'application/pdf';
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'orthomosaic':
        return '.tif,.tiff,.tiff16';
      case 'other':
        return '*/*';
      default:
        return undefined; // not used for model
    }
  }, [kind]);

  async function handleUpload() {
    try {
      setMsg('');

      if (!projectId) {
        setMsg('Please select a project.');
        return;
      }

      // Validate per kind
      if (kind === 'model') {
        if (!sketchfabUrl.trim()) {
          setMsg('Paste a Sketchfab embed/URL first.');
          return;
        }
      } else {
        if (!file) {
          setMsg('Choose a file to upload.');
          return;
        }
      }

      setBusy(true);

      let filePath: string | null = null;
      let sizeMb: number | null = null;

      // Upload file to Storage (non-model kinds)
      if (kind !== 'model' && file) {
        const safeName = file.name.replace(/\s+/g, '-');
        filePath = `${projectId}/${Date.now()}-${safeName}`;
        sizeMb = +(file.size / (1024 * 1024)).toFixed(2);

        const { error: upErr } = await supabase
          .storage
          .from('deliverables')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (upErr) {
          console.error(upErr);
          setMsg('❌ ' + upErr.message);
          return;
        }
      }

      // Compute title + URL
      let title = file?.name ?? 'File';
      let sketchUrlToSave: string | null = null;

      if (kind === 'model') {
        const parsed = parseSketchfabInput(sketchfabUrl);
        if (!parsed.url) {
          setMsg('Could not parse a valid Sketchfab URL from the embed. Paste the model URL or the full <iframe …>.');
          return;
        }
        title = parsed.title || '3D Model';
        sketchUrlToSave = parsed.url;
      }

      // Insert asset record
      const { error: assetErr } = await supabase.from('assets').insert({
        project_id: projectId,
        kind,
        title,
        url: kind === 'model' ? null : filePath,  // Storage path for files
        sketchfab_url: kind === 'model' ? sketchUrlToSave : null,
        size_mb: sizeMb,
      });

      if (assetErr) {
        console.error(assetErr);
        setMsg('❌ ' + assetErr.message);
        return;
      }

      // Success UI + resets that keep control mode consistent
      setMsg(
        kind === 'model'
          ? '✅ Model linked. It will appear on the project page.'
          : `✅ Uploaded to: ${filePath}`
      );

      if (kind === 'model') {
        setSketchfabUrl('');              // keep textarea controlled
      } else {
        setFile(null);
        setFileKey((k) => k + 1);         // remount file input so it truly clears
      }
    } finally {
      setBusy(false);
    }
  }

  const uploadDisabled =
    busy ||
    !projectId ||
    (kind !== 'model' && !file) ||
    (kind === 'model' && !sketchfabUrl.trim());

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Upload Deliverable</h1>

        <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
          {/* Project */}
          <label className="block text-sm text-gray-600">Project</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Kind */}
          <label className="block text-sm text-gray-600">Kind</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="orthomosaic">Orthomosaic</option>
            <option value="model">3D Model (Sketchfab)</option>
            <option value="other">Other</option>
          </select>

          {/* If model: show Sketchfab URL field; otherwise show File input */}
          {kind === 'model' ? (
            <>
              <label className="block text-sm text-gray-600">Sketchfab /embed URL</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="https://sketchfab.com/models/.../embed"
                value={sketchfabUrl}
                onChange={(e) => setSketchfabUrl(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="block text-sm text-gray-600">File</label>
              <input
                key={`file-${fileKey}`}
                type="file"
                accept={accept}
                onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              />
            </>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploadDisabled}
            className={`mt-2 rounded-lg px-4 py-2 text-white ${
              uploadDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>

          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>

        <p className="text-sm text-gray-600">
          Files upload into the private <b>deliverables</b> bucket at{' '}
          <code>projectId/timestamp-filename</code>. Models save only a Sketchfab embed URL.
        </p>
      </div>
    </main>
  );
}

