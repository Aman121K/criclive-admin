import React, {useEffect, useRef, useState} from 'react';

const CKEDITOR_CDNS = [
  'https://cdn.ckeditor.com/4.22.1/full/ckeditor.js',
  'https://cdn.jsdelivr.net/npm/ckeditor4@4.22.1/ckeditor.js',
];

const loadScript = src =>
  new Promise((resolve, reject) => {
    if (window.CKEDITOR) {
      resolve(window.CKEDITOR);
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true' && window.CKEDITOR) {
        resolve(window.CKEDITOR);
        return;
      }
      existing.addEventListener(
        'load',
        () => {
          existing.dataset.loaded = 'true';
          resolve(window.CKEDITOR);
        },
        {once: true}
      );
      existing.addEventListener('error', () => reject(new Error(`Failed to load CKEditor from ${src}`)), {once: true});
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve(window.CKEDITOR);
    };
    script.onerror = () => reject(new Error(`Failed to load CKEditor from ${src}`));
    document.body.appendChild(script);
  });

const loadCkEditorScript = async () => {
  for (const src of CKEDITOR_CDNS) {
    try {
      const CKEDITOR = await loadScript(src);
      if (CKEDITOR) {
        return CKEDITOR;
      }
    } catch (error) {
      // Try next CDN URL.
    }
  }

  throw new Error('Failed to load CKEditor from all CDN sources');
};

const CkEditorCdn = ({value, onChange, disabled = false}) => {
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadCkEditorScript()
      .then(CKEDITOR => {
        if (!mounted || !textareaRef.current) {
          return;
        }

        editorRef.current = CKEDITOR.replace(textareaRef.current, {
          height: 360,
          removePlugins: 'elementspath',
          resize_enabled: true,
          toolbar: [
            {name: 'clipboard', items: ['Undo', 'Redo']},
            {name: 'styles', items: ['Format', 'FontSize']},
            {name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike']},
            {name: 'paragraph', items: ['NumberedList', 'BulletedList', 'Blockquote']},
            {name: 'links', items: ['Link', 'Unlink']},
            {name: 'insert', items: ['Image', 'Table', 'HorizontalRule', 'SpecialChar']},
            {name: 'tools', items: ['Maximize', 'Source']},
          ],
        });

        editorRef.current.on('change', () => {
          onChange(editorRef.current.getData());
        });
        editorRef.current.setData(value || '');
        editorRef.current.setReadOnly(Boolean(disabled));
        setReady(true);
      })
      .catch(() => {
        if (mounted) {
          setFailed(true);
        }
      });

    return () => {
      mounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current || !ready) {
      return;
    }
    const current = editorRef.current.getData();
    const next = value || '';
    if (current !== next) {
      editorRef.current.setData(next);
    }
  }, [value, ready]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.setReadOnly(Boolean(disabled));
  }, [disabled]);

  if (failed) {
    return (
      <div className="stack">
        <p className="error">Rich editor unavailable. Falling back to plain text editor.</p>
        <textarea
          value={value || ''}
          onChange={event => onChange(event.target.value)}
          disabled={disabled}
          rows={14}
          placeholder="Write news content here..."
        />
      </div>
    );
  }

  return (
    <div className="ckEditorWrap">
      {!ready ? <p className="muted small">Loading editor...</p> : null}
      <textarea ref={textareaRef} defaultValue={value || ''} />
    </div>
  );
};

export default CkEditorCdn;
