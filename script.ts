type Field = {name: string, type: string};

// -- TYPES MAPPING
const typesMap: { [id: string]: string } = {
  'int': '0',
  'string': '\'\'',
  'datetime': '\'1900-01-01\'',
  'date': '\'1900-01-01\'',
  'bit': '0',
  'decimal': '0',
  'numeric': '0',
  'float': '0',
  'money': '0',
  'smallint': '0',
  'tinyint': '0',
  'bigint': '0',
  'nvarchar': '\'\'',
}
function mapTypes(type: string, forND: boolean = false): string {
  // remove [ ] from type
  const res = typesMap[type.replace('[', '').replace(']', '')];
  if (!res) {
    throw new Error(`Type ${type} not found`);
  }
  if (forND && res == '\'\'')
    return '\'NA\'';
  return res;
}

function getResultInput() {
  return document.getElementById('result') as HTMLTextAreaElement;
}

function getInputText(id: string) {
  return(document.getElementById(id) as HTMLInputElement).value?.trim() ?? '';
}

function getFieldsAndType(input: string): Field[] {
  return input.split('\n').map(f => {
    const [name, type] = f.trim().split(' ').splice(0,2);
    return { name: name.trim(), type: type.trim() };
  });
}

function getFields(input: string): string[] {
  return input.split('\n').map(f => f.trim().replace('[', '').replace(']', ''));
}

function queryMerge(field: Field[], table: string, schemaFrom: string, schemaTo: string, extKey: string): string {
  const lastUpdateDtField: Field = { name: 'LastUpdateDt', type: 'datetime' };
  const extKeyField: Field = { name: extKey, type: 'string' };


  const res = `MERGE [${schemaFrom}].[${table}] AS MyTarget USING (\n` + 
  `SELECT \n` +
    [lastUpdateDtField, extKeyField, ...field].map(f => `\t${f.name}`).join(',\n') +
  `\n\tFROM ${schemaTo}.${table}` +
  `\n) AS MySource ON MyTarget.${extKey} = MySource.${extKey} WHEN MATCHED AND NOT (\n` +
    field.map(f => `\tMySource.${f.name} = ISNULL(MyTarget.${f.name},${mapTypes(f.type)})`).join(' AND\n') +
  `\n) THEN UPDATE SET\n` +
  [lastUpdateDtField, ...field].map(f => `\tMyTarget.${f.name} = MySource.${f.name}`).join(',\n') +
  ';'

  return res;
}

function queryND(field: Field[], table: string, schema: string, key: string): string {
  return `SET IDENTITY_INSERT ${schema}.${table} ON;\n` +
    `IF NOT EXISTS(SELECT ${key} FROM ${schema}.${table} WHERE ${key} = 0)\n` +
    `BEGIN INSERT INTO ${schema}.${table}(\n` +
      field.map(f => `\t${f.name}`).join(',\n') +
    `\n) VALUES (\n` +
      field.map(f => `\t${mapTypes(f.type, true)}`).join(',\n') +
    `\n) END;\n` +
    `SET IDENTITY_INSERT ${schema}.${table} OFF;`;
}

function queryUnion(fieldsA: Field[], fieldsB: Field[], tableA: string, tableB: string, key: string): string {
  const allFields  =  [ ...new Set([...fieldsA, ...fieldsB]) ];
  const allNames  = allFields.map(f => f.name);
  const namesA = fieldsA.map(f => f.name);
  const namesB = fieldsB.map(f => f.name);
  return `SELECT\n` +
    allFields.map(f => `\t${mapTypes(f.type, true)} AS ${f.name}`).join(',\n') +
    `\n\nUNION ALL\n\n` +
    `SELECT\n` +
    allNames.map(n => namesA.includes(n) ? `\t${n}` : `\tNULL AS ${n}`).join(',\n') +
    `\nFROM ${tableA}\n` +
    `WHERE ${key} <> 0\n` +
    `\nUNION ALL\n\n` +
    `SELECT\n` +
    allNames.map(n => namesB.includes(n) ? `\t${n}` : `\tNULL AS ${n}`).join(',\n') +
    `\nFROM ${tableB}\n` +
    `WHERE ${key} <> 0\n`;
}

function merge() {
  const fields = getFieldsAndType(getInputText('fields'));
  const table  = getInputText('table');
  const schemaFrom = getInputText('schemaFrom');
  const schemaTo = getInputText('schemaTo');
  const extKey = getInputText('extKey');
  getResultInput().value = queryMerge(fields, table, schemaFrom, schemaTo, extKey);
}

function nd() {
  const fields = getFieldsAndType(getInputText('fields'));
  const table  = getInputText('table');
  const schema = getInputText('schema');
  const key = getInputText('key');
  getResultInput().value = queryND(fields, table, schema, key);
}

function union() {
  const fieldsA = getFieldsAndType(getInputText('fieldsA'));
  const fieldsB = getFieldsAndType(getInputText('fieldsB'));
  const tableA  = getInputText('tableA');
  const tableB  = getInputText('tableB');
  const key  = getInputText('key');
  getResultInput().value = queryUnion(fieldsA, fieldsB, tableA, tableB, key);
}

function parseQuery() {
  let t = getInputText('query');
  t = t.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/@(\w+)/g, '\'{$$$1}\'').replace(/DECLARE/g, '-- DECLARE');
  if (!t.startsWith('"'))
    t = `"${t}`;
  if (!t.endsWith('"'))
    t = `${t}"`;
  getResultInput().value = t;
}

function deparseQuery() {
  let t = getInputText('query');
  if (t.startsWith('"'))
    t = t.slice(1)
  if (t.endsWith('"'))
    t = t.slice(0, -1)
  t = t.replace(/\\n/g, '\n').replace(/\'{\$(\w+)}'/g, '@$1').replace(/-- DECLARE/g, 'DECLARE');
  getResultInput().value = t;
}



async function copy() {
  const t = getInputText('result');
  await navigator.clipboard.writeText(t);
}

let darktheme = localStorage.getItem('theme') == 'dark';
setTheme();
function toggleTheme() {
  darktheme = !darktheme;
  localStorage.setItem('theme', darktheme ? 'dark' : 'light');
  setTheme();
}
function setTheme() {
  document.documentElement.setAttribute('data-bs-theme', darktheme ? 'dark' : 'light');
}