import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'finance', label: 'Finance' },
  { id: 'projects', label: 'Projects' },
  { id: 'documents', label: 'Documents' }
];

const today = new Date().toISOString().slice(0, 10);

const initialContactForm = {
  type: 'debtor',
  name: '',
  company: '',
  email: '',
  phone: '',
  address_json: '{}',
  payment_terms_json: '{}',
  accounting_json: '{}'
};

const initialInvoiceForm = {
  contact_id: '',
  issue_date: today,
  due_date: today,
  subtotal_net: '',
  tax_rate: '19',
  description: ''
};

const initialPaymentForm = {
  contact_id: '',
  invoice_id: '',
  payment_date: today,
  amount_net: '',
  total_amount: '',
  description: ''
};

const initialJournalForm = {
  entry_date: today,
  description: '',
  debit_account: '6000',
  credit_account: '1200',
  amount: ''
};

const initialProjectForm = {
  name: '',
  code: '',
  methodology: 'scrum',
  status: 'planned',
  token_budget: '',
  client_contact_id: '',
  start_date: today,
  end_date: '',
  notes: ''
};

const initialSprintForm = {
  name: '',
  goal: '',
  status: 'planned',
  start_date: today,
  end_date: '',
  budget_tokens: '',
  budget_usd: '',
  warn_threshold: '0.85',
  hard_limit: false
};

const initialDocumentForm = {
  record_type: 'contacts',
  record_id: '',
  filename: '',
  mime_type: 'application/json',
  content: '{\n  "note": "Attach document content here"\n}',
  metadata_json: '{}'
};

const initialTaskForm = {
  task_type: 'finance_posting',
  instruction: '',
  taskIdToApprove: '',
  approvalReason: 'Approved from UI'
};

function nowIso() {
  return new Date().toISOString();
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

function formatDateTime(value) {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR'
  }).format(Number.isFinite(number) ? number : 0);
}

function safeParseJson(text, fallback = null) {
  if (typeof text !== 'string' || !text.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeError(error) {
  if (!error) {
    return 'Unknown error';
  }

  return error instanceof Error ? error.message : String(error);
}

function buildQuery(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

function isPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          className={`toast toast--${toast.kind}`}
          onClick={() => onDismiss(toast.id)}
          type="button"
        >
          <span className="toast__title">{toast.title}</span>
          {toast.detail ? <span className="toast__detail">{toast.detail}</span> : null}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, tone = 'neutral', footnote }) {
  return (
    <article className={`stat stat--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {footnote ? <span>{footnote}</span> : null}
    </article>
  );
}

function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="section-header">
      <div>
        <p className="section-header__eyebrow">{subtitle}</p>
        <h2>{title}</h2>
      </div>
      {actions ? <div className="section-header__actions">{actions}</div> : null}
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [socketState, setSocketState] = useState('connecting');
  const [events, setEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const [tasksState, setTasksState] = useState({
    items: [],
    loading: false,
    error: null
  });

  const [contactsState, setContactsState] = useState({
    items: [],
    loading: false,
    error: null,
    filter: 'all'
  });
  const [contactsForm, setContactsForm] = useState(initialContactForm);

  const [financeState, setFinanceState] = useState({
    invoices: [],
    loading: false,
    error: null
  });
  const [invoiceForm, setInvoiceForm] = useState(initialInvoiceForm);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [journalForm, setJournalForm] = useState(initialJournalForm);
  const [taskForm, setTaskForm] = useState(initialTaskForm);

  const [projectsState, setProjectsState] = useState({
    items: [],
    loading: false,
    error: null,
    selectedProjectId: '',
    sprints: [],
    sprintLoading: false,
    sprintError: null
  });
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [sprintForm, setSprintForm] = useState(initialSprintForm);

  const [documentsState, setDocumentsState] = useState({
    items: [],
    loading: false,
    error: null,
    selectedRecordType: 'contacts',
    selectedRecordId: ''
  });
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);

  const canUseApi = token.trim().length > 0;

  useEffect(() => {
    const savedToken = window.localStorage.getItem('arca.token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (token.trim()) {
      window.localStorage.setItem('arca.token', token.trim());
    } else {
      window.localStorage.removeItem('arca.token');
    }
  }, [token]);

  useEffect(() => {
    const socket = io('/', { path: '/socket.io' });

    socket.on('connect', () => setSocketState('connected'));
    socket.on('disconnect', () => setSocketState('disconnected'));
    socket.on('connect_error', () => setSocketState('error'));
    socket.on('arca:event', (event) => {
      setEvents((previous) => [event, ...previous].slice(0, 100));
    });

    return () => socket.close();
  }, []);

  function notify(kind, title, detail = '') {
    const id = `toast-${++toastId.current}`;
    setToasts((current) => [{ id, kind, title, detail }, ...current].slice(0, 5));
    return id;
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function request(path, options = {}) {
    const { query, body, method = 'GET', auth = true } = options;
    const url = new URL(path, window.location.origin);
    if (query) {
      const queryString = buildQuery(query);
      if (queryString) {
        url.search = queryString;
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (auth && token.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `${response.status} ${response.statusText}`);
    }

    return payload;
  }

  async function loadContacts(silent = false) {
    if (!canUseApi) return [];

    setContactsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await request('/api/v1/contacts', {
        query: contactsState.filter === 'all' ? undefined : { type: contactsState.filter }
      });
      const items = payload.contacts || [];
      setContactsState((current) => ({ ...current, items, loading: false, error: null }));
      if (!silent) notify('success', 'Contacts loaded', `${items.length} record(s)`);
      return items;
    } catch (error) {
      const message = normalizeError(error);
      setContactsState((current) => ({ ...current, loading: false, error: message }));
      if (!silent) notify('error', 'Contacts failed', message);
      return [];
    }
  }

  async function loadInvoices(silent = false) {
    if (!canUseApi) return [];

    setFinanceState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await request('/api/v1/invoices');
      const invoices = payload.invoices || [];
      setFinanceState((current) => ({ ...current, invoices, loading: false, error: null }));
      if (!silent) notify('success', 'Invoices loaded', `${invoices.length} record(s)`);
      return invoices;
    } catch (error) {
      const message = normalizeError(error);
      setFinanceState((current) => ({ ...current, loading: false, error: message }));
      if (!silent) notify('error', 'Invoices failed', message);
      return [];
    }
  }

  async function loadProjects(silent = false) {
    if (!canUseApi) return [];

    setProjectsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await request('/api/v1/projects');
      const items = payload.projects || [];
      const selectedProjectId =
        projectsState.selectedProjectId || String(items[0]?.id || '');
      setProjectsState((current) => ({
        ...current,
        items,
        loading: false,
        error: null,
        selectedProjectId
      }));
      if (selectedProjectId) {
        await loadProjectSprints(selectedProjectId, true);
      }
      if (!silent) notify('success', 'Projects loaded', `${items.length} record(s)`);
      return items;
    } catch (error) {
      const message = normalizeError(error);
      setProjectsState((current) => ({ ...current, loading: false, error: message }));
      if (!silent) notify('error', 'Projects failed', message);
      return [];
    }
  }

  async function loadTasks(silent = false) {
    if (!canUseApi) return [];

    setTasksState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await request('/api/v1/agents/tasks', {
        query: { limit: 20 }
      });
      const items = payload.tasks || [];
      setTasksState((current) => ({ ...current, items, loading: false, error: null }));
      if (!silent) notify('success', 'Tasks loaded', `${items.length} record(s)`);
      return items;
    } catch (error) {
      const message = normalizeError(error);
      setTasksState((current) => ({ ...current, loading: false, error: message }));
      if (!silent) notify('error', 'Tasks failed', message);
      return [];
    }
  }

  async function loadProjectSprints(projectId, silent = false) {
    if (!canUseApi || !projectId) return [];

    setProjectsState((current) => ({ ...current, sprintLoading: true, sprintError: null }));
    try {
      const payload = await request(`/api/v1/projects/${projectId}/sprints`);
      const sprints = payload.sprints || [];
      setProjectsState((current) => ({
        ...current,
        selectedProjectId: String(projectId),
        sprints,
        sprintLoading: false,
        sprintError: null
      }));
      if (!silent) notify('success', 'Sprints loaded', `${sprints.length} record(s)`);
      return sprints;
    } catch (error) {
      const message = normalizeError(error);
      setProjectsState((current) => ({ ...current, sprintLoading: false, sprintError: message }));
      if (!silent) notify('error', 'Sprints failed', message);
      return [];
    }
  }

  async function loadDocuments(recordType, recordId, silent = false) {
    if (!canUseApi) return [];

    if (!recordType || !recordId) {
      const message = 'Choose a record type and ID first';
      setDocumentsState((current) => ({ ...current, error: message, loading: false }));
      if (!silent) notify('error', 'Documents not loaded', message);
      return [];
    }

    setDocumentsState((current) => ({ ...current, loading: true, error: null }));
    try {
      const payload = await request(`/api/v1/documents/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`);
      const items = payload.documents || [];
      setDocumentsState((current) => ({ ...current, items, loading: false, error: null }));
      if (!silent) notify('success', 'Documents loaded', `${items.length} record(s)`);
      return items;
    } catch (error) {
      const message = normalizeError(error);
      setDocumentsState((current) => ({ ...current, loading: false, error: message }));
      if (!silent) notify('error', 'Documents failed', message);
      return [];
    }
  }

  async function loadDashboard(silent = false) {
    if (!canUseApi) return;

    await Promise.all([
      loadContacts(true),
      loadInvoices(true),
      loadProjects(true),
      loadTasks(true)
    ]);

    if (!silent) {
      notify('info', 'Dashboard refreshed', 'Contacts, invoices, and projects reloaded');
    }
  }

  async function createContact() {
    if (!canUseApi) return;

    if (!contactsForm.name.trim()) {
      notify('error', 'Contact validation', 'Name is required');
      return;
    }

    try {
      setContactsState((current) => ({ ...current, loading: true, error: null }));
      const payload = {
        type: contactsForm.type,
        name: contactsForm.name.trim(),
        company: contactsForm.company.trim() || undefined,
        email: contactsForm.email.trim() || undefined,
        phone: contactsForm.phone.trim() || undefined,
        address_json: safeParseJson(contactsForm.address_json, {}) ?? {},
        payment_terms_json: safeParseJson(contactsForm.payment_terms_json, {}) ?? {},
        accounting_json: safeParseJson(contactsForm.accounting_json, {}) ?? {}
      };
      const result = await request('/api/v1/contacts', {
        method: 'POST',
        body: payload
      });
      notify('success', 'Contact created', result?.contact?.contact_no || payload.name);
      setContactsForm(initialContactForm);
      await loadContacts(true);
      await loadDashboard(true);
      setActiveTab('contacts');
    } catch (error) {
      const message = normalizeError(error);
      setContactsState((current) => ({ ...current, loading: false, error: message }));
      notify('error', 'Contact failed', message);
    }
  }

  async function createInvoice() {
    if (!canUseApi) return;

    if (!isPositiveInteger(invoiceForm.contact_id)) {
      notify('error', 'Invoice validation', 'contact_id must be a positive integer');
      return;
    }

    if (!invoiceForm.subtotal_net) {
      notify('error', 'Invoice validation', 'Subtotal is required');
      return;
    }

    try {
      const result = await request('/api/v1/invoices', {
        method: 'POST',
        body: {
          contact_id: Number(invoiceForm.contact_id),
          issue_date: invoiceForm.issue_date,
          due_date: invoiceForm.due_date || undefined,
          subtotal_net: Number(invoiceForm.subtotal_net),
          tax_rate: Number(invoiceForm.tax_rate || 0),
          tax_amount: Number(invoiceForm.subtotal_net) * (Number(invoiceForm.tax_rate || 0) / 100),
          total_gross:
            Number(invoiceForm.subtotal_net) +
            Number(invoiceForm.subtotal_net) * (Number(invoiceForm.tax_rate || 0) / 100),
          description: invoiceForm.description.trim() || undefined
        }
      });

      if (result.task_id) {
        notify('warning', 'Invoice queued', `Approval task ${result.task_id} created`);
        setTaskForm((current) => ({ ...current, taskIdToApprove: result.task_id }));
        await loadTasks(true);
      } else {
        const invoice = result.invoice;
        notify('success', 'Invoice created', invoice?.invoice_no || 'Posted');
        await loadInvoices(true);
        await loadDashboard(true);
      }

      setInvoiceForm(initialInvoiceForm);
      setActiveTab('finance');
    } catch (error) {
      notify('error', 'Invoice failed', normalizeError(error));
    }
  }

  async function createPayment() {
    if (!canUseApi) return;

    if (!isPositiveInteger(paymentForm.contact_id)) {
      notify('error', 'Payment validation', 'contact_id must be a positive integer');
      return;
    }

    const total = Number(paymentForm.total_amount || paymentForm.amount_net);
    if (!Number.isFinite(total) || total <= 0) {
      notify('error', 'Payment validation', 'A positive amount is required');
      return;
    }

    try {
      const result = await request('/api/v1/payments', {
        method: 'POST',
        body: {
          contact_id: Number(paymentForm.contact_id),
          invoice_id: paymentForm.invoice_id ? Number(paymentForm.invoice_id) : undefined,
          payment_date: paymentForm.payment_date,
          amount_net: Number(paymentForm.amount_net || total),
          total_amount: total,
          description: paymentForm.description.trim() || undefined
        }
      });

      if (result.task_id) {
        notify('warning', 'Payment queued', `Approval task ${result.task_id} created`);
        setTaskForm((current) => ({ ...current, taskIdToApprove: result.task_id }));
        await loadTasks(true);
      } else {
        notify('success', 'Payment posted', result?.payment?.payment_no || 'Done');
        await loadInvoices(true);
        await loadDashboard(true);
      }

      setPaymentForm(initialPaymentForm);
      setActiveTab('finance');
    } catch (error) {
      notify('error', 'Payment failed', normalizeError(error));
    }
  }

  async function createJournalEntry() {
    if (!canUseApi) return;

    if (!journalForm.description.trim()) {
      notify('error', 'Journal validation', 'Description is required');
      return;
    }

    const amount = Number(journalForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify('error', 'Journal validation', 'Amount must be positive');
      return;
    }

    try {
      const result = await request('/api/v1/journal-entries', {
        method: 'POST',
        body: {
          entry_date: journalForm.entry_date,
          description: journalForm.description.trim(),
          lines: [
            {
              side: 'debit',
              account: journalForm.debit_account.trim(),
              amount
            },
            {
              side: 'credit',
              account: journalForm.credit_account.trim(),
              amount
            }
          ]
        }
      });

      if (result.task_id) {
        notify('warning', 'Journal queued', `Approval task ${result.task_id} created`);
        setTaskForm((current) => ({ ...current, taskIdToApprove: result.task_id }));
        await loadTasks(true);
      } else {
        notify('success', 'Journal created', result?.journal_entry?.entry_no || 'Posted');
        await loadInvoices(true);
        await loadDashboard(true);
      }

      setJournalForm(initialJournalForm);
      setActiveTab('finance');
    } catch (error) {
      notify('error', 'Journal failed', normalizeError(error));
    }
  }

  async function createProject() {
    if (!canUseApi) return;

    if (!projectForm.name.trim()) {
      notify('error', 'Project validation', 'Project name is required');
      return;
    }

    try {
      const result = await request('/api/v1/projects', {
        method: 'POST',
        body: {
          name: projectForm.name.trim(),
          code: projectForm.code.trim() || undefined,
          methodology: projectForm.methodology,
          status: projectForm.status,
          token_budget: projectForm.token_budget ? Number(projectForm.token_budget) : undefined,
          client_contact_id: projectForm.client_contact_id ? Number(projectForm.client_contact_id) : undefined,
          start_date: projectForm.start_date || undefined,
          end_date: projectForm.end_date || undefined,
          notes: projectForm.notes.trim() || undefined
        }
      });

      const project = result.project;
      notify('success', 'Project created', project?.project_no || project?.name || 'Done');
      setProjectForm(initialProjectForm);
      await loadProjects(true);
      await loadDashboard(true);
      setActiveTab('projects');
    } catch (error) {
      notify('error', 'Project failed', normalizeError(error));
    }
  }

  async function createSprint() {
    if (!canUseApi) return;

    if (!projectsState.selectedProjectId) {
      notify('error', 'Sprint validation', 'Select a project first');
      return;
    }

    if (!sprintForm.name.trim()) {
      notify('error', 'Sprint validation', 'Sprint name is required');
      return;
    }

    try {
      const result = await request(`/api/v1/projects/${projectsState.selectedProjectId}/sprints`, {
        method: 'POST',
        body: {
          name: sprintForm.name.trim(),
          goal: sprintForm.goal.trim() || undefined,
          status: sprintForm.status,
          start_date: sprintForm.start_date || undefined,
          end_date: sprintForm.end_date || undefined,
          budget_tokens: sprintForm.budget_tokens ? Number(sprintForm.budget_tokens) : undefined,
          budget_usd: sprintForm.budget_usd ? Number(sprintForm.budget_usd) : undefined,
          warn_threshold: sprintForm.warn_threshold ? Number(sprintForm.warn_threshold) : undefined,
          hard_limit: Boolean(sprintForm.hard_limit)
        }
      });

      notify('success', 'Sprint created', result?.sprint?.sprint_no || 'Done');
      setSprintForm(initialSprintForm);
      await loadProjectSprints(projectsState.selectedProjectId, true);
      await loadProjects(true);
    } catch (error) {
      notify('error', 'Sprint failed', normalizeError(error));
    }
  }

  async function createTask() {
    if (!canUseApi) return;

    if (!taskForm.instruction.trim()) {
      notify('error', 'Task validation', 'Instruction is required');
      return;
    }

    try {
      const result = await request('/api/v1/agents/tasks', {
        method: 'POST',
        body: {
          task_type: taskForm.task_type,
          instruction: taskForm.instruction.trim()
        }
      });

      notify('success', 'Task created', result.task_id);
      setTaskForm((current) => ({
        ...current,
        instruction: ''
      }));
      await loadTasks(true);
    } catch (error) {
      notify('error', 'Task failed', normalizeError(error));
    }
  }

  async function approveTask() {
    if (!canUseApi) return;

    if (!taskForm.taskIdToApprove.trim()) {
      notify('error', 'Approval validation', 'Task ID is required');
      return;
    }

    try {
      await request(`/api/v1/agents/tasks/${taskForm.taskIdToApprove.trim()}/approve`, {
        method: 'POST',
        body: {
          approved: true,
          reason: taskForm.approvalReason.trim() || 'Approved from UI'
        }
      });

      notify('success', 'Task approved', taskForm.taskIdToApprove.trim());
      setTaskForm((current) => ({
        ...current,
        taskIdToApprove: ''
      }));
      await loadTasks(true);
    } catch (error) {
      notify('error', 'Approval failed', normalizeError(error));
    }
  }

  async function loadDocumentsForCurrentRecord(silent = false) {
    if (!documentsState.selectedRecordType || !documentsState.selectedRecordId) {
      const message = 'Choose a record type and ID first';
      setDocumentsState((current) => ({ ...current, error: message, loading: false }));
      if (!silent) notify('error', 'Documents not loaded', message);
      return [];
    }

    return loadDocuments(documentsState.selectedRecordType, documentsState.selectedRecordId, silent);
  }

  async function uploadDocument(recordType = documentsState.selectedRecordType, recordId = documentsState.selectedRecordId) {
    if (!canUseApi) return;

    if (!documentForm.filename.trim()) {
      notify('error', 'Document validation', 'Filename is required');
      return;
    }

    if (!recordType || !recordId) {
      notify('error', 'Document validation', 'Select a record type and ID first');
      return;
    }

    try {
      const result = await request('/api/v1/documents/upload', {
        method: 'POST',
        body: {
          record_type: recordType,
          record_id: recordId,
          filename: documentForm.filename.trim(),
          mime_type: documentForm.mime_type.trim() || undefined,
          content: documentForm.content,
          metadata: safeParseJson(documentForm.metadata_json, {}) ?? {}
        }
      });

      notify('success', 'Document uploaded', result?.document?.filename || 'Done');
      setDocumentForm(initialDocumentForm);
      await loadDocuments(recordType, recordId, true);
    } catch (error) {
      notify('error', 'Upload failed', normalizeError(error));
    }
  }

  async function deleteDocument(documentId) {
    if (!canUseApi) return;

    try {
      await request(`/api/v1/documents/${documentId}`, {
        method: 'DELETE'
      });
      notify('success', 'Document deleted', String(documentId));
      await loadDocuments(documentsState.selectedRecordType, documentsState.selectedRecordId, true);
    } catch (error) {
      notify('error', 'Delete failed', normalizeError(error));
    }
  }

  useEffect(() => {
    if (!canUseApi) {
      return;
    }

    loadDashboard(true);
  }, [canUseApi]);

  useEffect(() => {
    if (!canUseApi) {
      return;
    }

    if (activeTab === 'contacts' && !contactsState.items.length && !contactsState.loading) {
      loadContacts(true);
    }

    if (activeTab === 'finance' && !financeState.invoices.length && !financeState.loading) {
      loadInvoices(true);
    }

    if (activeTab === 'projects' && !projectsState.items.length && !projectsState.loading) {
      loadProjects(true);
    }

    if (activeTab === 'documents' && documentsState.selectedRecordId && !documentsState.loading) {
      loadDocuments(documentsState.selectedRecordType, documentsState.selectedRecordId, true);
    }
  }, [activeTab, canUseApi]);

  const stats = useMemo(() => {
    const openInvoices = financeState.invoices.filter((invoice) => Number(invoice.balance_amount || 0) > 0);
    return {
      contacts: contactsState.items.length,
      invoices: financeState.invoices.length,
      projects: projectsState.items.length,
      openInvoices: openInvoices.length,
      tasks: tasksState.items.length,
      events: events.length
    };
  }, [contactsState.items, financeState.invoices, projectsState.items, tasksState.items, events]);

  const recentContacts = contactsState.items.slice(0, 6);
  const recentInvoices = financeState.invoices.slice(0, 6);
  const selectedProject = projectsState.items.find(
    (project) => String(project.id) === String(projectsState.selectedProjectId)
  );

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand">
          <p>Arca</p>
          <h1>Operations Console</h1>
          <span>v1 productized workspace</span>
        </div>

        <nav className="nav-tabs" aria-label="Primary">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="auth-card">
          <p className="section-header__eyebrow">API access</p>
          <Field label="Bearer token" hint="JWT or erp_agent_sk_...">
            <textarea
              rows={4}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste token here"
            />
          </Field>
          <div className="button-row">
            <button type="button" onClick={() => loadDashboard(false)} disabled={!canUseApi}>
              Refresh all
            </button>
            <button
              type="button"
              onClick={() => {
                loadTasks(false);
                notify('info', 'Tasks refreshed', 'Latest agent tasks loaded');
              }}
              disabled={!canUseApi}
            >
              Tasks
            </button>
          </div>
          <div className={`socket-pill socket-pill--${socketState}`}>Socket: {socketState}</div>
        </section>

        <section className="status-card">
          <p className="section-header__eyebrow">System</p>
          <strong>{formatDateTime(nowIso())}</strong>
          <span>{canUseApi ? 'Authenticated' : 'Token required for data calls'}</span>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero">
          <div>
            <p className="hero__eyebrow">Realtime ERP workspace</p>
            <h1>{TABS.find((tab) => tab.id === activeTab)?.label || 'Dashboard'}</h1>
            <p className="hero__sub">
              Contacts, finance, projects, and documents live in one responsive console with live events.
            </p>
          </div>
          <div className="hero__meta">
            <StatCard label="Contacts" value={stats.contacts} tone="teal" footnote="loaded" />
            <StatCard label="Invoices" value={stats.invoices} tone="gold" footnote={`${stats.openInvoices} open`} />
            <StatCard label="Projects" value={stats.projects} tone="blue" footnote="active library" />
          </div>
        </header>

        <ToastStack toasts={toasts} onDismiss={dismissToast} />

        {activeTab === 'dashboard' ? (
          <div className="content-grid">
            <section className="panel panel--span-2">
              <SectionHeader
                title="Live Summary"
                subtitle="Dashboard"
                actions={
                  <button type="button" onClick={() => loadDashboard(false)} disabled={!canUseApi}>
                    Refresh
                  </button>
                }
              />
              <div className="stat-grid">
                <StatCard label="Contacts" value={stats.contacts} tone="teal" footnote="from contacts API" />
                <StatCard label="Invoices" value={stats.invoices} tone="gold" footnote="from finance API" />
                <StatCard label="Projects" value={stats.projects} tone="blue" footnote="from projects API" />
                <StatCard label="Tasks" value={stats.tasks} tone="purple" footnote="agent queue" />
              </div>

              <div className="split">
                <div>
                  <h3>Recent Contacts</h3>
                  {contactsState.loading ? <EmptyState title="Loading contacts..." /> : null}
                  {!contactsState.loading && recentContacts.length === 0 ? (
                    <EmptyState title="No contacts yet" detail="Create one in the Contacts tab." />
                  ) : null}
                  <div className="compact-list">
                    {recentContacts.map((contact) => (
                      <article key={contact.id} className="compact-item">
                        <strong>{contact.name}</strong>
                        <span>
                          {contact.contact_no} · {contact.type} · {contact.company || 'No company'}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Recent Invoices</h3>
                  {financeState.loading ? <EmptyState title="Loading invoices..." /> : null}
                  {!financeState.loading && recentInvoices.length === 0 ? (
                    <EmptyState title="No invoices yet" detail="Create an invoice from Finance." />
                  ) : null}
                  <div className="compact-list">
                    {recentInvoices.map((invoice) => (
                      <article key={invoice.id} className="compact-item">
                        <strong>{invoice.invoice_no}</strong>
                        <span>
                          {formatCurrency(invoice.total_gross)} · {invoice.status} · {formatDate(invoice.issue_date)}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Quick Actions" subtitle="Dashboard" />
              <div className="quick-actions">
                <button type="button" onClick={() => setActiveTab('contacts')}>
                  Add contact
                </button>
                <button type="button" onClick={() => setActiveTab('finance')}>
                  Post payment
                </button>
                <button type="button" onClick={() => setActiveTab('projects')}>
                  New project
                </button>
                <button type="button" onClick={() => setActiveTab('documents')}>
                  Upload document
                </button>
              </div>

              <SectionHeader title="Agent Tasks" subtitle="Workflow" />
              <div className="form-stack">
                <Field label="Task type">
                  <input
                    value={taskForm.task_type}
                    onChange={(event) => setTaskForm((current) => ({ ...current, task_type: event.target.value }))}
                    placeholder="finance_posting"
                  />
                </Field>
                <Field label="Instruction">
                  <textarea
                    rows={4}
                    value={taskForm.instruction}
                    onChange={(event) => setTaskForm((current) => ({ ...current, instruction: event.target.value }))}
                    placeholder="Close Q1 books"
                  />
                </Field>
                <div className="button-row">
                  <button type="button" onClick={createTask} disabled={!canUseApi}>
                    Create task
                  </button>
                  <button type="button" onClick={() => loadTasks(false)} disabled={!canUseApi}>
                    Reload tasks
                  </button>
                </div>
              </div>

              <div className="record-list">
                {tasksState.loading ? <div className="loading-bar">Loading tasks...</div> : null}
                {tasksState.error ? <div className="error-banner">{tasksState.error}</div> : null}
                {tasksState.items.slice(0, 5).map((task) => (
                  <article key={task.task_id} className="record-card">
                    <div className="record-card__header">
                      <strong>{task.task_id}</strong>
                      <span className="badge">{task.status}</span>
                    </div>
                    <p>{task.task_type}</p>
                    <p>{task.instruction}</p>
                  </article>
                ))}
                {!tasksState.loading && tasksState.items.length === 0 ? (
                  <EmptyState title="No tasks yet" detail="Create one from the form above." />
                ) : null}
              </div>

              <SectionHeader title="Approve task" subtitle="Workflow" />
              <div className="form-stack">
                <Field label="Task ID">
                  <input
                    value={taskForm.taskIdToApprove}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, taskIdToApprove: event.target.value }))
                    }
                    placeholder="task_..."
                  />
                </Field>
                <Field label="Reason">
                  <textarea
                    rows={3}
                    value={taskForm.approvalReason}
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, approvalReason: event.target.value }))
                    }
                  />
                </Field>
                <button type="button" onClick={approveTask} disabled={!canUseApi}>
                  Approve task
                </button>
              </div>

              <div className="events-panel">
                <h3>Realtime feed</h3>
                <div className="event-list">
                  {events.slice(0, 10).map((event, index) => (
                    <article key={`${event.timestamp}-${index}`} className="event-item">
                      <strong>{event.type}</strong>
                      <span>{formatDateTime(event.timestamp)}</span>
                    </article>
                  ))}
                  {events.length === 0 ? (
                    <EmptyState title="Waiting for events" detail="Socket feed will appear here." />
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'contacts' ? (
          <div className="content-grid">
            <section className="panel panel--span-2">
              <SectionHeader
                title="Contacts"
                subtitle="Master data"
                actions={
                  <button type="button" onClick={() => loadContacts(false)} disabled={!canUseApi}>
                    Reload
                  </button>
                }
              />

              <div className="controls-row">
                <Field label="Filter type">
                  <select
                    value={contactsState.filter}
                    onChange={(event) => {
                      const filter = event.target.value;
                      setContactsState((current) => ({ ...current, filter }));
                    }}
                  >
                    <option value="all">All</option>
                    <option value="debtor">Debtors</option>
                    <option value="creditor">Creditors</option>
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={() => loadContacts(false)}
                  disabled={!canUseApi || contactsState.loading}
                >
                  Apply filter
                </button>
              </div>

              {contactsState.error ? <div className="error-banner">{contactsState.error}</div> : null}
              {contactsState.loading ? <div className="loading-bar">Loading contacts...</div> : null}

              <div className="record-list">
                {contactsState.items.map((contact) => (
                  <article key={contact.id} className="record-card">
                    <div className="record-card__header">
                      <strong>{contact.name}</strong>
                      <span className="badge">{contact.type}</span>
                    </div>
                    <p>{contact.contact_no}</p>
                    <p>{contact.company || 'No company'}</p>
                    <p>{contact.email || 'No email'}</p>
                  </article>
                ))}
                {!contactsState.loading && contactsState.items.length === 0 ? (
                  <EmptyState title="No contacts found" detail="Create the first record using the form on the right." />
                ) : null}
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Create contact" subtitle="Contacts" />
              <div className="form-stack">
                <Field label="Type">
                  <select
                    value={contactsForm.type}
                    onChange={(event) => setContactsForm((current) => ({ ...current, type: event.target.value }))}
                  >
                    <option value="debtor">Debtor</option>
                    <option value="creditor">Creditor</option>
                  </select>
                </Field>
                <Field label="Name">
                  <input
                    value={contactsForm.name}
                    onChange={(event) => setContactsForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="John Doe"
                  />
                </Field>
                <Field label="Company">
                  <input
                    value={contactsForm.company}
                    onChange={(event) => setContactsForm((current) => ({ ...current, company: event.target.value }))}
                    placeholder="Acme GmbH"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={contactsForm.email}
                    onChange={(event) => setContactsForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={contactsForm.phone}
                    onChange={(event) => setContactsForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+43..."
                  />
                </Field>
                <Field label="Address JSON">
                  <textarea
                    rows={4}
                    value={contactsForm.address_json}
                    onChange={(event) =>
                      setContactsForm((current) => ({ ...current, address_json: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Payment terms JSON">
                  <textarea
                    rows={4}
                    value={contactsForm.payment_terms_json}
                    onChange={(event) =>
                      setContactsForm((current) => ({ ...current, payment_terms_json: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Accounting JSON">
                  <textarea
                    rows={4}
                    value={contactsForm.accounting_json}
                    onChange={(event) =>
                      setContactsForm((current) => ({ ...current, accounting_json: event.target.value }))
                    }
                  />
                </Field>
                <button type="button" onClick={createContact} disabled={!canUseApi}>
                  Create contact
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'finance' ? (
          <div className="content-grid">
            <section className="panel panel--span-2">
              <SectionHeader
                title="Finance"
                subtitle="Invoices, payments, journal entries"
                actions={
                  <button type="button" onClick={() => loadInvoices(false)} disabled={!canUseApi}>
                    Reload invoices
                  </button>
                }
              />

              <div className="finance-summary">
                <StatCard
                  label="Open receivables"
                  value={formatCurrency(
                    financeState.invoices
                      .filter((invoice) => Number(invoice.balance_amount || 0) > 0)
                      .reduce((sum, invoice) => sum + Number(invoice.balance_amount || 0), 0)
                  )}
                  tone="gold"
                />
                <StatCard
                  label="Total invoices"
                  value={financeState.invoices.length}
                  tone="blue"
                />
                <StatCard
                  label="Pending approval"
                  value={events.filter((event) => event.type === 'finance.approval.required').length}
                  tone="purple"
                />
              </div>

              {financeState.error ? <div className="error-banner">{financeState.error}</div> : null}
              {financeState.loading ? <div className="loading-bar">Loading invoices...</div> : null}

              <div className="record-list">
                {financeState.invoices.map((invoice) => (
                  <article key={invoice.id} className="record-card">
                    <div className="record-card__header">
                      <strong>{invoice.invoice_no}</strong>
                      <span className="badge">{invoice.status}</span>
                    </div>
                    <p>{formatCurrency(invoice.total_gross)}</p>
                    <p>
                      Contact #{invoice.contact_id} · Due {formatDate(invoice.due_date)}
                    </p>
                    <p>{invoice.description || 'No description'}</p>
                  </article>
                ))}
                {!financeState.loading && financeState.invoices.length === 0 ? (
                  <EmptyState title="No invoices found" detail="Create an invoice from the form at right." />
                ) : null}
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Create invoice" subtitle="Finance" />
              <div className="form-stack">
                <Field label="Contact ID">
                  <input
                    value={invoiceForm.contact_id}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, contact_id: event.target.value }))}
                    placeholder="1"
                  />
                </Field>
                <Field label="Issue date">
                  <input
                    type="date"
                    value={invoiceForm.issue_date}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, issue_date: event.target.value }))}
                  />
                </Field>
                <Field label="Due date">
                  <input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, due_date: event.target.value }))}
                  />
                </Field>
                <Field label="Subtotal">
                  <input
                    inputMode="decimal"
                    value={invoiceForm.subtotal_net}
                    onChange={(event) =>
                      setInvoiceForm((current) => ({ ...current, subtotal_net: event.target.value }))
                    }
                    placeholder="1000"
                  />
                </Field>
                <Field label="Tax rate">
                  <input
                    inputMode="decimal"
                    value={invoiceForm.tax_rate}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, tax_rate: event.target.value }))}
                    placeholder="19"
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={invoiceForm.description}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Invoice for services"
                  />
                </Field>
                <button type="button" onClick={createInvoice} disabled={!canUseApi}>
                  Create invoice
                </button>
              </div>

              <SectionHeader title="Post payment" subtitle="Finance" />
              <div className="form-stack">
                <Field label="Contact ID">
                  <input
                    value={paymentForm.contact_id}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, contact_id: event.target.value }))}
                    placeholder="1"
                  />
                </Field>
                <Field label="Invoice ID (optional)">
                  <input
                    value={paymentForm.invoice_id}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, invoice_id: event.target.value }))}
                    placeholder="42"
                  />
                </Field>
                <Field label="Payment date">
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, payment_date: event.target.value }))}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    inputMode="decimal"
                    value={paymentForm.total_amount}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, total_amount: event.target.value }))
                    }
                    placeholder="1250"
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    rows={3}
                    value={paymentForm.description}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Customer payment"
                  />
                </Field>
                <button type="button" onClick={createPayment} disabled={!canUseApi}>
                  Post payment
                </button>
              </div>

              <SectionHeader title="Journal entry" subtitle="Finance" />
              <div className="form-stack">
                <Field label="Entry date">
                  <input
                    type="date"
                    value={journalForm.entry_date}
                    onChange={(event) => setJournalForm((current) => ({ ...current, entry_date: event.target.value }))}
                  />
                </Field>
                <Field label="Description">
                  <input
                    value={journalForm.description}
                    onChange={(event) => setJournalForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Monthly accrual"
                  />
                </Field>
                <Field label="Debit account">
                  <input
                    value={journalForm.debit_account}
                    onChange={(event) => setJournalForm((current) => ({ ...current, debit_account: event.target.value }))}
                  />
                </Field>
                <Field label="Credit account">
                  <input
                    value={journalForm.credit_account}
                    onChange={(event) => setJournalForm((current) => ({ ...current, credit_account: event.target.value }))}
                  />
                </Field>
                <Field label="Amount">
                  <input
                    inputMode="decimal"
                    value={journalForm.amount}
                    onChange={(event) => setJournalForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="1000"
                  />
                </Field>
                <button type="button" onClick={createJournalEntry} disabled={!canUseApi}>
                  Post journal
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'projects' ? (
          <div className="content-grid">
            <section className="panel panel--span-2">
              <SectionHeader
                title="Projects"
                subtitle="Planning"
                actions={
                  <button type="button" onClick={() => loadProjects(false)} disabled={!canUseApi}>
                    Reload
                  </button>
                }
              />

              {projectsState.error ? <div className="error-banner">{projectsState.error}</div> : null}
              {projectsState.loading ? <div className="loading-bar">Loading projects...</div> : null}

              <div className="project-layout">
                <div className="record-list">
                  {projectsState.items.map((project) => (
                    <article
                      key={project.id}
                      className={`record-card clickable ${
                        String(project.id) === String(projectsState.selectedProjectId) ? 'is-selected' : ''
                      }`}
                      onClick={() => loadProjectSprints(project.id, true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          loadProjectSprints(project.id, true);
                        }
                      }}
                    >
                      <div className="record-card__header">
                        <strong>{project.name}</strong>
                        <span className="badge">{project.status}</span>
                      </div>
                      <p>{project.project_no}</p>
                      <p>{project.methodology}</p>
                      <p>{formatCurrency(project.token_budget || 0)} token budget</p>
                    </article>
                  ))}
                  {!projectsState.loading && projectsState.items.length === 0 ? (
                    <EmptyState title="No projects found" detail="Create one using the form on the right." />
                  ) : null}
                </div>

                <div className="record-detail">
                  <h3>{selectedProject ? selectedProject.name : 'Select a project'}</h3>
                  <p>{selectedProject ? selectedProject.notes || 'No notes' : 'Sprint details will appear here.'}</p>
                  {projectsState.sprintError ? <div className="error-banner">{projectsState.sprintError}</div> : null}
                  {projectsState.sprintLoading ? <div className="loading-bar">Loading sprints...</div> : null}
                  <div className="compact-list">
                    {projectsState.sprints.map((sprint) => (
                      <article key={sprint.id} className="compact-item">
                        <strong>{sprint.name}</strong>
                        <span>
                          {sprint.sprint_no} · {sprint.status} · {formatDate(sprint.start_date)} to {formatDate(sprint.end_date)}
                        </span>
                      </article>
                    ))}
                    {!projectsState.sprintLoading && projectsState.sprints.length === 0 ? (
                      <EmptyState title="No sprints yet" detail="Create a sprint using the form at right." />
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Create project" subtitle="Projects" />
              <div className="form-stack">
                <Field label="Name">
                  <input
                    value={projectForm.name}
                    onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Apollo Portal"
                  />
                </Field>
                <Field label="Code">
                  <input
                    value={projectForm.code}
                    onChange={(event) => setProjectForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="APOLLO"
                  />
                </Field>
                <Field label="Methodology">
                  <select
                    value={projectForm.methodology}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, methodology: event.target.value }))
                    }
                  >
                    <option value="scrum">Scrum</option>
                    <option value="kanban">Kanban</option>
                    <option value="safe">SAFe</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    value={projectForm.status}
                    onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Token budget">
                  <input
                    inputMode="decimal"
                    value={projectForm.token_budget}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, token_budget: event.target.value }))
                    }
                    placeholder="250000"
                  />
                </Field>
                <Field label="Client contact ID">
                  <input
                    value={projectForm.client_contact_id}
                    onChange={(event) =>
                      setProjectForm((current) => ({ ...current, client_contact_id: event.target.value }))
                    }
                    placeholder="1"
                  />
                </Field>
                <Field label="Start date">
                  <input
                    type="date"
                    value={projectForm.start_date}
                    onChange={(event) => setProjectForm((current) => ({ ...current, start_date: event.target.value }))}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    value={projectForm.end_date}
                    onChange={(event) => setProjectForm((current) => ({ ...current, end_date: event.target.value }))}
                  />
                </Field>
                <Field label="Notes">
                  <textarea
                    rows={3}
                    value={projectForm.notes}
                    onChange={(event) => setProjectForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </Field>
                <button type="button" onClick={createProject} disabled={!canUseApi}>
                  Create project
                </button>
              </div>

              <SectionHeader title="Create sprint" subtitle="Projects" />
              <div className="form-stack">
                <Field label="Sprint name">
                  <input
                    value={sprintForm.name}
                    onChange={(event) => setSprintForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Sprint 1"
                  />
                </Field>
                <Field label="Goal">
                  <input
                    value={sprintForm.goal}
                    onChange={(event) => setSprintForm((current) => ({ ...current, goal: event.target.value }))}
                    placeholder="Foundation work"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={sprintForm.status}
                    onChange={(event) => setSprintForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active</option>
                    <option value="review">Review</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                <Field label="Start date">
                  <input
                    type="date"
                    value={sprintForm.start_date}
                    onChange={(event) => setSprintForm((current) => ({ ...current, start_date: event.target.value }))}
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    value={sprintForm.end_date}
                    onChange={(event) => setSprintForm((current) => ({ ...current, end_date: event.target.value }))}
                  />
                </Field>
                <Field label="Budget tokens">
                  <input
                    inputMode="decimal"
                    value={sprintForm.budget_tokens}
                    onChange={(event) =>
                      setSprintForm((current) => ({ ...current, budget_tokens: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Budget USD">
                  <input
                    inputMode="decimal"
                    value={sprintForm.budget_usd}
                    onChange={(event) =>
                      setSprintForm((current) => ({ ...current, budget_usd: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Warn threshold">
                  <input
                    inputMode="decimal"
                    value={sprintForm.warn_threshold}
                    onChange={(event) =>
                      setSprintForm((current) => ({ ...current, warn_threshold: event.target.value }))
                    }
                  />
                </Field>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={sprintForm.hard_limit}
                    onChange={(event) =>
                      setSprintForm((current) => ({ ...current, hard_limit: event.target.checked }))
                    }
                  />
                  Hard limit
                </label>
                <button type="button" onClick={createSprint} disabled={!canUseApi || !projectsState.selectedProjectId}>
                  Create sprint
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className="content-grid">
            <section className="panel panel--span-2">
              <SectionHeader
                title="Documents"
                subtitle="Nextcloud"
                actions={
                  <button type="button" onClick={() => loadDocumentsForCurrentRecord(false)} disabled={!canUseApi}>
                    Reload
                  </button>
                }
              />

              <div className="controls-row">
                <Field label="Record type">
                  <input
                    value={documentsState.selectedRecordType}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDocumentsState((current) => ({
                        ...current,
                        selectedRecordType: value
                      }));
                    }}
                    placeholder="contacts"
                  />
                </Field>
                <Field label="Record ID">
                  <input
                    value={documentsState.selectedRecordId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDocumentsState((current) => ({
                        ...current,
                        selectedRecordId: value
                      }));
                    }}
                    placeholder="1"
                  />
                </Field>
                <button type="button" onClick={() => loadDocumentsForCurrentRecord(false)} disabled={!canUseApi}>
                  Load
                </button>
              </div>

              {documentsState.error ? <div className="error-banner">{documentsState.error}</div> : null}
              {documentsState.loading ? <div className="loading-bar">Loading documents...</div> : null}

              <div className="record-list">
                {documentsState.items.map((document) => (
                  <article key={document.id} className="record-card">
                    <div className="record-card__header">
                      <strong>{document.filename}</strong>
                      <span className="badge">{document.mime_type || 'file'}</span>
                    </div>
                    <p>{document.nextcloud_path}</p>
                    <p>{formatDateTime(document.created_at)}</p>
                    <div className="button-row">
                      <button type="button" onClick={() => deleteDocument(document.id)} disabled={!canUseApi}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {!documentsState.loading && documentsState.items.length === 0 ? (
                  <EmptyState title="No documents found" detail="Use the upload form to attach one." />
                ) : null}
              </div>
            </section>

            <section className="panel">
              <SectionHeader title="Upload document" subtitle="Documents" />
              <div className="form-stack">
                <Field label="Record type">
                  <input
                    value={documentForm.record_type}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, record_type: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Record ID">
                  <input
                    value={documentForm.record_id}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, record_id: event.target.value }))}
                  />
                </Field>
                <Field label="Filename">
                  <input
                    value={documentForm.filename}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, filename: event.target.value }))}
                    placeholder="Invoice_001.pdf"
                  />
                </Field>
                <Field label="MIME type">
                  <input
                    value={documentForm.mime_type}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, mime_type: event.target.value }))}
                    placeholder="application/pdf"
                  />
                </Field>
                <Field label="Content">
                  <textarea
                    rows={6}
                    value={documentForm.content}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, content: event.target.value }))}
                  />
                </Field>
                <Field label="Metadata JSON">
                  <textarea
                    rows={4}
                    value={documentForm.metadata_json}
                    onChange={(event) =>
                      setDocumentForm((current) => ({ ...current, metadata_json: event.target.value }))
                    }
                  />
                </Field>
                <button
                  type="button"
                  onClick={async () => {
                    setDocumentsState((current) => ({
                      ...current,
                      selectedRecordType: documentForm.record_type,
                      selectedRecordId: documentForm.record_id
                    }));
                    await uploadDocument(documentForm.record_type, documentForm.record_id);
                  }}
                  disabled={!canUseApi}
                >
                  Upload document
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
