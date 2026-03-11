import React, {useEffect, useRef} from 'react';

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Write your news details...',
  disabled = false,
  onUploadImages,
  uploadingImages = false,
}) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== String(value || '')) {
      editor.innerHTML = value || '';
    }
  }, [value]);

  const focusEditor = () => {
    if (editorRef.current && !disabled) {
      editorRef.current.focus();
    }
  };

  const run = (command, commandValue = null) => {
    if (disabled) {
      return;
    }
    focusEditor();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const onInput = () => {
    onChange(editorRef.current?.innerHTML || '');
  };

  const insertLink = () => {
    const url = window.prompt('Enter link URL (https://...)');
    if (!url) {
      return;
    }
    run('createLink', url);
  };

  const triggerUpload = () => {
    if (disabled || !fileInputRef.current) {
      return;
    }
    fileInputRef.current.click();
  };

  const handleUpload = event => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !onUploadImages) {
      return;
    }
    onUploadImages(files);
    event.target.value = '';
  };

  return (
    <div className={`rteWrap ${disabled ? 'disabled' : ''}`}>
      <div className="rteToolbar">
        <button type="button" className="ghost" onClick={() => run('bold')} disabled={disabled} title="Bold">
          B
        </button>
        <button type="button" className="ghost" onClick={() => run('italic')} disabled={disabled} title="Italic">
          I
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => run('underline')}
          disabled={disabled}
          title="Underline">
          U
        </button>
        <button type="button" className="ghost" onClick={() => run('formatBlock', 'H2')} disabled={disabled}>
          H2
        </button>
        <button type="button" className="ghost" onClick={() => run('formatBlock', 'H3')} disabled={disabled}>
          H3
        </button>
        <button type="button" className="ghost" onClick={() => run('insertUnorderedList')} disabled={disabled}>
          Bullet
        </button>
        <button type="button" className="ghost" onClick={() => run('insertOrderedList')} disabled={disabled}>
          Number
        </button>
        <button type="button" className="ghost" onClick={insertLink} disabled={disabled}>
          Link
        </button>
        <button type="button" className="ghost" onClick={() => run('removeFormat')} disabled={disabled}>
          Clear
        </button>
        <button type="button" className="ghost" onClick={triggerUpload} disabled={disabled || uploadingImages}>
          {uploadingImages ? 'Uploading...' : 'Upload Images'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hiddenFileInput"
          onChange={handleUpload}
          disabled={disabled || uploadingImages}
        />
      </div>

      <div
        ref={editorRef}
        className="rteEditor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={onInput}
      />
    </div>
  );
};

export default RichTextEditor;
