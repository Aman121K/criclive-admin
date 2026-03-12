import React, {useEffect, useRef, useState} from 'react';

const CKEDITOR_CDN = 'https://cdn.ckeditor.com/4.22.1/full/ckeditor.js';

const loadCkEditorScript = () =>
  new Promise((resolve, reject) => {
    if (window.CKEDITOR) {
      resolve(window.CKEDITOR);
      return;
    }

    const existing = document.querySelector(`script[src="${CKEDITOR_CDN}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.CKEDITOR), {once: true});
      existing.addEventListener('error', () => reject(new Error('Failed to load CKEditor')), {once: true});
      return;
    }

    const script = document.createElement('script');
    script.src = CKEDITOR_CDN;
    script.async = true;
    script.onload = () => resolve(window.CKEDITOR);
    script.onerror = () => reject(new Error('Failed to load CKEditor'));
    document.body.appendChild(script);
  });

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
    return <p className="error">Failed to load CKEditor from CDN. Check internet and reload.</p>;
  }

  return (
    <div className="ckEditorWrap">
      {!ready ? <p className="muted small">Loading editor...</p> : null}
      <textarea ref={textareaRef} defaultValue={value || ''} />
    </div>
  );
};

export default CkEditorCdn;
