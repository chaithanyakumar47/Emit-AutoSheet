import * as XLSX from 'xlsx';
import { SentenceItem, Category } from '../types/timesheet';

const CATEGORY_MAP: Record<string, Category> = {
  '#RequirementGathering': 'RequirementGathering',
  '#ProjectManagement': 'ProjectManagement',
  '#BusinessManagement': 'BusinessManagement',
  '#ClientMeeting': 'ClientMeeting',
  '#ClientCall': 'ClientCall',
  '#SprintPlanning': 'SprintPlanning',
  '#StandupCall': 'StandupCall',
  '#TechnicalDocumentation': 'TechnicalDocumentation',
  '#Wireframing': 'Wireframing',
  '#JiraEntries': 'JiraEntries',
  '#FunctionalTesting': 'FunctionalTesting',
  '#BugReporting': 'BugReporting',
  '#CodeReview': 'CodeReview',
};

export async function parseExcelFileToSentences(file: File): Promise<SentenceItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to raw 2D array of rows
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const importedSentences: SentenceItem[] = [];

        rawRows.forEach((row, rowIndex) => {
          if (!row || row.length === 0) return;

          // Join all non-empty cell strings in the row
          const line = row.filter(cell => cell !== null && cell !== undefined).map(c => String(c).trim()).join(' ');
          if (!line || line.length < 5) return;

          // Extract hashtags from beginning/anywhere in string (e.g. #BLS #ProjectManagement)
          const hashtagMatches = line.match(/#[\w-]+/g) || [];
          const projectTag = hashtagMatches.find(t => t.toUpperCase() === '#BLS' || (!CATEGORY_MAP[t] && t.startsWith('#'))) || '#BLS';
          const categoryTag = hashtagMatches.find(t => CATEGORY_MAP[t]) || '#ProjectManagement';

          const mappedCategory: Category = CATEGORY_MAP[categoryTag] || 'ProjectManagement';

          // Strip leading hashtags from sentence text
          const cleanText = line
            .replace(/^(#[\w-]+\s*)+/, '') // Remove leading tags
            .trim();

          if (!cleanText) return;

          importedSentences.push({
            id: `excel_${Date.now()}_${rowIndex}_${Math.random().toString(36).substring(2, 6)}`,
            text: cleanText,
            category: mappedCategory,
            defaultDurationMinutes: 60,
            isActive: true,
            tags: [projectTag, categoryTag],
          });
        });

        resolve(importedSentences);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
