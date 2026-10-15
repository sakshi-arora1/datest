# Form Picker

A DA library extension for selecting a file from a site's
`forms/` folder and inserting a `form` block into the current document.

## How to Use

1. Open **Form Picker** from the DA page editor's app/library menu. It reads the
   organization and site from the current page context and loads the site's folders.
2. Choose a folder and a non-HTML file. The inserted form URL always ends in
   `.json`, regardless of the selected file's extension.
3. Click **Insert Form Block**.

The inserted block contains three rows: the `form` block name, the selected
form URL (`https://main--<site>--<org>.aem.page/<folder>/<filename>.json`),
and the submit URL `https://httpbin.org/post`.

## Register the app

Register the app in a site's DA config sheet, **apps** tab (`title` /
`description` / `image` / `path` columns):

| title | description | image | path |
| --- | --- | --- | --- |
| Form Picker | Browse form definitions and insert a form block | *(an icon URL)* | `/app/{org}/{site}/tools/apps/formpicker/formpicker` |

For local testing, open the app with a DA page context, for example:
`https://da.live/app/{org}/{site}/tools/apps/formpicker/formpicker?ref=local`.

## Files

| File | Purpose |
| --- | --- |
| `formpicker.html` | DA extension shell |
| `formpicker.js` | Form selection and block insertion |
| `formpicker.css` | Extension UI styles |
| `api.js` | DA folder and file listing |
