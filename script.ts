type Field = {name: string, type: string};

const typesMap = {
  'int': '0',
  'string': '\'\'',
  'datetime': '\'1900-01-01\'',
  'date': '\'1900-01-01\'',
  'bit': '0',
  'decimal': '0',
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

function getFields(input: string): Field[] {
  return input.split('\n').map(f => {
    const [name, type] = f.trim().split(' ').splice(0,2);
    return { name: name.trim(), type: type.trim() };
  });
}

function scriptMerge(field: Field[], table: string, schemaFrom: string, schemaTo: string, extKey: string): string {
  const lastUpdateDtField: Field = { name: 'LastUpdateDt', type: 'datetime' };
  const extKeyField: Field = { name: extKey, type: 'string' };


  const res = `MERGE [${schemaFrom}].[${table}] AS MyTarget USING (\n` + 
    [lastUpdateDtField, extKeyField, ...field].map(f => `\t${f.name}`).join(',\n') +
  `\n\tFROM ${schemaTo}.${table}` +
  `\n) AS MySource ON MyTarget.${extKey} = MySource.${extKey} WHEN MATCHED AND NOT (\n` +
    field.map(f => `\tMySource.${f.name} = ISNULL(MyTarget.${f.name},${mapTypes(f.type)})`).join(' AND\n') +
  `\n) THEN UPDATE SET\n` +
  [lastUpdateDtField, ...field].map(f => `\tMyTarget.${f.name} = MySource.${f.name}`).join(',\n') +
  ';'

  return res;
}

function scriptNd(field: Field[], table: string, schema: string, key: string): string {
  return `SET IDENTITY_INSERT ${schema}.${table} ON;\n` +
    `IF NOT EXISTS(SELECT ${key} FROM ${schema}.${table} WHERE ${key} = 0)\n` +
    `BEGIN INSERT INTO ${schema}.${table}(\n` +
      field.map(f => `\t${f.name}`).join(',\n') +
    `\n) VALUES (\n` +
      field.map(f => `\t${mapTypes(f.type, true)}`).join(',\n') +
    `\n) END;\n` +
    `SET IDENTITY_INSERT ${schema}.${table} OFF;`;
}

function parse() {
  // get text in textarea with id fields
  const fields = getFields((document.getElementById('fields') as HTMLTextAreaElement).value);
  const table  = (document.getElementById('table') as HTMLInputElement).value;
  const schemaFrom = (document.getElementById('schemaFrom') as HTMLInputElement).value;
  const schemaTo = (document.getElementById('schemaTo') as HTMLInputElement).value;
  const extKey = (document.getElementById('extKey') as HTMLInputElement).value;
  (document.getElementById('resultMerge') as HTMLTextAreaElement).value = scriptMerge(fields, table, schemaFrom, schemaTo, extKey);
  (document.getElementById('resultND') as HTMLTextAreaElement).value = scriptNd(fields, table, schemaFrom, extKey);
}