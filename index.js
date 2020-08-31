// const S = require('sanctuary').unchecked;
// const { fromJS, Map } = require('immutable');
const immutable = require('immutable');
const debug = require('debug')('ntk:index');
const R = require('ramda');
// const { Either } = require('monet');
const { I } = require('./invokeImmutableMethods');
const {
  v, t, m, record,
} = require('./invokeImmutableMethods').collectionShortcuts;

const fixArgs = function fixArgs(fn) {
  return (...args) => fn(...t(args));
};

const listify = (maybeList) => (R.is(immutable.List, maybeList)
  ? maybeList
  : v(maybeList));

const unlist = (list) => (I.size(list) === 1 ? list.get(0) : list);

const userIsPermittedTo = fixArgs(R.curry(function userIsPermittedTo(
  roleSchema, action, userRoles, dataType,
) {
  return userRoles.some(R.tryCatch(
    (role) => (I.path(v(role, dataType, action), roleSchema) !== undefined),
    R.F,
  ));
}));

const filterDocuments = fixArgs(R.curry(function filterDocuments(
  roleSchema,
  action,
  userRoles,
  dataType,
  options,
  unfilteredDocumentsOrDocument,
) {
  const unfilteredDocuments = listify(unfilteredDocumentsOrDocument);

  const permissions = (() => {
    const getPerms = (schemaForRole) => I.path(
      v(dataType, action), schemaForRole,
    );
    debug(roleSchema);
    /*
    return roleSchema.entries()
      .filter(([role]) => role in userRoles)
      .reduce((_perms, [ignored, schema]) => (
        getPerms(schema) ? v(..._perms, getPerms(schema)) : _perms
      ), v());
    */
    return I.pour(
      roleSchema,
      I.entries,
      v,
      I.reduce((_perms, [ignored, schema]) => (
        getPerms(schema) ? v(..._perms, getPerms(schema)) : _perms
      ), v()),
    );
  })();

  return unfilteredDocuments.filter(
    (doc) => permissions.some(R.pipe(
      I.prop('WHEN'),
      R.tryCatch(I.applyToArgs(v(doc, options)), R.F),
    )),
  ).map(
    (doc) => R.ifElse(
      I.some((x) => x(doc, options) === true),
      R.always(doc),
      R.pipe(
        I.flatMap(R.tryCatch(
          I.applyToArgs(v(doc, options)),
          R.always(v()),
        )),
        I.map(R.split('.')),
        R.flip(I.pickPaths)(doc),
      ),
    )(permissions.map(I.prop('FIELDS'))),
  );
}));

module.exports = function ntk(mutableRoleSchema) {
  const roleSchema = t(mutableRoleSchema);
  const _filterDocuments = filterDocuments(roleSchema);
  const _userIsPermittedTo = userIsPermittedTo(roleSchema);
  const toExport = {
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
  return record({
    immutable: record(toExport),
    mutable: toExport,
  });
};
