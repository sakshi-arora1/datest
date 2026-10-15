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
  const pathSegments = path.split('/').filter(Boolean);
  const filename = pathSegments.pop();
  pathSegments.push(`${filename.replace(/\.[^.]*$/, '')}.json`);
  const segments = pathSegments.map(encodeURIComponent);
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

function getPageContext(sdk) {
  const context = sdk.context || sdk.detail || {};
  const detail = sdk.detail || {};
  const mountpoint = context.config?.mountpoint || detail.config?.mountpoint;
  const mountpointParts = mountpoint
    ? new URL(mountpoint, window.location.origin).pathname.split('/').filter(Boolean)
    : [];
  const appPath = window.location.pathname.split('/').filter(Boolean);
  const appIndex = appPath.indexOf('app');
  const appOrg = appIndex >= 0 ? appPath[appIndex + 1] : '';
  const appSite = appIndex >= 0 ? appPath[appIndex + 2] : '';
  const params = new URLSearchParams(window.location.search);

  return {
    org: context.org || context.organization || sdk.org || detail.org
      || mountpointParts[0] || appOrg || params.get('org') || '',
    site: context.site || context.repo || context.repository || sdk.site || sdk.repo || detail.site
      || mountpointParts[1] || appSite || params.get('site') || '',
  };
}

(async function init() {
  const sdk = await DA_SDK;
  const { actions } = sdk;
  const { org, site } = getPageContext(sdk);
  const folderSelect = document.getElementById('folder-select');
  const formSelect = document.getElementById('form-select');
  const insertButton = document.getElementById('insert-button');
  const formUrl = document.getElementById('form-url');
  const pageContext = document.getElementById('page-context');
  let selectedFormURL = '';
  pageContext.textContent = `Organization: ${org || 'Unavailable'} · Site: ${site || 'Unavailable'}`;

  function updateSelectedForm() {
    const selectedPath = formSelect.value;
    selectedFormURL = selectedPath ? getSitePreviewUrl(site, org, selectedPath) : '';
    formUrl.textContent = selectedFormURL;
    insertButton.disabled = !selectedFormURL;
  }

  function showForms(forms) {
    appendOptions(
      formSelect,
      forms.map((form) => ({ label: form.name.replace(/\.html$/i, ''), value: form.path })),
      forms.length ? 'Select a file' : 'No files in this folder',
    );
    formSelect.disabled = forms.length === 0;
    if (forms.length) {
      formSelect.value = forms[0].path;
      updateSelectedForm();
      setStatus('');
    } else {
      setStatus('This folder does not contain any files.');
    }
  }

  async function findFirstFolderWithForms(folders, index = 0) {
    if (index >= folders.length) return null;
    const forms = await listForms(org, site, folders[index].path);
    if (forms.length) return { folder: folders[index], forms };
    return findFirstFolderWithForms(folders, index + 1);
  }

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
      showForms(forms);
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
      if (folders.length) {
        const selection = await findFirstFolderWithForms(folders);
        if (selection) {
          folderSelect.value = selection.folder.path;
          showForms(selection.forms);
        } else {
          folderSelect.value = folders[0].path;
          showForms([]);
        }
      } else {
        setStatus('No forms folder found for this site.');
      }
    } catch (error) {
      appendOptions(folderSelect, [], 'Unable to load folders');
      appendOptions(formSelect, [], 'Select a folder first');
      setStatus(error.message || 'Unable to load folders.', 'error');
    }
  }

  folderSelect.addEventListener('change', loadSelectedFolder);
  formSelect.addEventListener('change', updateSelectedForm);

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
