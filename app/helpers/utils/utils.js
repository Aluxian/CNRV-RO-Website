var utils = {}
  , async = require('async')
  , _ = require('underscore');

/**
 * Fetch the provided models' associated data. Used in async.waterfall
 * @param  assoc  Object to tell what to fetch
 *
 * assoc = {
 *   for: ''    // field of the data object to fetch in
 *   fetch: []  // array of strings or other assoc objects to fetch
 * }
 */
utils.fetchAssociations = function(assoc) {
  return function(data, callback) {
    (function parseAssoc(assoc, mData, callback) {
      var arrayed = false
        , items = mData[assoc.for] || mData;

      if (!_.isArray(items)) {
        items = [items];
        arrayed = true;
      }

      async.each(assoc.fetch, function(assoc, callback) {
        if (_.isString(assoc)) {
          async.each(items, function(item, callback) {
            item['get' + assoc](function(err, data) {
              item[assoc.toLowerCase()] = data;
              callback(err);
            });
          }, callback);
        } else {
          parseAssoc(assoc, items, function(err, data) {
            items = data;
            callback(err);
          });
        }
      }, function(err) {
        if (arrayed) {
          items = items[0];
        }
        if (assoc.for) {
          mData[assoc.for] = items;
        }
        callback(err, mData);
      });
    })(assoc, data, callback);
  };
};

/**
 * Fetches data required on every page (user, widgets, navigation etc.)
 * @param  session   Session object
 * @param  callback  Callback
 */
utils.loadPageData = function(pageData, session, callback) {
  // Defined tasks
  var tasks = {
    user: async.apply(geddy.model.User.first, {id: session.get('userId')})
  , recentPosts: async.apply(geddy.model.Post.all, null, {sort: {createdAt: 'desc'}, limit: 5})
  , recentComments: async.apply(geddy.model.Comment.all, null, {sort: {createdAt: 'desc'}, limit: 5})
  , navCategories: async.apply(geddy.model.Category.all, null, {sort: {name: 'asc'}})
  , navMenus: async.apply(async.waterfall, [
      async.apply(geddy.model.Menu.all, null, {sort: {name: 'asc'}})
    , utils.fetchAssociations({fetch: ['Pages']})
    ])
  };

  // Only run tasks defined in the 'pageData' param
  if (pageData) {
    _.each(tasks, function(val, key) {
      if (!_.contains(pageData, key))
        delete tasks[key];
    });
  }
  
  async.parallel(tasks, callback);
};

/**
 * Generate a gravatar.com url using author's email address
 * @param  post      Post object which contains the comments
 * @param  callback  Callback method
 */
utils.generateAvatars = function(post, callback) {
  _.each(post.comments, function(comment) {
    var email = (comment.user && comment.user.email) || comment.email;
    if (email) {
      comment.avatarHash = require('crypto').createHash('md5').update(email).digest('hex');
    }
  });
  callback(null, post);
};

/**
 * Fetches page data, does other tasks and respond with it
 * @param  newTasks  New tasks to be done additionally to pageData
 */
utils.defaultRespond = function(newTasks, options) {
  var self = this
    , tasks = {
    pageData: async.apply(utils.loadPageData, null, self.session)
  };

  async.parallel(_.extend(tasks, newTasks), function(err, data) {
    if (err) {
      throw err;
    } else if (!data.posts) {
      throw new geddy.errors.NotFoundError();
    } else {
      self.respond(data, options);
    }
  });
};

module.exports = utils;
