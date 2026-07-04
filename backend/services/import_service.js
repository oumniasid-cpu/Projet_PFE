const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const pool = require('../db');

const clean = (value) => String(value ?? '').trim();

const normalizeKey = (value) =>
  clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9%]+/g, '');

const columnAliases = {
  wbs_code: ['wbs', 'wbs code', 'code wbs'],
  name: ['task name', 'nom tache', 'nom de la tache', 'tache', 'name', 'task'],
  planned_start: ['start date', 'debut prevu', 'date debut', 'debut', 'planned start'],
  planned_end: ['end date', 'fin prevue', 'date fin', 'fin', 'planned end'],
  duration_days: ['duration', 'duree', 'duree jours', 'duration days'],
  progress_percent: ['% complete', 'complete', 'avancement %', 'avancement', 'progress', 'progression'],
  planned_cost: ['planned cost', 'cout prevu', 'cost', 'budget', 'cout'],
  responsible: ['responsible', 'responsable', 'owner', 'affecte a'],
};

const aliasesByField = Object.fromEntries(
  Object.entries(columnAliases).map(([field, aliases]) => [
    field,
    aliases.map(normalizeKey),
  ])
);

const getCell = (row, field) => {
  const keys = Object.keys(row);
  const aliases = aliasesByField[field];
  const found = keys.find((key) => aliases.some((alias) => normalizeKey(key).includes(alias)));
  return found ? row[found] : '';
};

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(String(value).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(num) ? num : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
    }
  }
  const text = clean(value);
  const fr = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (fr) {
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return `${year}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const normalizeStatus = (progress, plannedEnd) => {
  if (progress >= 100) return 'done';
  if (plannedEnd && new Date(plannedEnd) < new Date()) return 'delayed';
  if (progress > 0) return 'in_progress';
  return 'not_started';
};

const normalizeTask = (raw) => {
  const progress = Math.max(0, Math.min(100, toNumber(raw.progress_percent)));
  const plannedStart = toDate(raw.planned_start);
  const plannedEnd = toDate(raw.planned_end);
  return {
    wbs_code: clean(raw.wbs_code),
    name: clean(raw.name),
    planned_start: plannedStart,
    planned_end: plannedEnd,
    duration_days: Math.max(0, Math.round(toNumber(raw.duration_days))),
    progress_percent: progress,
    planned_cost: toNumber(raw.planned_cost),
    responsible: clean(raw.responsible),
    status: normalizeStatus(progress, plannedEnd),
  };
};

const parse_excel = (file) => {
  const workbook = XLSX.readFile(file.path, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const tasks = rows
    .map((row) => normalizeTask({
      wbs_code: getCell(row, 'wbs_code'),
      name: getCell(row, 'name'),
      planned_start: getCell(row, 'planned_start'),
      planned_end: getCell(row, 'planned_end'),
      duration_days: getCell(row, 'duration_days'),
      progress_percent: getCell(row, 'progress_percent'),
      planned_cost: getCell(row, 'planned_cost'),
      responsible: getCell(row, 'responsible'),
    }))
    .filter((task) => task.name);

  if (!tasks.length) {
    throw new Error('Aucune tâche valide trouvée dans le fichier Excel.');
  }
  return tasks;
};

const getXmlValue = (block, tag) => {
  const match = block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i'));
  return match ? clean(match[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : '';
};

const parseDurationDays = (value) => {
  const text = clean(value);
  const dayMatch = text.match(/P(?:(\d+)D)?T?/i);
  if (dayMatch?.[1]) return Number(dayMatch[1]);
  const hourMatch = text.match(/PT(?:(\d+)H)?/i);
  if (hourMatch?.[1]) return Math.ceil(Number(hourMatch[1]) / 8);
  return toNumber(text);
};

const parse_msproject_xml = (file) => {
  const xml = fs.readFileSync(file.path, 'utf8');
  const blocks = [...xml.matchAll(/<(?:\w+:)?Task\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Task>/gi)].map((m) => m[1]);

  const tasks = blocks
    .map((block) => {
      const outlineLevel = toNumber(getXmlValue(block, 'OutlineLevel'), 1);
      const summary = getXmlValue(block, 'Summary');
      if (outlineLevel === 0 || summary === '1') return null;

      return normalizeTask({
        wbs_code: getXmlValue(block, 'WBS') || getXmlValue(block, 'OutlineNumber'),
        name: getXmlValue(block, 'Name'),
        planned_start: getXmlValue(block, 'Start'),
        planned_end: getXmlValue(block, 'Finish'),
        duration_days: parseDurationDays(getXmlValue(block, 'Duration')),
        progress_percent: getXmlValue(block, 'PercentComplete'),
        planned_cost: toNumber(getXmlValue(block, 'Cost')) / 100,
        responsible: getXmlValue(block, 'Contact'),
      });
    })
    .filter((task) => task?.name);

  if (!tasks.length) {
    throw new Error('Aucune tâche valide trouvée dans le fichier XML MS Project.');
  }
  return tasks;
};

const getParentWbs = (wbs) => {
  const parts = clean(wbs).split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
};

const weightedProgress = (tasks) => {
  const totalDuration = tasks.reduce((sum, task) => sum + (task.duration_days || 1), 0);
  if (!totalDuration) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + task.progress_percent * (task.duration_days || 1), 0) / totalDuration);
};

const save_project_from_import = async (projectName, tasksList, ownerId, fileName, fileType, importSource) => {
  const client = await pool.connect();
  const taskIdsByWbs = new Map();
  const startDates = tasksList.map((task) => task.planned_start).filter(Boolean).sort();
  const endDates = tasksList.map((task) => task.planned_end).filter(Boolean).sort();
  const plannedBudget = tasksList.reduce((sum, task) => sum + Number(task.planned_cost || 0), 0);

  try {
    await client.query('BEGIN');
    const projectResult = await client.query(
      `INSERT INTO projects (
        name, description, owner_id, start_date, end_date, planned_budget,
        actual_cost, status, import_source, budget_total, budget_spent, progress
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', $7, $6, 0, $8)
      RETURNING id`,
      [
        projectName,
        `Projet importé depuis ${fileName}`,
        ownerId,
        startDates[0] || new Date().toISOString().slice(0, 10),
        endDates[endDates.length - 1] || startDates[0] || new Date().toISOString().slice(0, 10),
        plannedBudget,
        importSource,
        weightedProgress(tasksList),
      ]
    );
    const projectId = projectResult.rows[0].id;

    for (const task of tasksList) {
      const parentWbs = getParentWbs(task.wbs_code);
      const parentTaskId = parentWbs ? taskIdsByWbs.get(parentWbs) || null : null;
      const inserted = await client.query(
        `INSERT INTO tasks (
          project_id, parent_task_id, wbs_code, name, title, planned_start,
          planned_end, duration_days, progress_percent, planned_cost, actual_cost, status
        )
        VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, 0, $10)
        RETURNING id`,
        [
          projectId,
          parentTaskId,
          task.wbs_code || null,
          task.name,
          task.planned_start,
          task.planned_end,
          task.duration_days,
          task.progress_percent,
          task.planned_cost,
          task.status,
        ]
      );
      if (task.wbs_code) taskIdsByWbs.set(task.wbs_code, inserted.rows[0].id);
    }

    await client.query(
      `INSERT INTO import_logs (
        project_id, imported_by, file_name, file_type, rows_imported, status
      )
      VALUES ($1, $2, $3, $4, $5, 'success')`,
      [projectId, ownerId, fileName, fileType, tasksList.length]
    );
    await client.query('COMMIT');
    return projectId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteTempFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
};

module.exports = {
  parse_excel,
  parse_msproject_xml,
  save_project_from_import,
  deleteTempFile,
};
