# GlobusCar Rental - Project Context

## Overview
Next.js 14 App Router web application for car rental contract management, deployed on Vercel.
- **Production URL**: https://globuscar-rental.vercel.app
- **GitHub**: geoappsit-hue/globuscar-rental
- **Vercel**: Auto-deploys from `main` branch

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js with credentials provider (admin login)
- **Data**: Google Sheets as database (cars list, rentals)
- **OCR**: Google Cloud Vision API for passport scanning
- **Contracts**: DOCX generation via PizZip (download Google Doc template, replace text locally)
- **Template**: Google Doc ID `1VbW68N29MY98Zmgawel4Vm3Voxj5Pnft2wm9YLC2T9o`

## Key Files
- `src/lib/contract-generator.ts` — DOCX contract generation (PizZip-based template replacement)
- `src/lib/google-sheets.ts` — Google Auth + Sheets API (cars, rentals data)
- `src/lib/ocr.ts` — Passport OCR via Google Vision API
- `src/lib/auth.ts` — NextAuth configuration
- `src/app/api/generate/route.ts` — Contract generation API endpoint
- `src/app/api/ocr/route.ts` — OCR API endpoint
- `src/app/api/diag/route.ts` — Template diagnostic endpoint (debug, можно удалить)
- `src/app/api/test-template/route.ts` — Debug endpoint (можно удалить)

## Contract Generation Flow
1. Template downloaded from Google Drive as DOCX export (read-only, no storage needed)
2. PizZip opens the DOCX, replaces text in XML files (document.xml, headers, footers)
3. Text replacement uses simple `split/join` (NOT regex XML parsing — that corrupts the file!)
4. Modified DOCX returned as `new Response(new Uint8Array(buffer))`

## Template Replacement Values
The template contains hardcoded sample data that gets replaced with actual client/car data:
- `MAKSIMOV SERGEI` → client name
- `AUDI Q7 PREMIUM PLUS` → car brand/model
- `FD756FD` → plate number
- `AJA4062951` → tech passport
- `04/0155` → contract number
- `11.04.2026` → start date
- `12.04.2026` → end date
- `10.04.2000` → client birth date
- `RUS 76 5355392` → client passport
- `1 сутки` / `1 დღეღამის` → duration
- `66  USD` (double space!) → total rent
- `0$` → deposit
- `GRAY` → car color
- `2018` → car year
- See `buildReplacements()` in contract-generator.ts for full list

## Known Limitations
- **PDF generation**: Returns DOCX (no server-side PDF conversion available)
- **Google Docs format**: Fails — service account has 0 bytes Drive storage quota
- **Car list**: Some cars in Google Sheets may need cleanup (user reported extra entries)

## Environment Variables (configured in Vercel)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_TEMPLATE_DOC_ID`
- `GOOGLE_DRIVE_FOLDER_ID`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_PASSWORD_HASH`

## Google Drive Project Folder
https://drive.google.com/drive/folders/1E36y5CyGrpYPwYNPYVQ7EI6n0CgY9_Xz

## Important Technical Notes
- Google Auth scopes include `cloud-platform` (needed for Vision API OCR)
- PizZip generate must use `type: 'uint8array'` (not `nodebuffer` — breaks on Vercel)
- Response must use `new Response(new Uint8Array(buffer))` (not `new NextResponse(buffer)`)
- Text replacement MUST be simple split/join, NOT regex XML paragraph processing (corrupts DOCX!)
- Template values have specifics: `66  USD` has double space, `0$` is deposit
- GitHub token: (хранится локально, не коммитить)
