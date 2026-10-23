'use client';

import { useState } from 'react';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Post body editor. Emits HTML; the server sanitises it again on save (never trust the editor).
export function RichTextEditor({ value, onChange, label = 'Post content' }: { value: string; onChange: (html: string) => void; label?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ['https', 'http', 'mailto', 'tel'], HTMLAttributes: { rel: null, target: null } },
      }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editorProps: { attributes: { class: 'adm-editor', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return (
    <div className="adm-editor-wrap">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      code: e.isActive('codeBlock'),
      link: e.isActive('link'),
    }),
  });
  const [panel, setPanel] = useState<'link' | 'image' | null>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const chain = () => editor.chain().focus();
  const btn = (label: string, active: boolean, run: () => void, text = label) => (
    <button type="button" className="adm-tool" aria-pressed={active} onClick={run} title={label}>
      {text === label ? (
        text
      ) : (
        <>
          <span aria-hidden="true">{text}</span>
          <span className="sr-only">{label}</span>
        </>
      )}
    </button>
  );

  const apply = () => {
    const v = url.trim();
    if (panel === 'link') {
      if (!v) chain().extendMarkRange('link').unsetLink().run();
      else if (/^(https?:\/\/|mailto:|tel:|\/)/.test(v)) chain().extendMarkRange('link').setLink({ href: v }).run();
    } else if (panel === 'image' && v) {
      chain().setImage({ src: v, alt: alt.trim() }).run();
    }
    setPanel(null);
    setUrl('');
    setAlt('');
  };

  return (
    <div className="adm-toolbar">
      <div role="toolbar" aria-label="Formatting" className="adm-row" style={{ gap: 4 }}>
        {btn('Heading 2', s.h2, () => chain().toggleHeading({ level: 2 }).run(), 'H2')}
        {btn('Heading 3', s.h3, () => chain().toggleHeading({ level: 3 }).run(), 'H3')}
        {btn('Bold', s.bold, () => chain().toggleBold().run(), 'B')}
        {btn('Italic', s.italic, () => chain().toggleItalic().run(), 'I')}
        {btn('Bulleted list', s.bullet, () => chain().toggleBulletList().run(), '• List')}
        {btn('Numbered list', s.ordered, () => chain().toggleOrderedList().run(), '1. List')}
        {btn('Quote', s.quote, () => chain().toggleBlockquote().run(), '“ ”')}
        {btn('Code block', s.code, () => chain().toggleCodeBlock().run(), '</>')}
        {btn('Link', s.link, () => {
          setUrl(editor.getAttributes('link').href ?? '');
          setPanel(panel === 'link' ? null : 'link');
        })}
        {btn('Image', false, () => setPanel(panel === 'image' ? null : 'image'))}
        {btn('Undo', false, () => chain().undo().run(), '↶')}
        {btn('Redo', false, () => chain().redo().run(), '↷')}
      </div>
      {panel && (
        <div className="adm-row" style={{ marginTop: 8 }}>
          <label className="adm-field" style={{ flex: '1 1 260px' }}>
            <span>{panel === 'link' ? 'Link URL' : 'Image URL'}</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), apply())} />
          </label>
          {panel === 'image' && (
            <label className="adm-field" style={{ flex: '1 1 200px' }}>
              <span>Alt text</span>
              <input value={alt} onChange={(e) => setAlt(e.target.value)} />
            </label>
          )}
          <button type="button" className="adm-btn" onClick={apply} style={{ alignSelf: 'flex-end' }}>
            {panel === 'link' ? 'Apply link' : 'Insert image'}
          </button>
        </div>
      )}
    </div>
  );
}
