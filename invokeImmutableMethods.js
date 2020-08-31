const R = require('ramda');
const immutable = require('immutable');
const debug = require('debug')('ntk:invokeImmutableMethods');
const {
  Either, either, Maybe, maybe,
} = require('monet');

const collectionShortcuts = {
  v(...args) { return new immutable.List(args); },
  m(obj) { return new immutable.Map(obj); },
  t: immutable.fromJS,
  record: (obj) => (new immutable.Record(obj))(obj),
};

const {
  m, v, t, record,
} = collectionShortcuts;

/*
const checkNarrowType = function checkNarrowType(a, b) {
    if (!(a === b)) {
        throw new Error(
            `Value for ${key} should be ${allowedTypes} not ${val}`,
        );
    }
};
*/

const IInvoked = {
  toJS: R.invoker(0, 'toJS'),
  toObject: R.invoker(0, 'toObject'),
  toArray: R.invoker(0, 'toArray'),
  toString: R.invoker(0, 'toString'),
  keys: R.invoker(0, 'keys'),
  reverse: R.invoker(0, 'reverse'),
  entries: R.invoker(0, 'entries'),
  map: R.invoker(1, 'map'),
  filter: R.invoker(1, 'filter'),
  filterNot: R.invoker(1, 'filterNot'),
  reduce: R.invoker(2, 'reduce'),
  sort: R.invoker(1, 'sort'),
  sortBy: R.invoker(1, 'sortBy'),
  groupBy: R.invoker(1, 'groupBy'),
  get: R.invoker(1, 'get'),
  set: R.invoker(2, 'set'),
  first: R.invoker(0, 'first'),
  rest: R.invoker(0, 'rest'),
  take: R.invoker(1, 'take'),
  delete: R.invoker(1, 'delete'),
  insert: R.invoker(2, 'insert'),
  clear: R.invoker(0, 'clear'),
  last: R.invoker(0, 'last'),
  merge: R.invoker(1, 'merge'),
  mergeDeep: R.invoker(1, 'mergeDeep'),
  push: R.invoker(1, 'push'),
  pop: R.invoker(0, 'pop'),
  shift: R.invoker(0, 'shift'),
  unshift: R.invoker(0, 'unshift'),
  update: R.invoker(2, 'update'),
  concat: R.invoker(1, 'concat'),
  flatMap: R.invoker(2, 'flatMap'),
  size: (list) => list.size,
  isEmpty: R.invoker(0, 'isEmpty'),
};

const path = function path(keys, map) {
  debug(keys.toString());
  debug(keys.first());
  debug(map.toString());
  debug(map);
  const nextItem = map.get(keys.first());
  debug(nextItem.toString());
  if (!nextItem) return undefined;
  debug(`rest is empty: ${keys.rest().isEmpty()}`);
  return keys.rest().isEmpty() ? nextItem : path(keys.rest(), nextItem);
};

const makeFromPath = function makeFromPath(keyArray, inputObject) {
  // debug(keyArray);
  const key = IInvoked.first(keyArray);
  const restOfKeys = IInvoked.rest(keyArray);
  return IInvoked.isEmpty(restOfKeys)
    ? m(key, inputObject.get(key))
    : m(key, makeFromPath(restOfKeys, inputObject.get(key)));
};

const strictMakeFromPath = function strictMakeFromPath(keyArray, inputObject) {
  return path(keyArray, inputObject) === undefined
    ? undefined
    : makeFromPath(keyArray, inputObject);
};

const INewNoCurry = {
  type(item) {
    if (item instanceof immutable.List) return 'IList';
    if (item instanceof immutable.Map) return 'IMap';
    if (item instanceof immutable.Record) return 'IRecord';
    return R.type(item);
  },
  pour(val, ...fns) {
    R.pipe(...fns)(val);
  },
};

const INew = {
  // MAP
  path,
  pickPaths(paths, map) {
    debug(paths);
    debug(map);
    return IInvoked.reduce(
      (acc, keyPath) => {
        const pathObject = strictMakeFromPath(keyPath, map);
        return pathObject
          ? IInvoked.merge(acc, pathObject)
          : acc;
      },
      m(),
    );
  },
  hasProp(attrName, obj) {
    return obj[attrName] !== undefined;
  },
  /*
    narrow(selection, mapping) {
        for ([key, val] of mapping.entries()) {
            if (!(selection.has(key))) continue;
            const allowedTypes = selection.get(key);
            if (type(allowedTypes) === 'IMap' && type(val) === 'IMap') {
                selection = selection.set(
                    key, INew.narrow(allowedTypes, val)
                );
                continue;
            }
            if (type(allowedTypes) === 'IList') {
                allowedTypes.every(checkNarrowType(type(val)));
            } else {
                checkNarrowType(type(val), allowedTypes);
            }
            if (!(type(val) === selection.get(key))) {
                throw new Error(
                    `Value for ${key} should be ${allowedTypes} not ${val}`
                );
            }
            selection = selection.set(key, val);
        }
        return selection;
    },
    */
  /*
  mergeAll(maps) {
    return IInvoked.reduce(
      IInvoked.merge,
      collectionShortcuts.m(),
    );
  },
  */
  // GENERAL
  applyToArgs(args, fn) {
    return fn(...args);
  },
  // STRING
  match(re, str) {
    return immutable.fromJS(R.match(re, str));
  },
};

module.exports.I = {
  ...IInvoked,
  ...INewNoCurry,
  ...Object.fromEntries(Object.entries(INew)
    .map(([key, val]) => [key, R.curry(val)])),
};

module.exports.collectionShortcuts = collectionShortcuts;
