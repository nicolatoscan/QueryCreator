var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var typesMap = {
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
};
function mapTypes(type, forND) {
    if (forND === void 0) { forND = false; }
    // remove [ ] from type
    var res = typesMap[type.replace('[', '').replace(']', '')];
    if (!res) {
        throw new Error("Type ".concat(type, " not found"));
    }
    if (forND && res == '\'\'')
        return '\'NA\'';
    return res;
}
function getFields(input) {
    return input.split('\n').map(function (f) {
        var _a = f.trim().split(' ').splice(0, 2), name = _a[0], type = _a[1];
        return { name: name.trim(), type: type.trim() };
    });
}
function scriptMerge(field, table, schemaFrom, schemaTo, extKey) {
    var lastUpdateDtField = { name: 'LastUpdateDt', type: 'datetime' };
    var extKeyField = { name: extKey, type: 'string' };
    var res = "MERGE [".concat(schemaFrom, "].[").concat(table, "] AS MyTarget USING (\n") +
        __spreadArray([lastUpdateDtField, extKeyField], field, true).map(function (f) { return "\t".concat(f.name); }).join(',\n') +
        "\n\tFROM ".concat(schemaTo, ".").concat(table) +
        "\n) AS MySource ON MyTarget.".concat(extKey, " = MySource.").concat(extKey, " WHEN MATCHED AND NOT (\n") +
        field.map(function (f) { return "\tMySource.".concat(f.name, " = ISNULL(MyTarget.").concat(f.name, ",").concat(mapTypes(f.type), ")"); }).join(' AND\n') +
        "\n) THEN UPDATE SET\n" +
        __spreadArray([lastUpdateDtField], field, true).map(function (f) { return "\tMyTarget.".concat(f.name, " = MySource.").concat(f.name); }).join(',\n') +
        ';';
    return res;
}
function scriptNd(field, table, schema, key) {
    return "SET IDENTITY_INSERT ".concat(schema, ".").concat(table, " ON;\n") +
        "IF NOT EXISTS(SELECT ".concat(key, " FROM ").concat(schema, ".").concat(table, " WHERE ").concat(key, " = 0)\n") +
        "BEGIN INSERT INTO ".concat(schema, ".").concat(table, "(\n") +
        field.map(function (f) { return "\t".concat(f.name); }).join(',\n') +
        "\n) VALUES (\n" +
        field.map(function (f) { return "\t".concat(mapTypes(f.type, true)); }).join(',\n') +
        "\n) END;\n" +
        "SET IDENTITY_INSERT ".concat(schema, ".").concat(table, " OFF;");
}
function parse() {
    // get text in textarea with id fields
    var fields = getFields(document.getElementById('fields').value);
    var table = document.getElementById('table').value;
    var schemaFrom = document.getElementById('schemaFrom').value;
    var schemaTo = document.getElementById('schemaTo').value;
    var extKey = document.getElementById('extKey').value;
    document.getElementById('resultMerge').value = scriptMerge(fields, table, schemaFrom, schemaTo, extKey);
    document.getElementById('resultND').value = scriptNd(fields, table, schemaFrom, extKey);
}
