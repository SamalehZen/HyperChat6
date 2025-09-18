import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store';
import type { Editor as TiptapEditor } from '@tiptap/react';

export const useChatEditor = (editorProps: {
    placeholder?: string;
    defaultContent?: string;
    charLimit?: number;
    enableEnter?: boolean;
    onInit?: (props: { editor: TiptapEditor }) => void;
    onUpdate?: (props: { editor: TiptapEditor }) => void;
}) => {
    const setEditorInStore = useChatStore(state => state.setEditor);
    const [editor, setEditor] = useState<TiptapEditor | null>(null);
    const editorRef = useRef<TiptapEditor | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const [{ Editor }, core, CharacterCount, Document, Paragraph, Text, Placeholder, Highlight, HardBreak] = await Promise.all([
                import('@tiptap/react'),
                import('@tiptap/core'),
                import('@tiptap/extension-character-count'),
                import('@tiptap/extension-document'),
                import('@tiptap/extension-paragraph'),
                import('@tiptap/extension-text'),
                import('@tiptap/extension-placeholder'),
                import('@tiptap/extension-highlight'),
                import('@tiptap/extension-hard-break'),
            ]);

            const { Extension } = core;
            const ShiftEnterToLineBreak = Extension.create({
                name: 'shiftEnterToLineBreak',
                addKeyboardShortcuts() {
                    return {
                        'Shift-Enter': _ => {
                            return _.editor.commands.enter();
                        },
                    };
                },
            });

            const DisableEnter = Extension.create({
                name: 'disableEnter',
                addKeyboardShortcuts() {
                    return {
                        Enter: () => true,
                    };
                },
            });

            const instance = new Editor({
                extensions: [
                    Document.default || Document,
                    Paragraph.default || Paragraph,
                    Text.default || Text,
                    (Placeholder.default || Placeholder).configure({
                        placeholder: editorProps?.placeholder || 'Ask anything',
                    }),
                    (CharacterCount.default || CharacterCount).configure({
                        limit: editorProps?.charLimit || 10000000,
                    }),
                    ...(!editorProps?.enableEnter ? [ShiftEnterToLineBreak, DisableEnter] : []),
                    (Highlight.default || Highlight).configure({
                        HTMLAttributes: { class: 'prompt-highlight' },
                    }),
                    HardBreak.default || HardBreak,
                ],
                immediatelyRender: false,
                content: '',
                autofocus: true,
                onTransaction(props) {
                    const { editor } = props;
                    const text = editor.getText();
                    const html = editor.getHTML();
                    if (text === '/') {
                    } else {
                        const newHTML = html.replace(/::((?:(?!::).)+)::/g, (_, content) => {
                            return ` <mark class="prompt-highlight">${content}</mark> `;
                        });
                        if (newHTML !== html) {
                            editor.commands.setContent(newHTML, true, { preserveWhitespace: true });
                        }
                    }
                },
                onCreate(props) {
                    if (editorProps?.defaultContent) {
                        props.editor.commands.setContent(editorProps?.defaultContent || '', true, {
                            preserveWhitespace: true,
                        });
                    }
                    if (editorProps?.onInit) {
                        editorProps.onInit({ editor: props.editor as TiptapEditor });
                    }
                },
                onUpdate(props) {
                    const { editor } = props;
                    if (editorProps?.onUpdate) {
                        editorProps.onUpdate({ editor: editor as TiptapEditor });
                    }
                },
                parseOptions: { preserveWhitespace: 'full' },
            });

            if (!mounted) return;
            editorRef.current = instance as TiptapEditor;
            setEditor(instance as TiptapEditor);
            setEditorInStore(instance as TiptapEditor);
        })();

        return () => {
            mounted = false;
            editorRef.current?.destroy?.();
            editorRef.current = null;
        };
    }, [editorProps?.placeholder, editorProps?.charLimit, editorProps?.enableEnter]);

    useEffect(() => {
        if (editor) {
            editor.commands.focus('end');
        }
    }, [editor]);

    return { editor };
};
