declare module 'pdf-parse' {
  export interface PDFInfo {
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }

  const pdfParse: (data: Buffer | Uint8Array, options?: any) => Promise<PDFInfo>;
  export = pdfParse;
}
