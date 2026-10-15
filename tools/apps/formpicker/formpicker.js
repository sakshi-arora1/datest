/* eslint-disable no-console */
// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { listFormFolders, listForms } from './api.js';

const SUBMIT_URL = 'https://httpbin.org/post';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSitePreviewUrl(site, org, path) {
  const segments = path.split('/').filter(Boolean).map(encodeURIComponent);
  return `https://main--${site.toLowerCase()}--${org.toLowerCase()}.aem.page/${segments.join('/')}`;
}

function toFormBlockHTML(formURL) {
  const safeURL = escapeHtml(formURL);
  const safeAction = escapeHtml(SUBMIT_URL);
  return `
<table>
  <tbody>
    <tr><td colspan="2"><p>form</p></td></tr>
    <tr><td colspan="2"><p><a href="${safeURL}">${safeURL}</a></p></td></tr>
    <tr><td colspan="2"><p><a href="${safeAction}">${safeAction}</a></p></td></tr>
  </tbody>
</table>`.trim();
}

function setStatus(message, type = '') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function appendOptions(select, options, placeholder) {
  select.replaceChildren(new Option(placeholder, ''));
  options.forEach(({ label, value }) => select.add(new Option(label, value)));
}

(async function init() {
  const { context = {}, actions } = await DA_SDK;
  const org = context.org || context.organization || '';
  const site = context.site || context.repo || context.repository || '';
  const folderSelect = document.getElementById('folder-select');
  const formSelect = document.getElementById('form-select');
  const insertButton = document.getElementById('insert-button');
  const formUrl = document.getElementById('form-url');
  let selectedFormURL = '';

  async function loadSelectedFolder() {
    formSelect.disabled = true;
    insertButton.disabled = true;
    formUrl.textContent = '';
    selectedFormURL = '';
    const folderPath = folderSelect.value;
    if (!folderPath) {
      appendOptions(formSelect, [], 'Select a folder first');
      return;
    }
    formSelect.replaceChildren(new Option('Loading forms…', ''));
    try {
      const forms = await listForms(org, site, folderPath);
      appendOptions(
        formSelect,
        forms.map((form) => ({ label: form.name, value: form.path })),
        forms.length ? 'Select a file' : 'No files in this folder',
      );
      formSelect.disabled = forms.length === 0;
      setStatus(forms.length ? '' : 'This folder does not contain any files.');
    } catch (error) {
      appendOptions(formSelect, [], 'Unable to load forms');
      setStatus(error.message || 'Unable to load forms.', 'error');
    }
  }

  async function loadFolders() {
    if (!org || !site) {
      appendOptions(folderSelect, [], 'Page context unavailable');
      setStatus('Unable to determine the organization and site from the page context.', 'error');
      return;
    }
    folderSelect.disabled = true;
    formSelect.disabled = true;
    insertButton.disabled = true;
    setStatus('Loading folders…');
    try {
      const folders = await listFormFolders(org, site);
      appendOptions(
        folderSelect,
        folders.map((folder) => ({ label: folder.label, value: folder.path })),
        folders.length ? 'Select a folder' : 'No forms folder found',
      );
      folderSelect.disabled = folders.length === 0;
      appendOptions(formSelect, [], 'Select a folder first');
      setStatus(folders.length ? 'Choose a folder to view its forms.' : 'No forms folder found for this site.');
    } catch (error) {
      appendOptions(folderSelect, [], 'Unable to load folders');
      appendOptions(formSelect, [], 'Select a folder first');
      setStatus(error.message || 'Unable to load folders.', 'error');
    }
  }

  folderSelect.addEventListener('change', loadSelectedFolder);
  formSelect.addEventListener('change', () => {
    const selectedPath = formSelect.value;
    selectedFormURL = selectedPath ? getSitePreviewUrl(site, org, selectedPath) : '';
    formUrl.textContent = selectedFormURL;
    insertButton.disabled = !selectedFormURL;
  });

  insertButton.addEventListener('click', async () => {
    if (!selectedFormURL) {
      setStatus('Select a form before inserting the block.', 'error');
      return;
    }
    insertButton.disabled = true;
    setStatus('Inserting form block…');
    try {
      await actions.sendHTML(toFormBlockHTML(selectedFormURL));
      setStatus('Form block inserted.', 'success');
      await actions.closeLibrary();
    } catch (error) {
      setStatus(error.message || 'Unable to insert the form block.', 'error');
      insertButton.disabled = false;
    }
  });

  await loadFolders();
}());
