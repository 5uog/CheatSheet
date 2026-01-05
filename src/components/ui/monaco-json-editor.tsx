// FILE: src/components/ui/monaco-json-editor.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import type * as Monaco from "monaco-editor";

type Editor = Monaco.editor.IStandaloneCodeEditor;
type Model = Monaco.editor.ITextModel;

type Props = {
    value: string;
    onChange: (next: string) => void;
    className?: string;
    readOnly?: boolean;
};

function cls(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

function isCanceledError(e: unknown): boolean {
    const msg = (e as { message?: unknown } | null)?.message;
    if (typeof msg === "string" && msg.toLowerCase().includes("canceled")) return true;

    const name = (e as { name?: unknown } | null)?.name;
    if (typeof name === "string" && name.toLowerCase().includes("canceled")) return true;

    return false;
}

function ensureMonacoWorkers() {
    const g = globalThis as unknown as {
        MonacoEnvironment?: { getWorker?: (moduleId: string, label: string) => Worker };
    };

    if (g.MonacoEnvironment?.getWorker) return;

    g.MonacoEnvironment = {
        getWorker(_moduleId, label) {
            if (label === "json") {
                return new Worker(new URL("monaco-editor/esm/vs/language/json/json.worker", import.meta.url), { type: "module" });
            }
            return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url), { type: "module" });
        },
    };
}

function defineDarkTheme(monaco: typeof Monaco) {
    const themeName = "pv-dark";
    try {
        monaco.editor.defineTheme(themeName, {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
                "editor.background": "#09090b",
            },
        });
    } catch {}
    monaco.editor.setTheme(themeName);
}

export function MonacoJsonEditor(props: Props) {
    const { value, onChange, className, readOnly = false } = props;

    const hostRef = useRef<HTMLDivElement | null>(null);
    const editorRef = useRef<Editor | null>(null);
    const modelRef = useRef<Model | null>(null);
    const monacoRef = useRef<typeof Monaco | null>(null);

    const roRef = useRef<ResizeObserver | null>(null);
    const subRef = useRef<Monaco.IDisposable | null>(null);
    const rafRef = useRef<number | null>(null);

    const latestValueRef = useRef<string>("");
    latestValueRef.current = value ?? "";

    const latestOnChangeRef = useRef<(next: string) => void>(() => {});
    latestOnChangeRef.current = onChange;

    const options = useMemo<Monaco.editor.IStandaloneEditorConstructionOptions>(
        () => ({
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: false,
            wordWrap: "on",
            tabSize: 2,
            insertSpaces: true,
            renderLineHighlight: "line",
            fontSize: 13,
            readOnly,
            lineNumbers: "on",
            roundedSelection: true,
            smoothScrolling: true,
        }),
        [readOnly]
    );

    function layoutSoon() {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            editorRef.current?.layout();
        });
    }

    useEffect(() => {
        let disposed = false;

        (async () => {
            if (!hostRef.current) return;

            ensureMonacoWorkers();

            let monaco: typeof Monaco;
            try {
                monaco = (await import("monaco-editor")) as typeof Monaco;
            } catch (e) {
                if (disposed) return;
                if (isCanceledError(e)) return;
                throw e;
            }
            if (disposed) return;

            monacoRef.current = monaco;
            defineDarkTheme(monaco);

            const model = monaco.editor.createModel(latestValueRef.current, "json");
            modelRef.current = model;

            const ed = monaco.editor.create(hostRef.current, {
                ...options,
                model,
            });
            editorRef.current = ed;

            const now = latestValueRef.current;
            if (ed.getValue() !== now) ed.setValue(now);

            subRef.current = ed.onDidChangeModelContent(() => {
                latestOnChangeRef.current(ed.getValue());
            });

            roRef.current = new ResizeObserver(() => layoutSoon());
            roRef.current.observe(hostRef.current);

            layoutSoon();
        })();

        return () => {
            disposed = true;

            if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;

            try {
                roRef.current?.disconnect();
            } catch {}
            roRef.current = null;

            try {
                subRef.current?.dispose();
            } catch {}
            subRef.current = null;

            try {
                editorRef.current?.dispose();
            } catch {}
            editorRef.current = null;

            try {
                modelRef.current?.dispose();
            } catch {}
            modelRef.current = null;

            monacoRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const ed = editorRef.current;
        if (!ed) return;

        const next = value ?? "";
        const current = ed.getValue();
        if (current === next) return;

        const pos = ed.getPosition();
        const sel = ed.getSelection();

        ed.setValue(next);

        if (sel) ed.setSelection(sel);
        if (pos) ed.setPosition(pos);

        layoutSoon();
    }, [value]);

    useEffect(() => {
        const ed = editorRef.current;
        const monaco = monacoRef.current;
        const model = modelRef.current;
        if (!ed || !monaco || !model) return;

        defineDarkTheme(monaco);
        ed.updateOptions({ ...options });
        monaco.editor.setModelLanguage(model, "json");

        layoutSoon();
    }, [options]);

    useEffect(() => {
        function onVis() {
            layoutSoon();
        }
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("resize", onVis);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("resize", onVis);
        };
    }, []);

    return <div ref={hostRef} className={cls("h-full w-full", className)} />;
}
