import { useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      ["clean"],
    ],
  }), []);

  return (
    <div className="rich-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Write your email..."}
      />
      <style>{`
        .rich-editor-wrapper .ql-toolbar {
          border-color: hsl(var(--border)) !important;
          border-radius: 0.75rem 0.75rem 0 0;
          background: hsl(var(--muted));
        }
        .rich-editor-wrapper .ql-container {
          border-color: hsl(var(--border)) !important;
          border-radius: 0 0 0.75rem 0.75rem;
          min-height: 200px;
          font-size: 14px;
          color: hsl(var(--foreground));
          background: hsl(var(--card));
        }
        .rich-editor-wrapper .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .rich-editor-wrapper .ql-stroke {
          stroke: hsl(var(--muted-foreground)) !important;
        }
        .rich-editor-wrapper .ql-fill {
          fill: hsl(var(--muted-foreground)) !important;
        }
        .rich-editor-wrapper .ql-picker-label {
          color: hsl(var(--muted-foreground)) !important;
        }
      `}</style>
    </div>
  );
}
