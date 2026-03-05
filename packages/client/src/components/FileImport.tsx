import { useState, useRef } from 'react';
import type { Question } from '@live-trivia/shared';
import { parseCSV, generateTemplate, type ParseResult } from '../lib/csv-parser.js';

interface Props {
  onImport: (questions: Question[]) => void;
}

export default function FileImport({ onImport }: Props) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const parsed = await parseCSV(file);
    setResult(parsed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trivia-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = () => {
    if (result && result.questions.length > 0) {
      onImport(result.questions);
      setResult(null);
      setFileName('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
        <p className="text-slate-600 font-medium">
          {fileName || 'Drop a CSV file here, or click to browse'}
        </p>
        <p className="text-sm text-slate-400 mt-1">.csv files only</p>
      </div>

      {/* Download template */}
      <button
        onClick={handleDownloadTemplate}
        className="text-sm font-medium text-brand-500 hover:text-brand-400"
      >
        Download CSV template
      </button>

      {/* Preview */}
      {result && (
        <div className="space-y-4">
          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-semibold text-red-800 text-sm mb-2">
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} found
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed questions preview */}
          {result.questions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <h4 className="font-semibold text-slate-900 text-sm">
                  {result.questions.length} question{result.questions.length !== 1 ? 's' : ''} parsed
                </h4>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {result.questions.map((q, i) => (
                  <div key={q.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-6">{i + 1}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{q.text}</span>
                    <span className="text-xs text-slate-400 capitalize">{q.type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirm */}
          {result.questions.length > 0 && (
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 rounded-xl bg-brand-300 text-slate-900 text-sm font-semibold hover:bg-brand-400 active:scale-[0.98] transition-all"
            >
              Add {result.questions.length} question{result.questions.length !== 1 ? 's' : ''} to game
            </button>
          )}
        </div>
      )}
    </div>
  );
}
