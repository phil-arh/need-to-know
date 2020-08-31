# NeedToKnow

*A role-based permissions management library*

## What is it?

NeedToKnow (NTK) is a library for managing user CRUD permissions in a systematic, role-based way. The best way to explain it is with an example.

### Creating a schema

Let's say we have two kinds of user - `HR` and `sales`. We have two kinds of data in our database - `customers` and `employees`. We want for our `HR` users to be able to access all `employees` data, but not `customers`. On the other hand, we want our `sales` users to be able to access their own `employees` data but no-one else's. They should also be able to access all `customers` data provided they are the assigned rep for that customer; otherwise, they should be able to only see a few restricted fields.

With NTK, setting out that ruleset is simple. Just make a schema as follows:

```javascript
module.exports = {
    __version: '1.0',
    HR: {
        employees: {
            // allow HR users to create, read, update, and delete employee info
            create: {
                WHEN() { return true; },
                FIELDS() { return true; },
            },
            read: {
                WHEN() { return true; },
                FIELDS() { return true; },
            },
            update: {
                WHEN() { return true; },
                FIELDS() { return true; },
            },
            delete: {
                WHEN() { return true; },
                FIELDS() { return true; },
            },
        },
        // note that HR doesn't even have an entry for customers under their
        // part of the schema - they will never be interacting with customer
        // data so it isn't even entered here
    },
    sales: {
        employees: {
            // allow sales reps to view their own employee info
            read: {
                WHEN(doc, opts) { return doc.email === opts.userEmail },
                FIELDS() { return true; },
            },
            // allow them to change parts of their own employee info
            update: {
                WHEN(doc, opts) { return doc.email === opts.userEmail },
                // but they can only change certain fields - they can't change
                // their job title, for instance
                FIELDS() { return [
                    'address',
                    'phoneNumber',
                    'emergencyContact',
                ]; },
            },
            // note that they have neither creation nor deletion permissions
            // on employee profiles
        },
        customers: {
            // can create a full customer profile provided it's attributed to
            // the user creating it
            create: {
                WHEN(doc, opts) { return doc.rep === opts.userEmail },
                FIELDS() { return true; },
            },
            read: {
                WHEN(doc, opts) { return true; },
                FIELDS(doc, opts) {
                    // currently this is how multiple possible combinations of
                    // conditions must be handled - within the FIELDS function
                    // this is very much not ideal and proper separation
                    // between WHEN and FIELDS will be restored in version 2
                    // of the schema
                    if (doc.rep === opts.userEmail) return true;
                    return [
                        'companyName',
                        'rep',
                        'isActiveOpportunity',
                    ],
                },
            },
            update: {
                WHEN(doc, opts) { return doc.rep === opts.userEmail },
                FIELDS() { return [
                    'contactNumber',
                    'contactEmail',
                    'nextMeetingDate',
                ]; },
            },
            // note again that sales reps can't delete customers out of the
            // database - they can only create them, read data about them, and
            // update it
        },
    },
};
```

While this is obviously quite lengthy, it ensures that all user CRUD permissions across all datatypes within the database are kept in one place. Arbitrarily complex logic can be performed using the `doc` and `opts` arguments. `doc` refers to the document being checked - so a JSON POSTed by a user for creation in the database, a document that has been pulled from the database in a read operation, or an updated JSON that has been PUT or PATCHed back to the server. `opts` is an arbitrary value that can be provided at call time by the application using the library - it can be anything at all, not just an object, though it's generally useful to provide an object containing information like the username of the user attempting the operation.


### Using the schema

Once you've created the schema, how do you use it? Once again, here's an example that should make things clear:

```javascript
const mainNTKSchema = require('./mainNTKSchema');
// provide the schema to NeedToKnow to get an instance closed over the schema
const ntk = require('need-to-know')(mainNTKSchema);

const updateCustomerHandler = (userInfo, newCustomerJSON) => {
    // first check whether the user can update documents of this type at all
    // this is a very quick check to run so may be worth running before
    // filtering the document
    const userCanUpdate = ntk.userCanUpdateThisDataType(
        userInfo.roles, // an array of roles, perhaps: ['sales', 'manager']
        'customers', // the data type - customers in this instance
    );
    if (!userCanCreate) throw new Error('Insufficient permissions!');
    const filteredNewCustomerJSON = ntk.filterDocumentsBeforeUpdate(
        userInfo.roles, // the user's roles
        'customers', // the data type
        { userEmail: userInfo.email }, // the `opts` object that will be the
        // second argument to the WHEN and FIELDS functions
        newCustomerJSON, // and the unchanged JSON
    );
    // filteredCustomerJSON will have had any paths that the user is not
    // permitted to update removed
    updateDatabase( /* with the filtered document */ );
};
```

## Future development

I'm currently unsure of the utility of filtering a document after finding that a user is not permitted to perform an update operation. It may make more sense simply to check whether the user is attempting to update fields they do not have permissions to change and reject the transaction. Functionality around updates may well be changed to this in a future version.

Currently, different combinations of conditions for the same user role and datatype must be handled with logic that is bundled haphazardly into WHEN and FIELDS functions - something antithetical to the goal of NTK. Version 2 of the schema format will most likely be more like:

```javascript
// NOT REAL YET!
{
    __version: 2.0,
    someRole: {
        someDataType: {
            create: [
                {
                    WHEN(doc, opts) { return doc.someProp === opts.anotherProp; },
                    FIELDS: [
                        'some.path',
                        'another.path.within.the.doc',
                    ],
                },
                {
                    WHEN(doc, opts) { return doc.someValue < opts.aValue; },
                    FIELDS: true,
                },
                {
                    WHEN(doc, opts) { return doc.somethingElse !== undefined },
                    FIELDS: [
                        '__allbut',
                        'not.this.path',
                        'not.this.one',
                        'or.this.one.either',
                    ],
                },
            ],
        },
    },
};
```
