var security = {}
  , async = require('async')
  , _ = require('underscore');

/**
 * Check if the logged in user has access to edit this resource
 * @param  next  Callback
 */
security.userHasAccess = function(next) {
  var self = this
    , userId = self.session.get('userId')
    , resName = geddy.inflection.singularize(self.name)
    , resId = self.params.id;

  async.parallel({
    res: async.apply(geddy.model[resName].first, {id: resId})
  , user: async.apply(geddy.model.User.first, {id: userId})
  }, function(err, data) {
    if (err) {
      throw err;
    }

    // User is admin or he owns the resource
    if (data.user && data.user.role === 'admin' || data.res && (!data.res.userId && data.user && data.user.role === 'admin' || data.res.userId === userId)) {
      next();
    }
    // Redirect and set flash message
    else {
      if (data.user) {
        self.flash.error('Nu ai acces la această pagină.');
      } else {
        self.flash.error('Trebuie să fii autentificat.');
      }

      if (resId) {
        self.redirect({controller: self.name, id: resId});
      } else {
        self.redirect('/');
      }
    }
  });
};

/**
* Check if the logged in user is admin
* @param  next  Callback
*/
security.userIsAdmin = function(next) {
  var self = this
    , userId = self.session.get('userId');

  async.parallel({
    user: async.apply(geddy.model.User.first, {id: userId})
  }, function(err, data) {
    if (err) {
      throw err;
    }

    // User is admin
    if (data.user && data.user.role === 'admin') {
      next();
    }
    // Redirect and set flash message
    else {
      self.flash.error('Nu ai acces la această pagină.');
      self.redirect('/');
    }
  });
};

module.exports = security;
