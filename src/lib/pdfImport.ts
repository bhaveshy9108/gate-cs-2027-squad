type PdfTextItem = {
  str?: string;
  transform?: [number, number, number, number, number, number];
};

type PdfPage = {
  getTextContent: () => Promise<{ items: unknown[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

function normalizePdfLine(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*[•·▪]\s*/g, " ")
    .replace(/\s+\.{2,}\s*\d+$/g, "")
    .replace(/\s+\d+$/g, "")
    .trim();
}

function shouldKeepPdfLine(text: string) {
  if (!text || text.length < 3) return false;
  if (/^[\d\s.-]+$/.test(text)) return false;
  if (/^page\s+\d+$/i.test(text)) return false;
  if (/^(contents?|table of contents|index)$/i.test(text)) return false;
  return /[a-zA-Z]/.test(text);
}

function groupItemsIntoLines(items: PdfTextItem[]) {
  const sorted = items
    .map((item) => ({
      text: typeof item.str === "string" ? item.str : "",
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.text.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine: { x: number; text: string }[] = [];

  const flush = () => {
    if (!currentLine.length) return;
    const joined = currentLine
      .sort((a, b) => a.x - b.x)
      .map((part) => part.text.trim())
      .filter(Boolean)
      .join(" ");
    const normalized = normalizePdfLine(joined);
    if (shouldKeepPdfLine(normalized)) {
      lines.push(normalized);
    }
    currentLine = [];
    currentY = null;
  };

  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= 2.75) {
      currentLine.push({ x: item.x, text: item.text });
      currentY = currentY === null ? item.y : (currentY + item.y) / 2;
    } else {
      flush();
      currentLine.push({ x: item.x, text: item.text });
      currentY = item.y;
    }
  }

  flush();
  return lines;
}

export async function extractOrderedPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import(
    /* @vite-ignore */
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs"
  );

  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const document = (await pdfjs.getDocument({ data }).promise) as PdfDocument;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = groupItemsIntoLines(
      content.items.filter((item): item is PdfTextItem => typeof item === "object" && item !== null)
    );

    for (const line of pageLines) {
      const previous = lines[lines.length - 1];
      if (previous && previous.toLowerCase() === line.toLowerCase()) continue;
      lines.push(line);
    }
  }

  return lines;
}
