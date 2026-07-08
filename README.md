# File Store Pro

Professional single-page web app for KN1 to KN30 file and barcode records.

## Run Steps

1. Open this folder in VS Code.
2. Install Live Server extension.
3. Right click `index.html`.
4. Click **Open with Live Server**.

Camera scanner works best on `localhost` or HTTPS. Manual barcode entry works without camera.

## Folder Structure

```text
File-Store-Pro/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

## Features

- KN1 to KN30 dashboard buttons
- Separate 1st Shift and 2nd Shift records
- File upload option
- Camera barcode scanner
- Manual barcode entry
- Duplicate barcode warning
- Browser localStorage saving
- Excel download
- Professional dark responsive UI

## GitHub Upload

```bash
git init
git add .
git commit -m "Initial File Store Pro app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/File-Store-Pro.git
git push -u origin main
```
