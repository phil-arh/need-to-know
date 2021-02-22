// const debug = require('debug')('ntk:index');
const R = require('ramda');

const listify = (maybeList) => (R.is(Array, maybeList)
  ? maybeList
  : [maybeList]);

// const unlist = (list) => (R.length(list) === 1 ? list[0] : list);
const unlist = R.identity;

const applyToArgs = R.curry((args, fn) => fn(...args));

/**
 * @function
 * @private
 * @param {Array} paths An array of paths into a nested object
 * @param {Object} obj A nested object with these paths
 * Given an array of paths and a nested object, return an object filtered to
 * contain only those paths
 * @example
 *  const obj = { a: 1, b: { c: 2, d: 3 }, e: 4 };
 *  const paths = [['b', 'c'], ['e']]
 *  pickPaths(paths, obj);
 *  // => { b: { c: 2 }, e: 4 }
 */
const pickPaths = (() => {
  const makeFromPath = function makeFromPath(path, obj) {
    return R.path(path, obj)
      ? R.reduce(
        (acc, key) => R.objOf(key, acc),
        R.path(path, obj),
        R.reverse(path),
      )
      : undefined;
  };
  // eslint-disable-next-line no-shadow
  return R.curry(function pickPaths(paths, obj) {
    return R.reduce(
      (acc, keyPath) => {
        const pathObject = makeFromPath(keyPath, obj);
        return pathObject
          ? R.mergeDeepRight(acc, pathObject)
          : acc;
      },
      new Object(),
      paths,
    );
  });
})();

/**
 * @function
 * @public
 * @param {Object} roleSchema The role schema for this setup
 * @param {String} action The action type - enum create|write|update|delete
 * @param {Array} userRoles The user's roles, e.g. ['accountant', 'manager']
 * @param {String} dataType The data type of the input - e.g. 'users'
 * Given an action, a data type, and the user's roles, check whether the user
 * is ever allowed to perform the set action on the data type. This is not as
 * specific as checking whether the user can operate on a particular document,
 * but can be used as a preliminary check before operating on particular
 * documents. In a large organisation there will be many combinations of role
 * and data type in which actions will not be permitted at all - financially-
 * sensitive data, for instance, will normally only be accessible to senior
 * management and the finance department
 */
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
    Object.entries,
    R.filter(([key]) => userRoles.includes(key)),
    R.map(R.last),
    R.map(R.path([dataType, action])),
    R.filter(R.compose(R.not, R.equals(undefined))),
  )(roleSchema);

  const filteredDocuments = unfilteredDocuments.filter(
    (doc) => permissions.some(R.pipe(
      R.prop('WHEN'),
      R.tryCatch(applyToArgs([doc, options]), R.F),
    )),
  );
  if (action === 'create') return filteredDocuments;
  return filteredDocuments.map(
    (doc) => R.ifElse(
      R.any((fn) => fn(doc, options) === true),
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
  const roleSchema = R.clone(mutableRoleSchema);
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
        _filterDocuments('create', userRoles, dataType, options, docs),
      );
    },
  };
};
