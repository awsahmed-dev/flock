import { pdfjs } from "react-pdf";

// The worker is copied from node_modules/pdfjs-dist/build/ into public/
// (re-copy when bumping react-pdf/pdfjs-dist). Serving it same-origin
// keeps it service-worker-cacheable so cached PDFs render offline; the
// `new URL(..., import.meta.url)` pattern silently 404'd under the
// production bundler and pdfjs fell back to its slow "fake worker".
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export { pdfjs };
