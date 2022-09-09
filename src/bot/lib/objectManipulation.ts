export function getObjectInvalidProperties<T>(data: T, template: T, keyPath: string = '<root>') {
    const invalidProperties: { key: string; expected: string; received: string }[] = [];

    const templateType = Object.prototype.toString.call(template);
    const dataType = Object.prototype.toString.call(data);

    if (templateType !== dataType) {
        invalidProperties.push({ key: keyPath, expected: templateType.slice(8, -1), received: dataType.slice(8, -1) });
    } else if (template && typeof template === 'object') {
        for (const key in template) {
            invalidProperties.push(...getObjectInvalidProperties(data[key], template[key], keyPath + '.' + key));
        }
    }

    return invalidProperties;
}

export function updateObjectValueByStringPath(object: Record<string, any>, path: string, newValue: any) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) throw 'The specified path is empty.';

    for (const key of keys) {
        object = object[key];
    }

    const oldValue = object[lastKey];
    const invalidProperties = getObjectInvalidProperties(newValue, oldValue, path);

    if (invalidProperties.length !== 0) {
        throw invalidProperties.reduce((message, property) => message + `\`${property.key}\`: expected \`${property.expected}\`, received \`${property.received}\`\n`, '**Invalid Properties**\n');
    }

    object[lastKey] = newValue;
    return oldValue;
}

export function setObjectValueByStringPath(object: Record<string, any>, path: string, newValue: any) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) throw 'The specified path is empty.';

    for (const key of keys) {
        if (object[key] === undefined) object[key] = {};
        object = object[key];
    }

    object[lastKey] = newValue;
}
