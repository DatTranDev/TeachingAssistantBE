# WEB-027 — Document Management

## Objective
Build the document library within a subject: teachers and students can upload files (PDFs, slides, documents), view all uploaded documents, and download them. Documents are stored in Firebase Storage via the backend proxy.

## Background
Each subject has a document library where course materials are shared. Teachers upload lecture slides, assignments, and resources. Students can also upload submissions if the subject allows it. Files are stored in Firebase Storage; the backend returns download URLs.

## Scope
- Documents tab: `/teacher/classes/[subjectId]/documents` and `/student/classes/[subjectId]/documents`
- Document list: name, uploader, date, file type icon, size, download/open link
- Upload document: teacher (always), students (if subject setting allows)
- Delete document: teacher can delete any; student can delete own (if subject allows)
- API: `GET /api/v1/document/getAll`, `POST /api/v1/document/upload`, `DELETE /api/v1/document/delete`

## Out of Scope
- Channel posts with links (WEB-026)
- Absence request attachments (WEB-022)

## Dependencies
- WEB-014 (subject shell)
- WEB-004 (API service layer)
- WEB-003 (FileUpload, Table/List, Badge, Button)

## User Flow Context
- Teacher opens Documents tab → uploads lecture slides → students can download
- Student opens Documents tab → downloads materials → optionally uploads assignments

## Functional Requirements
1. Fetch documents: `GET /api/v1/document/getAll?subjectId=<id>`
2. Documents displayed as a list (not grid): file type icon, name, uploader, date, size, actions
3. "Tải lên tài liệu" button opens file upload dialog
4. Accepted file types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, PNG, JPG (up to 50MB)
5. Upload: POST to `/api/v1/document/upload` with FormData
6. On upload success: add to document list with toast "Tải lên thành công"
7. "Tải xuống" button: opens file URL in new tab (Firebase Storage URL)
8. Delete: teacher can delete any document; student can delete own uploads
9. Delete requires confirmation dialog
10. Search: filter by document name (client-side)
11. Sort: by date (newest), by name (A-Z)
12. File type icon from extension: PDF (red), DOC (blue), PPT (orange), XLS (green), Image (purple)

## UI Requirements

### Documents Page Layout
```
[Tài liệu — title]  [+ Tải lên — primary button]
[Search: "Tìm tài liệu..."]  [Sort: Mới nhất | Tên A-Z]

[Document rows]
```

### Document Row
```
┌────┬─────────────────────────────┬────────────┬────────────┬────────────┬────┐
│[📄]│ Tên tài liệu.pdf            │ [Uploader] │ 01/01/2025 │ 2.3 MB     │[⬇][🗑]│
├────┼─────────────────────────────┼────────────┼────────────┼────────────┼────┤
│[📊]│ BaiGiang_Tuan1.pptx         │ Nguyễn A   │ 30/12/2024 │ 5.1 MB     │[⬇][🗑]│
└────┴─────────────────────────────┴────────────┴────────────┴────────────┴────┘

Mobile: card layout
[📄] Tên tài liệu.pdf
      Nguyễn A • 01/01/2025 • 2.3 MB
[Tải xuống]
```

### File Type Icons
```
PDF:  📄 text-red-500  bg-red-50
DOC:  📝 text-blue-500 bg-blue-50
PPT:  📊 text-orange-500 bg-orange-50
XLS:  📈 text-green-500 bg-green-50
IMG:  🖼 text-purple-500 bg-purple-50
```

### Upload Dialog
```
Title: "Tải lên tài liệu"

[Drag & drop area or file picker]
"Kéo thả file vào đây hoặc click để chọn"
"Hỗ trợ: PDF, DOC, PPT, XLS, PNG, JPG (tối đa 50MB)"

[Progress bar during upload: ████████░░ 80%]

[Hủy]  [Tải lên — primary, disabled until file selected]
```

### Upload Progress
```
During upload: show progress percentage (if API supports it)
Fallback: indeterminate spinner
```

## API Requirements

### Get Documents
- `GET /api/v1/document/getAll?subjectId=<id>`
- Auth: Bearer token
- Response: `{ documents: Document[] }` — includes uploader info, fileUrl, fileName, fileSize, fileType

### Upload Document
- `POST /api/v1/document/upload`
- Auth: Bearer token
- Body: FormData with `file` + `subjectId`
- Response: `{ document: Document }` with `fileUrl`

### Delete Document
- `DELETE /api/v1/document/delete`
- Auth: Bearer token
- Body: `{ documentId: string }`

## Backend Changes
None.

## Technical Implementation Notes

### File Upload with Progress
```typescript
const uploadDocument = async (file: File, subjectId: string, onProgress?: (pct: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subjectId', subjectId);

  const response = await apiClient.post('/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data.document;
};
```

### File Type Detection
```typescript
const FILE_TYPE_CONFIG = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  doc: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  docx: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
  ppt: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
  pptx: { icon: Presentation, color: 'text-orange-500', bg: 'bg-orange-50' },
  xls: { icon: Table, color: 'text-green-500', bg: 'bg-green-50' },
  xlsx: { icon: Table, color: 'text-green-500', bg: 'bg-green-50' },
} as const;

function getFileConfig(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return FILE_TYPE_CONFIG[ext as keyof typeof FILE_TYPE_CONFIG] ?? {
    icon: File, color: 'text-neutral-500', bg: 'bg-neutral-100',
  };
}
```

### File Structure
```
src/app/(dashboard)/
├── teacher/classes/[subjectId]/documents/page.tsx
└── student/classes/[subjectId]/documents/page.tsx

src/components/features/documents/
├── DocumentList.tsx
├── DocumentRow.tsx
├── DocumentCard.tsx       # Mobile card
├── UploadDocumentDialog.tsx
├── FileTypeIcon.tsx
└── DeleteDocumentDialog.tsx
```

## Acceptance Criteria
- [ ] Documents list loads with file type icons, name, uploader, date, size
- [ ] "Tải lên" opens file picker
- [ ] File upload shows progress during upload
- [ ] Uploaded document appears in list
- [ ] "Tải xuống" opens file in new tab
- [ ] Teacher can delete any document; student can only delete own
- [ ] Delete requires confirmation
- [ ] Search filters by document name
- [ ] Sort by date and by name work
- [ ] Empty state when no documents
- [ ] Oversized file (>50MB) shows error before upload

## Testing Requirements
- **Component tests:**
  - `DocumentRow`: renders file type icon, name, download button
  - `UploadDocumentDialog`: validates file size, calls upload API
  - `getFileConfig()`: returns correct config for each extension
- **Manual QA:**
  - Upload a PDF → verify it appears with correct icon
  - Click download → verify file opens in new tab
  - Try uploading 60MB file → verify size error
  - Teacher deletes student upload → verify removed

## Definition of Done
- Document list renders with correct metadata
- Upload with progress works
- Download works
- Delete works with permission check
- Unit tests pass

## Risks / Notes
- Firebase Storage URLs are long-lived download URLs — ensure the backend returns permanent URLs (not signed URLs with short expiry)
- Large file uploads (50MB) may timeout on slower connections; Axios `timeout` may need to be increased for upload requests or set to 0 (no timeout) for file uploads specifically
- Students uploading requires a backend permission check tied to subject settings — ensure the frontend respects the `allowStudentUpload` flag from subject settings
