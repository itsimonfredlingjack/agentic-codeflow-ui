---
name: document-processing
description: PDF and DOCX document handling for reading, creating, and editing documents. Use when working with document extraction, generation, or manipulation.
source: anthropics/skills
---

# Document Processing

## PDF Handling

### Reading & Extraction

```python
# Extract text with layout preservation
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        tables = page.extract_tables()
```

```bash
# Command-line extraction
pdftotext -layout document.pdf output.txt
```

### Key Libraries

| Library | Use Case |
|---------|----------|
| `pypdf` | Merge, split, rotate, metadata |
| `pdfplumber` | Text extraction with layout, tables |
| `reportlab` | Create PDFs from scratch |
| `pdf2image` | Convert pages to images |

### Common Operations

```python
from pypdf import PdfReader, PdfWriter

# Merge PDFs
writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)
writer.write("merged.pdf")

# Extract specific pages
reader = PdfReader("document.pdf")
writer = PdfWriter()
writer.add_page(reader.pages[0])  # First page
writer.write("first_page.pdf")
```

### OCR for Scanned PDFs

```python
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path("scanned.pdf")
text = "\n".join(pytesseract.image_to_string(img) for img in images)
```

## DOCX Handling

### Reading Documents

```bash
# Extract with pandoc (preserves structure)
pandoc document.docx -o output.md
pandoc --track-changes=all document.docx -o output.md  # Include tracked changes
```

```python
from docx import Document

doc = Document("document.docx")
for para in doc.paragraphs:
    print(para.text)
```

### Creating Documents

```typescript
// Using docx-js (TypeScript/JavaScript)
import { Document, Paragraph, TextRun, Packer } from "docx";

const doc = new Document({
  sections: [{
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "Hello World", bold: true }),
        ],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
```

### Editing with Tracked Changes

```bash
# Unpack for XML editing
python ooxml/scripts/unpack.py document.docx ./unpacked/

# Edit word/document.xml
# Then repack
python ooxml/scripts/pack.py ./unpacked/ edited.docx
```

**Best Practices for Tracked Changes:**
- Plan modifications in markdown first
- Batch 3-10 related changes together
- Preserve unchanged `<w:r>` elements
- Grep `word/document.xml` before modifying

## Integration Patterns

### RAG Document Pipeline

```typescript
// Example: Extract text for embedding
async function processDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return await extractPdfText(filePath);
  } else if (ext === '.docx') {
    return await extractDocxText(filePath);
  }

  throw new Error(`Unsupported format: ${ext}`);
}

// Chunk for embedding
function chunkText(text: string, maxChars: number = 1000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current += "\n\n" + para;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}
```

### Document Generation for Reports

```typescript
// Generate report from agent output
interface ReportSection {
  title: string;
  content: string;
  level: number;
}

function generateReport(sections: ReportSection[]): Document {
  const children = sections.map(section => [
    new Paragraph({
      text: section.title,
      heading: `Heading${section.level}` as any,
    }),
    new Paragraph({ text: section.content }),
  ]).flat();

  return new Document({ sections: [{ children }] });
}
```

## Command-Line Tools

```bash
# PDF operations
qpdf --empty --pages input.pdf 1-5 -- output.pdf  # Extract pages
qpdf input.pdf --rotate=+90:1 output.pdf          # Rotate page 1

# DOCX operations
pandoc input.docx -o output.pdf                   # Convert to PDF
pandoc input.md -o output.docx                    # Markdown to DOCX
```
