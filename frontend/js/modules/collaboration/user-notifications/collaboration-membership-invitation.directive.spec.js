'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The esnCollaborationMembershipInvitationUserNotification directive', function() {
  beforeEach(function() {
    angular.mock.module('esn.collaboration');
  });

  beforeEach(function() {
    var esnCollaborationClientService = {
      get: function() {},
      join: function() {}
    };

    var userAPI = {
      user: function() {}
    };

    var objectTypeResolver = {
      resolve: function() {},
      register: function() {}
    };

    angular.mock.module('esn.user-notification');
    angular.mock.module('esn.user');
    angular.mock.module('esn.object-type');
    angular.mock.module(function($provide) {
      $provide.value('esnCollaborationClientService', esnCollaborationClientService);
      $provide.value('userAPI', userAPI);
      $provide.value('objectTypeResolver', objectTypeResolver);
    });
    module('jadeTemplates');
  });

  beforeEach(angular.mock.inject(function($rootScope, $compile, esnCollaborationClientService, esnUserNotificationService, objectTypeResolver, userAPI) {
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.scope = $rootScope.$new();
    this.esnCollaborationClientService = esnCollaborationClientService;
    this.esnUserNotificationService = esnUserNotificationService;
    this.objectTypeResolver = objectTypeResolver;
    this.userAPI = userAPI;
    this.scope.notification = {
      _id: '123',
      subject: {
        id: '1',
        objectType: 'user'
      },
      complement: {
        id: '2',
        objectType: 'community'
      }
    };
    this.html = '<esn-collaboration-membership-invitation-user-notification notification="notification"/>';
  }));

  describe('The controller', function() {
    it('should resolve notification data', function() {
      var scope = this.scope;

      this.objectTypeResolver.resolve = function(type) {
        if (type === 'user') {
          return $q.when({ data: { _id: scope.notification.subject.id } });
        }

        if (type === 'community') {
          return $q.when({ data: { _id: scope.notification.complement.id } });
        }
      };
      this.$compile(this.html)(scope);
      scope.$digest();

      var element = this.$compile(this.html)(scope);

      scope.$digest();
      var eltScope = element.isolateScope();

      expect(eltScope.invitationSender).to.exist;
      expect(eltScope.invitationSender._id).to.equal(scope.notification.subject.id);
      expect(eltScope.invitationCollaboration).to.exist;
      expect(eltScope.invitationCollaboration._id).to.equal(scope.notification.complement.id);
      expect(eltScope.error).to.be.false;
      expect(eltScope.loading).to.be.false;
    });

    it('should set scope.error if community fetch fails', function() {
      var scope = this.scope;

      this.objectTypeResolver.resolve = function(type) {
        if (type === 'user') {
          return $q.when({ data: { _id: scope.notification.subject.id } });
        }

        if (type === 'community') {
          return $q.reject();
        }
      };
      this.$compile(this.html)(scope);
      scope.$digest();

      var element = this.$compile(this.html)(scope);

      scope.$digest();
      var eltScope = element.isolateScope();

      expect(eltScope.invitationSender).to.not.exist;
      expect(eltScope.invitationCollaboration).to.not.exist;
      expect(eltScope.error).to.be.true;
      expect(eltScope.loading).to.be.false;
    });

    it('should set scope.error if user fetch fails', function() {
      var scope = this.scope;

      this.objectTypeResolver.resolve = function(type) {
        if (type === 'user') {
          return $q.reject({});
        }

        if (type === 'community') {
          return $q.when({ data: { _id: scope.notification.complement.id } });
        }
      };
      this.$compile(this.html)(scope);
      scope.$digest();

      var element = this.$compile(this.html)(scope);

      scope.$digest();
      var eltScope = element.isolateScope();

      expect(eltScope.invitationSender).to.not.exist;
      expect(eltScope.invitationCollaboration).to.not.exist;
      expect(eltScope.error).to.be.true;
      expect(eltScope.loading).to.be.false;
    });
  });
});
