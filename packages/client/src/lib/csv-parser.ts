import Papa from 'papaparse';
import type { Question } from '@live-trivia/shared';
import { nanoid } from 'nanoid';

interface CsvRow {
  type: string;
  question: string;
  answer: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  time_limit?: string;
  points?: string;
}

export interface ParseResult {
  questions: Question[];
  errors: Array<{ row: number; message: string }>;
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const questions: Question[] = [];
        const errors: Array<{ row: number; message: string }> = [];

        results.data.forEach((row, i) => {
          const rowNum = i + 2; // +2 for 1-indexed + header row
          const type = row.type?.trim().toLowerCase();
          const text = row.question?.trim();
          const answer = row.answer?.trim();
          const timeLimit = parseInt(row.time_limit || '30') || 30;
          const points = parseInt(row.points || '10') || 10;

          if (!text) {
            errors.push({ row: rowNum, message: 'Missing question text' });
            return;
          }

          if (!type || !['multiple_choice', 'free_text'].includes(type)) {
            errors.push({ row: rowNum, message: `Unsupported type "${type}". Use "multiple_choice" or "free_text".` });
            return;
          }

          if (!answer) {
            errors.push({ row: rowNum, message: 'Missing answer' });
            return;
          }

          if (type === 'multiple_choice') {
            const options = [
              row.option_a?.trim(),
              row.option_b?.trim(),
              row.option_c?.trim(),
              row.option_d?.trim(),
            ].filter(Boolean) as string[];

            if (options.length < 2) {
              errors.push({ row: rowNum, message: 'Multiple choice needs at least 2 options' });
              return;
            }

            // Answer is A/B/C/D letter
            const letterIdx = 'ABCD'.indexOf(answer.toUpperCase());
            if (letterIdx === -1 || letterIdx >= options.length) {
              errors.push({ row: rowNum, message: `Answer must be a letter (A-${String.fromCharCode(64 + options.length)})` });
              return;
            }

            questions.push({
              id: nanoid(8),
              type: 'multiple_choice',
              text,
              options,
              correctOptionIndex: letterIdx,
              timeLimit,
              points,
            });
          } else if (type === 'free_text') {
            questions.push({
              id: nanoid(8),
              type: 'free_text',
              text,
              correctAnswer: answer,
              timeLimit,
              points,
            });
          }
        });

        resolve({ questions, errors });
      },
    });
  });
}

// Generate a downloadable CSV template
export function generateTemplate(): string {
  const headers = 'type,question,answer,option_a,option_b,option_c,option_d,time_limit,points';
  const rows = [
    'multiple_choice,"What is 2+2?",C,1,3,4,8,30,10',
    'multiple_choice,"Which planet is closest to the Sun?",B,Venus,Mercury,Mars,Earth,20,10',
    'free_text,"What is the capital of France?",Paris,,,,,20,10',
  ];
  return [headers, ...rows].join('\n');
}
