# Image/PDF → Excel (free): remove Tabula, use pdfjs heuristics + Tesseract

Summary
- Replace the now-unavailable tabula-js path with a 100% Node stack that deploys on Vercel: pdfjs-dist (text positioning heuristics) for digital PDFs, Tesseract.js for scanned PDFs/images.
- Keep French/English OCR, ≤10 pages, streaming progress, and downloadable XLSX/CSV.

Changes since initial PR draft
- Remove Tabula dependency entirely (tabula-js is no longer available on npm or GitHub; Java not provided on Vercel).
- Digital PDF extraction now uses pdfjs-dist text content (x/y, width, font size) → simple column clustering to reconstruct tables.
- Scanned PDFs/images continue to use OCR (tesseract.js) with basic table reconstruction.
- Updated env comment to “pdfjs + Tesseract”.
- Kept mode as “Image/PDF → Excel (gratuit)” and credit cost 0.

Why
- tabula-js is gone (and required Java not offered by Vercel), so this ensures a stable, free, deployable path.

Impact
- Digital PDFs may be slightly less precise than Tabula in edge cases, but still reasonably good for structured tables.
- No external paid services; offline friendly except optional tessdata CDN.

Testing
- Digital PDF with clear tables → should extract via pdfjs heuristics.
- Scanned PDF and images → OCR path.
- ≥11 pages → capped at 10 with a friendly note.
- Encrypted PDF → clear error reported.
