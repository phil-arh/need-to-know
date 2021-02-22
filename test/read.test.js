const chai = require('chai');
const debug = require('debug')('ntk:test');
const roleSchema = require('./stubSchemas/stub.schema.js');
const ntk = require('../index')(roleSchema);

const should = chai.should();

describe('Test filtering on read', function () {
  it('Determines correctly if the user is permitted to read', function () {
    // debug(ntk.userCanReadThisDataType(['admin'], 'users'));
    ntk.userCanReadThisDataType(['admin'], 'users').should.eq(true);
    ntk.userCanReadThisDataType(['fake_role'], 'users').should.eq(false);
    ntk.userCanReadThisDataType(['admin'], 'fake_data_type').should.eq(false);
  });
  it('Filters out documents correctly', function () {
    ntk.filterDocumentsAfterRead(
      ['sales'],
      'customers',
      { username: 'a' },
      { rep: 'a' },
    ).should.eql({ rep: 'a' });
  });
});
