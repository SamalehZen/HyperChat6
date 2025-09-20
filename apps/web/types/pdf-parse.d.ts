declare module 'pdf-parse' {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }

  function pdfParse(data: Buffer | Uint8Array | string, options?: any): Promise<PDFParseResult>;
  export = pdfParse;
}
