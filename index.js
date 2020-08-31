const debug = require('debug')('ntk:index');
const R = require('ramda');
// const { Either } = require('monet');
const { I } = require('./invokeImmutableMethods');

const listify = (maybeList) => (R.is(Array, maybeList)
  ? maybeList
  : [maybeList]);

const unlist = (list) => (R.length(list) === 1 ? list[0] : list);

const applyToArgs = R.curry((args, fn) => fn(...args));

const makeFromPath = function makeFromPath(keyArray, inputObject) {
  // debug(keyArray);
  const key = R.head(keyArray);
  const restOfKeys = R.tail(keyArray);
  return R.isEmpty(restOfKeys)
    ? R.objOf(key, inputObject[key])
    : R.objOf(key, makeFromPath(restOfKeys, inputObject[key]));
};

const strictMakeFromPath = function strictMakeFromPath(keyArray, inputObject) {
  return R.path(keyArray, inputObject) === undefined
    ? undefined
    : makeFromPath(keyArray, inputObject);
};

const pickPaths = function pickPaths(paths, map) {
  return R.reduce(
    (acc, keyPath) => {
      const pathObject = strictMakeFromPath(keyPath, map);
      return pathObject
        ? R.merge(acc, pathObject)
        : acc;
    },
    new Object(),
  );
};

const userIsPermittedTo = R.curry(function userIsPermittedTo(
  roleSchema, action, userRoles, dataType,
) {
  return userRoles.some(R.tryCatch(
    (role) => (R.path([role, dataType, action], roleSchema) !== undefined),
    R.F,
  ));
});

const filterDocuments = R.curry(function filterDocuments(
  roleSchema,
  action,
  userRoles,
  dataType,
  options,
  unfilteredDocumentsOrDocument,
) {
  const unfilteredDocuments = listify(unfilteredDocumentsOrDocument);

  const permissions = R.pipe(
    Object.values,
    R.map(R.path([dataType, action])),
    R.filter(R.is(Object)),
    // R.filter(R.not(R.equals(undefined))),
  )(roleSchema);

  debug('permissions');
  debug(permissions);
  return unfilteredDocuments.filter(
    (doc) => permissions.some(R.pipe(
      R.prop('WHEN'),
      R.tryCatch(applyToArgs([doc, options]), R.F),
    )),
  ).map(
    (doc) => R.ifElse(
      R.any((x) => x(doc, options) === true),
      R.always(doc),
      R.pipe(
        R.chain(R.tryCatch(
          applyToArgs([doc, options]),
          R.always([]),
        )),
        R.map(R.split('.')),
        R.flip(pickPaths)(doc),
      ),
    )(R.map(R.prop('FIELDS'), permissions)),
  );
});

module.exports = function ntk(mutableRoleSchema) {
  const roleSchema = mutableRoleSchema;
  const _filterDocuments = filterDocuments(roleSchema);
  const _userIsPermittedTo = userIsPermittedTo(roleSchema);
  return {
    userCanReadThisDataType: _userIsPermittedTo('read'),
    filterDocumentsAfterRead: R.pipe(_filterDocuments('read'), unlist),
    userCanUpdateThisDataType: _userIsPermittedTo('update'),
    filterDocumentsBeforeUpdate: R.pipe(_filterDocuments('update'), unlist),
    userCanCreateThisDataType: _userIsPermittedTo('create'),
    userCanCreateThisDocument(userRoles, options, dataType, docs) {
      return R.equals(
        listify(docs),
        _filterDocuments('create', userRoles, options, dataType, docs),
      );
    },
  };
};
