'use strict';

const expect = require('chai').expect;
const mockery = require('mockery');
const q = require('q');

describe('The domain middleware', function() {

  let getModule;

  beforeEach(function() {
    getModule = () => this.helpers.requireBackend('webserver/middleware/domain');
  });

  describe('The load domain middleware', function() {

    it('should send 400 if domain Id is not valid ObjectID', function(done) {
      mockery.registerMock('mongoose', {
        model: function() {
          return {
            loadFromID: function(id, callback) {
              return callback();
            }
          };
        }
      });
      mockery.registerMock('../../helpers', {
        db: {
          isValidObjectId: function() { return false; }
        }
      });

      const req = {
        params: {
          uuid: 'invalid'
        }
      };
      const res = this.helpers.express.response(
        function(code) {
          expect(code).to.equal(400);
          done();
        }
      );
      const next = function() {};
      const middleware = this.helpers.requireBackend('webserver/middleware/domain');

      middleware.load(req, res, next);
    });

    it('should call next(err) if domain can not be loaded', function(done) {
      mockery.registerMock('mongoose', {
        model: function() {
          return {
            loadFromID: function(id, callback) {
              return callback(new Error());
            }
          };
        }
      });
      mockery.registerMock('../../helpers', {
        db: {
          isValidObjectId: function() { return true; }
        }
      });

      const req = {
        params: {
          uuid: '123'
        }
      };
      const res = {};
      const next = function(err) {
        expect(err).to.exist;
        done();
      };
      const middleware = this.helpers.requireBackend('webserver/middleware/domain');

      middleware.load(req, res, next);
    });

    it('should send 404 if domain is not found', function(done) {
      mockery.registerMock('mongoose', {
        model: function() {
          return {
            loadFromID: function(id, callback) {
              return callback();
            }
          };
        }
      });
      mockery.registerMock('../../helpers', {
        db: {
          isValidObjectId: function() { return true; }
        }
      });

      const req = {
        params: {
          uuid: 123
        }
      };

      const res = this.helpers.express.response(
        function(code) {
          expect(code).to.equal(404);
          done();
        }
      );
      const next = function() {};

      const middleware = this.helpers.requireBackend('webserver/middleware/domain');
      middleware.load(req, res, next);
    });

    it('should inject the domain into the request', function(done) {
      const domain = {_id: 123};

      mockery.registerMock('mongoose', {
        model: function() {
          return {
            loadFromID: function(id, callback) {
              return callback(null, domain);
            }
          };
        }
      });
      mockery.registerMock('../../helpers', {
        db: {
          isValidObjectId: function() { return true; }
        }
      });

      const req = {
        params: {
          uuid: 123
        }
      };

      const res = {
      };

      const next = function() {
        expect(req.domain).to.exist;
        expect(req.domain).to.deep.equal(domain);
        done();
      };

      const middleware = this.helpers.requireBackend('webserver/middleware/domain');
      middleware.load(req, res, next);
    });
  });

  describe('loadFromDomainIdParameter() method', function() {
    it('should send back 400 when param is undefined', function(done) {
      this.helpers.mock.models({});

      const req = {
        query: {}
      };
      const res = this.helpers.express.jsonResponse(
        function(code) {
          expect(code).to.equal(400);
          done();
        }
      );
      const mw = this.helpers.requireBackend('webserver/middleware/domain');
      mw.loadFromDomainIdParameter(req, res);
    });

    it('should call next(err) if domain can not be loaded', function(done) {
      this.helpers.mock.models({
        Domain: {
          loadFromID: function(id, callback) {
            return callback(new Error());
          }
        }
      });

      const req = {
        query: {
          domain_id: '123'
        }
      };
      const res = {};
      const next = function(err) {
        expect(err).to.exist;
        done();
      };

      const mw = this.helpers.requireBackend('webserver/middleware/domain');
      mw.loadFromDomainIdParameter(req, res, next);
    });

    it('should send 404 if domain is not found', function(done) {
      this.helpers.mock.models({
        Domain: {
          loadFromID: function(id, callback) {
            return callback();
          }
        }
      });

      const req = {
        query: {
          domain_id: '123'
        }
      };

      const res = this.helpers.express.jsonResponse(
        function(code) {
          expect(code).to.equal(404);
          done();
        }
      );
      const next = function() {};

      const mw = this.helpers.requireBackend('webserver/middleware/domain');
      mw.loadFromDomainIdParameter(req, res, next);
    });

    it('should inject the domain into the request', function(done) {
      const domain = {_id: 123};
      this.helpers.mock.models({
        Domain: {
          loadFromID: function(id, callback) {
            return callback(null, domain);
          }
        }
      });

      const req = {
        query: {
          domain_id: '123'
        }
      };

      const res = {
      };

      const next = function() {
        expect(req.domain).to.exist;
        expect(req.domain).to.deep.equal(domain);
        done();
      };

      const mw = this.helpers.requireBackend('webserver/middleware/domain');
      mw.loadFromDomainIdParameter(req, res, next);
    });

  });

  describe('The loadDomainByHostname fn', function() {
    let coreDomainMock;

    beforeEach(function() {
      this.helpers.mock.models({});
      coreDomainMock = {};

      mockery.registerMock('../../core/domain', coreDomainMock);
    });

    it('should assign the loaded domain into request object then call next when domain is found', function(done) {
      const domain = { name: 'open-paas.org' };
      const req = {};
      const res = {};
      const next = () => {
        expect(req.domain).to.deep.equal(domain);
        done();
      };

      coreDomainMock.getByHostname = () => q(domain);

      getModule().loadDomainByHostname(req, res, next);
    });

    it('should response 404 when domain is not found', function(done) {
      const req = { hostname: 'open-paas.org' };
      const res = {
        status(code) {
          expect(code).to.equal(404);

          return {
            json(json) {
              expect(json).to.deep.equal({
                error: {
                  code: 404,
                  message: 'Not Found',
                  details: `No domain found for hostname: ${req.hostname}`
                }
              });
              done();
            }
          };
        }
      };
      const next = null;

      coreDomainMock.getByHostname = () => q(null);
      getModule().loadDomainByHostname(req, res, next);
    });

    it('should response 500 when there is error occurred', function(done) {
      const req = { hostname: 'open-paas.org' };
      const res = {
        status(code) {
          expect(code).to.equal(500);

          return {
            json(json) {
              expect(json).to.deep.equal({
                error: {
                  code: 500,
                  message: 'Server Error',
                  details: `Error while getting domain by hostname ${req.hostname}`
                }
              });
              done();
            }
          };
        }
      };
      const next = null;

      coreDomainMock.getByHostname = () => q.reject(new Error());
      getModule().loadDomainByHostname(req, res, next);
    });
  });

  describe('The loadSessionDomain fn', function() {
    let DomainModelMock;

    beforeEach(function() {
      DomainModelMock = {
        loadFromID(id, callback) {
          return callback(new Error('an_error'));
        }
      };

      this.helpers.mock.models({ Domain: DomainModelMock });
    });

    it('should respond 404 if the logged in user does not belong to any domain', function(done) {
      const req = {
        user: { _id: '123' }
      };
      const res = {
        status(code) {
          expect(code).to.equal(404);

          return {
            json(data) {
              expect(data.error.details).to.equal('You do not belong to any domain');
              done();
            }
          };
        }
      };
      const next = () => {};

      getModule().loadSessionDomain(req, res, next);
    });

    it('should fails if it cannot load domain by ID', function(done) {
      const req = {
        user: { _id: '123', preferredDomainId: 'domainId' }
      };
      const res = {};
      const next = err => {
        expect(err.message).to.equal('an_error');
        done();
      };

      getModule().loadSessionDomain(req, res, next);
    });

    it('should respond 404 if no domain found with corresponding ID', function(done) {
      const domain = null;
      const req = {
        user: { _id: '123', preferredDomainId: 'domainId' }
      };
      const res = {
        status(code) {
          expect(code).to.equal(404);

          return {
            json(data) {
              expect(data.error.details).to.equal(`The domain ${req.user.preferredDomainId} could not be found`);
              done();
            }
          };
        }
      };
      const next = () => {};

      DomainModelMock.loadFromID = (id, callback) => callback(null, domain);

      getModule().loadSessionDomain(req, res, next);
    });

    it('should assign the found domain to req then call next', function(done) {
      const domain = { _id: 'domainId' };
      const req = {
        user: { _id: '123', preferredDomainId: 'domainId' }
      };
      const res = {};
      const next = () => {
        expect(req.domain).to.deep.equal(domain);
        done();
      };

      DomainModelMock.loadFromID = (id, callback) => callback(null, domain);

      getModule().loadSessionDomain(req, res, next);
    });
  });
});
